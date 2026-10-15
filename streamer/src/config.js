const fs = require('fs');
const path = require('path');
const { parseEnv } = require('util');

const DEFAULT_ENV_FILE = path.join(__dirname, '..', 'stream.env');

const DEFAULTS = {
  YOUTUBE_STREAM_KEY: '',
  YOUTUBE_INGEST_URL: 'rtmps://a.rtmps.youtube.com/live2',
  STREAM_OUTPUT: '',
  DASHBOARD_URL: 'http://localhost:3001',
  FPS: '30',
  VIDEO_BITRATE_KBPS: '4500',
  KEYFRAME_SECONDS: '2',
  JPEG_QUALITY: '80',
  CHROME_RESTART_HOURS: '24',
  FFMPEG_PATH: 'ffmpeg',
};

const toNumber = (name, value, min, max) => {
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) {
    throw new Error(`${name} must be a number from ${min} to ${max}`);
  }
  return number;
};

// Settings come from stream.env, and environment variables override them
// (handy for a one-off test run). The file is re-read while waiting for a key.
const loadConfig = ({
  envFile = process.env.STREAM_ENV_FILE || DEFAULT_ENV_FILE,
  env = process.env,
} = {}) => {
  const fileVars = fs.existsSync(envFile)
    ? parseEnv(fs.readFileSync(envFile, 'utf8'))
    : {};

  const raw = { ...DEFAULTS };
  for (const key of Object.keys(DEFAULTS)) {
    if (fileVars[key]) raw[key] = fileVars[key];
    if (env[key]) raw[key] = env[key];
  }

  return {
    envFile,
    streamKey: raw.YOUTUBE_STREAM_KEY.trim(),
    ingestUrl: raw.YOUTUBE_INGEST_URL.trim().replace(/\/+$/, ''),
    output: raw.STREAM_OUTPUT.trim(),
    dashboardUrl: raw.DASHBOARD_URL.trim().replace(/\/+$/, ''),
    fps: toNumber('FPS', raw.FPS, 1, 60),
    videoBitrateKbps: toNumber(
      'VIDEO_BITRATE_KBPS',
      raw.VIDEO_BITRATE_KBPS,
      500,
      20000
    ),
    // YouTube wants a keyframe at least every 4 seconds; 2 is recommended
    keyframeSeconds: toNumber('KEYFRAME_SECONDS', raw.KEYFRAME_SECONDS, 1, 4),
    jpegQuality: toNumber('JPEG_QUALITY', raw.JPEG_QUALITY, 30, 100),
    // 0 turns the scheduled restart off
    chromeRestartHours: toNumber(
      'CHROME_RESTART_HOURS',
      raw.CHROME_RESTART_HOURS,
      0,
      168
    ),
    ffmpegPath: raw.FFMPEG_PATH,
  };
};

// Where ffmpeg sends the stream, or null while there is no key yet
const outputUrl = (config) => {
  if (config.output) return config.output;
  if (!config.streamKey) return null;
  return `${config.ingestUrl}/${config.streamKey}`;
};

module.exports = { loadConfig, outputUrl, DEFAULT_ENV_FILE };
