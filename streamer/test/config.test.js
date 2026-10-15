const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { loadConfig, outputUrl } = require('../src/config');

const writeEnv = (contents) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'streamer-config-'));
  const file = path.join(dir, 'stream.env');
  fs.writeFileSync(file, contents);
  return file;
};

test('uses defaults when the file is missing', () => {
  const config = loadConfig({ envFile: '/nonexistent/stream.env', env: {} });
  assert.equal(config.streamKey, '');
  assert.equal(config.fps, 30);
  assert.equal(config.videoBitrateKbps, 4500);
  assert.equal(config.keyframeSeconds, 2);
  assert.equal(config.dashboardUrl, 'http://localhost:3001');
  assert.equal(outputUrl(config), null);
});

test('reads the key from the file and builds the YouTube URL', () => {
  const envFile = writeEnv('YOUTUBE_STREAM_KEY=abcd-1234\nFPS=25\n');
  const config = loadConfig({ envFile, env: {} });
  assert.equal(config.fps, 25);
  assert.equal(
    outputUrl(config),
    'rtmps://a.rtmps.youtube.com/live2/abcd-1234'
  );
});

test('environment variables override the file', () => {
  const envFile = writeEnv('YOUTUBE_STREAM_KEY=from-file\n');
  const config = loadConfig({
    envFile,
    env: { YOUTUBE_STREAM_KEY: 'from-env', STREAM_OUTPUT: '/tmp/test.flv' },
  });
  assert.equal(config.streamKey, 'from-env');
  assert.equal(outputUrl(config), '/tmp/test.flv');
});

test('an empty value in the file keeps the default', () => {
  const envFile = writeEnv('YOUTUBE_STREAM_KEY=\nFPS=\n');
  const config = loadConfig({ envFile, env: {} });
  assert.equal(config.fps, 30);
  assert.equal(outputUrl(config), null);
});

test('trims trailing slashes from URLs', () => {
  const config = loadConfig({
    envFile: '/nonexistent',
    env: {
      YOUTUBE_STREAM_KEY: 'k',
      YOUTUBE_INGEST_URL: 'rtmp://example.com/live/',
      DASHBOARD_URL: 'http://localhost:3001/',
    },
  });
  assert.equal(outputUrl(config), 'rtmp://example.com/live/k');
  assert.equal(config.dashboardUrl, 'http://localhost:3001');
});

test('rejects out-of-range numbers', () => {
  assert.throws(
    () =>
      loadConfig({ envFile: '/nonexistent', env: { KEYFRAME_SECONDS: '10' } }),
    /KEYFRAME_SECONDS must be a number from 1 to 4/
  );
  assert.throws(
    () => loadConfig({ envFile: '/nonexistent', env: { FPS: 'fast' } }),
    /FPS/
  );
});
