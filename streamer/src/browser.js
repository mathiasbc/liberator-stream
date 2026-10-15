const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');
const { EventEmitter } = require('events');
const puppeteer = require('puppeteer');
const log = require('./log');

const WIDTH = 1920;
const HEIGHT = 1080;
const FIRST_FRAME_TIMEOUT_MS = 15000;

// A fixed profile folder lets a restarted streamer find and kill a Chrome left
// behind by a crash: Puppeteer starts Chrome in its own process group, so
// launchd doesn't clean it up. The folder is wiped on every launch.
const PROFILE_DIR = path.join(
  os.homedir(),
  'Library',
  'Caches',
  'liberator-stream',
  'chrome-profile'
);

const CHROME_ARGS = [
  `--window-size=${WIDTH},${HEIGHT}`,
  '--hide-scrollbars',
  '--mute-audio',
  '--no-first-run',
  '--no-default-browser-check',
  // Keep rendering at full speed even though no window is ever on screen
  '--disable-background-timer-throttling',
  '--disable-backgrounding-occluded-windows',
  '--disable-renderer-backgrounding',
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const killStrayChrome = () =>
  new Promise((resolve) => {
    const pattern = `--user-data-dir=${PROFILE_DIR}`.replace(
      /[.*+?^${}()|[\]\\]/g,
      '\\$&'
    );
    execFile('pkill', ['-9', '-f', '--', pattern], () => resolve());
  });

// Headless Chrome showing the dashboard at 1920×1080. Emits 'frame' with each
// JPEG from the DevTools screencast, and 'failed' once if Chrome or the page
// dies after start() has resolved.
class ChromeCapture extends EventEmitter {
  constructor({ url, fps, jpegQuality }) {
    super();
    this.url = url;
    this.fps = fps;
    this.jpegQuality = jpegQuality;
    this.browser = null;
    this.page = null;
    this.frames = 0;
    this.lastFrameAt = 0;
    this.startedAt = 0;
    this.closing = false;
  }

  async start() {
    await killStrayChrome();
    fs.rmSync(PROFILE_DIR, { recursive: true, force: true });

    this.browser = await puppeteer.launch({
      headless: true,
      userDataDir: PROFILE_DIR,
      args: CHROME_ARGS,
      defaultViewport: { width: WIDTH, height: HEIGHT, deviceScaleFactor: 1 },
      protocolTimeout: 30000,
    });
    this.browser.on('disconnected', () => this.fail('Chrome disconnected'));

    const [firstTab] = await this.browser.pages();
    this.page = firstTab || (await this.browser.newPage());
    this.page.on('error', (err) => this.fail(`page crashed: ${err.message}`));
    this.page.on('pageerror', (err) => log.warn(`[page] ${err.message}`));
    await this.page.goto(this.url, { waitUntil: 'load', timeout: 30000 });

    const cdp = await this.page.createCDPSession();
    cdp.on('Page.screencastFrame', ({ data, sessionId }) => {
      // Chrome sends the next frame only after this one is acknowledged
      cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
      this.frames += 1;
      this.lastFrameAt = Date.now();
      this.emit('frame', Buffer.from(data, 'base64'));
    });
    await cdp.send('Page.startScreencast', {
      format: 'jpeg',
      quality: this.jpegQuality,
      maxWidth: WIDTH,
      maxHeight: HEIGHT,
      // The compositor runs at 60 Hz, so every 2nd frame gives 30 fps
      everyNthFrame: Math.max(1, Math.round(60 / this.fps)),
    });

    const deadline = Date.now() + FIRST_FRAME_TIMEOUT_MS;
    while (this.frames === 0) {
      if (Date.now() > deadline) throw new Error('no frame from Chrome');
      await sleep(100);
    }
    this.startedAt = Date.now();
  }

  fail(reason) {
    if (this.closing) return;
    this.closing = true;
    this.emit('failed', new Error(reason));
  }

  async jsHeapMb() {
    const metrics = await this.page?.metrics();
    return metrics ? Math.round(metrics.JSHeapUsedSize / 1e6) : null;
  }

  async stop() {
    this.closing = true;
    const browser = this.browser;
    this.browser = null;
    this.page = null;
    if (browser) {
      const timeout = sleep(5000).then(() => {
        throw new Error('timed out');
      });
      try {
        await Promise.race([browser.close(), timeout]);
      } catch {
        browser.process()?.kill('SIGKILL');
      }
    }
    await killStrayChrome();
  }
}

module.exports = { ChromeCapture };
