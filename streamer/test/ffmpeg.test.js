const assert = require('node:assert/strict');
const { test } = require('node:test');
const { buildFfmpegArgs } = require('../src/ffmpeg');

const config = { fps: 30, videoBitrateKbps: 4500, keyframeSeconds: 2 };

const valueAfter = (args, flag) => args[args.indexOf(flag) + 1];

test('encodes constant bit rate H.264 with 2 s keyframes', () => {
  const args = buildFfmpegArgs(config, 'rtmps://a.rtmps.youtube.com/live2/k');
  assert.equal(valueAfter(args, '-c:v'), 'mjpeg'); // input
  assert.ok(args.includes('h264_videotoolbox'));
  assert.equal(valueAfter(args, '-b:v'), '4500k');
  assert.equal(valueAfter(args, '-constant_bit_rate'), '1');
  assert.equal(valueAfter(args, '-g'), '60');
  assert.equal(valueAfter(args, '-framerate'), '30');
  assert.equal(args.at(-1), 'rtmps://a.rtmps.youtube.com/live2/k');
});

test('adds silent audio', () => {
  const args = buildFfmpegArgs(config, '/tmp/out.flv');
  assert.match(valueAfter(args, '-i'), /pipe:0/);
  assert.ok(args.some((arg) => arg.startsWith('anullsrc')));
  assert.equal(valueAfter(args, '-c:a'), 'aac');
});

test('sets a network timeout only for network outputs', () => {
  assert.ok(
    buildFfmpegArgs(config, 'rtmp://host/live/k').includes('-rw_timeout')
  );
  assert.ok(!buildFfmpegArgs(config, '/tmp/out.flv').includes('-rw_timeout'));
});
