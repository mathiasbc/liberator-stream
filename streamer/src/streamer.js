const { spawn } = require('child_process');
const Backoff = require('./backoff');
const { ChromeCapture } = require('./browser');
const { outputUrl } = require('./config');
const { FfmpegProcess, buildFfmpegArgs } = require('./ffmpeg');
const { FrameClock } = require('./frame-clock');
const log = require('./log');

const CHECK_EVERY_MS = 5000;
// The dashboard's UTC clock changes every second, so a healthy page produces
// at least one frame a second
const FRAME_STALL_MS = 20000;
// ffmpeg reports progress every 5 s
const FFMPEG_STALL_MS = 30000;
const STATUS_EVERY_MS = 5 * 60 * 1000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const formatDuration = (ms) => {
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  return hours
    ? `${hours}h${String(minutes % 60).padStart(2, '0')}m`
    : `${minutes}m`;
};

// Runs Chrome and ffmpeg side by side: Chrome's latest frame is fed to ffmpeg
// at a constant rate, so either can restart without taking the other down.
// While Chrome restarts, ffmpeg repeats the last frame and the stream stays up.
class Streamer {
  constructor(config) {
    this.config = config;
    this.output = outputUrl(config);
    this.latestFrame = null;
    this.capture = null;
    this.ffmpeg = null;
    this.clock = null;
    this.stopping = false;
    this.restartingChrome = false;
    this.chromeBackoff = new Backoff();
    this.ffmpegBackoff = new Backoff();
    this.restarts = { chrome: 0, ffmpeg: 0 };
    this.timers = [];
    this.startedAt = Date.now();
    this.lastStatus = { at: Date.now(), frames: 0 };
  }

  async start() {
    const { dashboardUrl, fps, videoBitrateKbps } = this.config;
    const target = this.config.output || `YouTube (${this.config.ingestUrl})`;
    log.info(
      `Streaming ${dashboardUrl} to ${target}: ${fps} fps, ${videoBitrateKbps} kbps`
    );
    this.keepAwake();
    await this.waitForDashboard();
    await this.startChrome();
    this.clock = new FrameClock({ fps, onFrame: () => this.sendFrame() });
    this.startFfmpeg();
    this.timers.push(setInterval(() => this.check(), CHECK_EVERY_MS));
    this.timers.push(setInterval(() => this.logStatus(), STATUS_EVERY_MS));
  }

  // Holds a sleep assertion for as long as this process runs: -i idle sleep,
  // -m disk sleep, -s system sleep (on AC power). The display may still sleep.
  keepAwake() {
    if (this.stopping) return;
    this.caffeinate = spawn(
      '/usr/bin/caffeinate',
      ['-i', '-m', '-s', '-w', String(process.pid)],
      { stdio: 'ignore' }
    );
    this.caffeinate.on('error', (err) =>
      log.error(`caffeinate failed: ${err.message}`)
    );
    this.caffeinate.on('exit', () => {
      if (!this.stopping) setTimeout(() => this.keepAwake(), 5000);
    });
  }

  async waitForDashboard() {
    const url = `${this.config.dashboardUrl}/api/health`;
    for (let attempt = 0; !this.stopping; attempt += 1) {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
        if (res.ok) return;
      } catch {
        // not up yet
      }
      if (attempt % 12 === 0) log.info(`Waiting for the dashboard at ${url}`);
      await sleep(5000);
    }
  }

  async startChrome() {
    const { dashboardUrl, fps, jpegQuality } = this.config;
    while (!this.stopping) {
      const capture = new ChromeCapture({
        url: dashboardUrl,
        fps,
        jpegQuality,
      });
      capture.on('frame', (frame) => {
        this.latestFrame = frame;
      });
      capture.on('failed', (err) => {
        if (capture === this.capture) this.restartChrome(err.message);
      });
      try {
        await capture.start();
        this.capture = capture;
        this.chromeBackoff.started();
        log.info('Chrome is capturing the dashboard');
        return;
      } catch (err) {
        await capture.stop();
        const delay = this.chromeBackoff.next();
        log.error(
          `Chrome failed to start: ${err.message}. Retrying in ${delay / 1000} s`
        );
        await sleep(delay);
      }
    }
  }

  async restartChrome(reason, { scheduled = false } = {}) {
    if (this.restartingChrome || this.stopping) return;
    this.restartingChrome = true;
    this.restarts.chrome += 1;
    log.warn(`Restarting Chrome: ${reason}`);
    const old = this.capture;
    this.capture = null;
    await old?.stop();
    if (!scheduled) await sleep(this.chromeBackoff.next());
    await this.startChrome();
    this.restartingChrome = false;
  }

  startFfmpeg() {
    if (this.stopping) return;
    const ffmpeg = new FfmpegProcess({
      ffmpegPath: this.config.ffmpegPath,
      args: buildFfmpegArgs(this.config, this.output),
    });
    ffmpeg.on('exit', ({ code, signal, error }) => {
      this.clock.stop();
      this.ffmpeg = null;
      if (this.stopping) return;
      this.restarts.ffmpeg += 1;
      const delay = this.ffmpegBackoff.next();
      const why =
        error?.message || (signal ? `signal ${signal}` : `code ${code}`);
      log.warn(`ffmpeg exited (${why}). Restarting in ${delay / 1000} s`);
      this.ffmpegTimer = setTimeout(() => this.startFfmpeg(), delay);
    });
    ffmpeg.start();
    this.ffmpeg = ffmpeg;
    this.ffmpegBackoff.started();
    this.clock.start();
    log.info('ffmpeg started');
  }

  sendFrame() {
    if (this.latestFrame) this.ffmpeg?.write(this.latestFrame);
  }

  check() {
    if (this.stopping) return;
    const now = Date.now();
    const capture = this.capture;
    const restartMs = this.config.chromeRestartHours * 3600 * 1000;
    if (capture && !this.restartingChrome) {
      if (now - capture.lastFrameAt > FRAME_STALL_MS) {
        this.restartChrome(`no frames for ${FRAME_STALL_MS / 1000} s`);
      } else if (restartMs && now - capture.startedAt > restartMs) {
        this.restartChrome('scheduled restart', { scheduled: true });
      }
    }
    if (this.ffmpeg && now - this.ffmpeg.lastProgressAt > FFMPEG_STALL_MS) {
      log.warn(`ffmpeg stalled: no progress for ${FFMPEG_STALL_MS / 1000} s`);
      this.ffmpeg.kill();
    }
  }

  async logStatus() {
    const now = Date.now();
    const frames = this.capture?.frames ?? 0;
    const seconds = (now - this.lastStatus.at) / 1000;
    const captured = Math.max(0, frames - this.lastStatus.frames) / seconds;
    this.lastStatus = { at: now, frames };
    const heap = await this.capture?.jsHeapMb().catch(() => null);
    const p = this.ffmpeg?.progress || {};
    log.info(
      [
        `status: up ${formatDuration(now - this.startedAt)}`,
        `chrome ${captured.toFixed(1)} fps captured, page heap ${heap ?? '?'} MB`,
        `ffmpeg ${p.fps ?? '?'} fps, ${p.bitrate ?? '?'}, speed ${p.speed ?? '?'}, dropped ${this.ffmpeg?.dropped ?? 0}`,
        `restarts chrome ${this.restarts.chrome}, ffmpeg ${this.restarts.ffmpeg}`,
      ].join(' | ')
    );
  }

  async stop() {
    this.stopping = true;
    this.timers.forEach(clearInterval);
    clearTimeout(this.ffmpegTimer);
    this.clock?.stop();
    await this.ffmpeg?.stop();
    await this.capture?.stop();
    this.caffeinate?.kill();
  }
}

module.exports = Streamer;
