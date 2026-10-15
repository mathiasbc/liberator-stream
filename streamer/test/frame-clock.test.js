const assert = require('node:assert/strict');
const { test } = require('node:test');
const { FrameClock, framesDue } = require('../src/frame-clock');

test('framesDue counts frames owed since the origin', () => {
  assert.equal(framesDue({ origin: 0, now: 0, sent: 0, intervalMs: 100 }), 1);
  assert.equal(framesDue({ origin: 0, now: 99, sent: 1, intervalMs: 100 }), 0);
  assert.equal(framesDue({ origin: 0, now: 350, sent: 1, intervalMs: 100 }), 3);
});

test('catches up after a short stall and skips ahead after a long one', () => {
  let now = 0;
  let frames = 0;
  const clock = new FrameClock({
    fps: 10,
    maxBurst: 20,
    onFrame: () => {
      frames += 1;
    },
    now: () => now,
  });

  clock.start();
  clock.stop();
  assert.equal(frames, 1);

  now = 250; // 2.5 frames late: send the 2 that are due
  clock.tick();
  clock.stop();
  assert.equal(frames, 3);

  now = 10000; // stalled for ~10 s: one frame, then carry on from here
  clock.tick();
  clock.stop();
  assert.equal(frames, 4);
  assert.equal(clock.skipped, 97);

  now = 10100;
  clock.tick();
  clock.stop();
  assert.equal(frames, 5);
});
