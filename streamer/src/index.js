const { loadConfig, outputUrl } = require('./config');
const log = require('./log');
const { rotateLogs } = require('./log-rotate');
const Streamer = require('./streamer');
const path = require('path');
const { TitleUpdater } = require('./youtube-title');
const { BroadcastKeeper } = require('./youtube-broadcast');

// How often to make sure a broadcast is live while we stream (1 quota unit)
const KEEPER_EVERY_MS = 3 * 60 * 1000;

const KEY_POLL_MS = 30000;
const ROTATE_EVERY_MS = 60 * 60 * 1000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Anything unexpected ends the process; launchd starts it again
process.on('unhandledRejection', (err) => {
  log.error('Unhandled rejection:', err);
  process.exit(1);
});
process.on('uncaughtException', (err) => {
  log.error('Uncaught exception:', err);
  process.exit(1);
});

// The launchd job sets LOG_DIR. The streamer rotates the backend's log too,
// since launchd never does.
const startLogRotation = () => {
  const dir = process.env.LOG_DIR;
  if (!dir) return;
  const rotate = () => {
    try {
      const rotated = rotateLogs(dir);
      if (rotated.length) log.info(`Rotated ${rotated.join(', ')}`);
    } catch (err) {
      log.warn(`Log rotation failed: ${err.message}`);
    }
  };
  rotate();
  setInterval(rotate, ROTATE_EVERY_MS).unref();
};

const main = async () => {
  startLogRotation();

  // Without a key there is nothing to stream to. Wait for one rather than
  // exiting, so launchd doesn't restart the streamer in a loop.
  let config = loadConfig();
  if (!outputUrl(config)) {
    log.warn(
      `No YOUTUBE_STREAM_KEY in ${config.envFile} yet. Checking again every ${KEY_POLL_MS / 1000} s`
    );
    while (!outputUrl(config)) {
      await sleep(KEY_POLL_MS);
      config = loadConfig();
    }
  }
  log.addSecret(config.streamKey);
  log.addSecret(config.youtube.clientSecret);
  log.addSecret(config.youtube.refreshToken);

  const streamer = new Streamer(config);
  // The live title follows the price, only on the real YouTube stream
  const title =
    !config.output && config.youtube.refreshToken
      ? new TitleUpdater({
          ...config.youtube,
          dashboardUrl: config.dashboardUrl,
        })
      : null;
  // Opens a new broadcast if YouTube ended ours (see youtube-broadcast.js)
  const keeper = title
    ? new BroadcastKeeper({
        getToken: () => title.accessToken(),
        thumbnailFile: path.join(
          __dirname,
          '..',
          '..',
          'content',
          'youtube-thumbnail.png'
        ),
      })
    : null;
  let keeperTimer = null;
  const keep = async () => {
    try {
      const result = await keeper.ensureLive();
      if (result === 'created') title.lastTitle = null;
    } catch (err) {
      log.warn(`Broadcast keeper: ${err.message}`);
    }
  };
  const shutdown = async (signal) => {
    log.info(`${signal} received, stopping`);
    clearInterval(keeperTimer);
    title?.stop();
    await streamer.stop();
    process.exit(0);
  };
  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));

  await streamer.start();
  if (keeper) keeperTimer = setInterval(keep, KEEPER_EVERY_MS);
  if (title) title.start();
  else if (!config.output) {
    log.info('Live title updates off: run `make youtube-auth` to turn them on');
  }
};

main().catch((err) => {
  log.error('Streamer failed:', err);
  process.exit(1);
});
