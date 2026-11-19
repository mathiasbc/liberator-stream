const assert = require('node:assert/strict');
const { test } = require('node:test');
const Streamer = require('../src/streamer');

test('restarts ffmpeg when the music playlist ends', async () => {
  const streamer = new Streamer({ output: '/tmp/out.flv' });
  let stops = 0;
  streamer.ffmpeg = { stop: async () => (stops += 1) };
  const schedule = [
    { name: 'a.mp3', duration: 0.02 },
    { name: 'b.mp3', duration: 0.02 },
  ];
  streamer.logNowPlaying(schedule, 0, Date.now());
  await new Promise((resolve) => setTimeout(resolve, 30));
  assert.equal(stops, 0); // still on the second track
  await new Promise((resolve) => setTimeout(resolve, 60));
  assert.equal(stops, 1);
});

test('does nothing without music', () => {
  const streamer = new Streamer({ output: '/tmp/out.flv' });
  let stops = 0;
  streamer.ffmpeg = { stop: async () => (stops += 1) };
  streamer.logNowPlaying([], 0, Date.now());
  assert.equal(stops, 0);
});
