const assert = require('node:assert/strict');
const { test } = require('node:test');
const Backoff = require('../src/backoff');

test('doubles the delay up to the maximum', () => {
  const backoff = new Backoff({ initialMs: 1000, maxMs: 5000 });
  const delays = [1, 2, 3, 4, 5].map(() => backoff.next(0));
  assert.deepEqual(delays, [1000, 2000, 4000, 5000, 5000]);
});

test('starts over after the process stayed up long enough', () => {
  const backoff = new Backoff({ initialMs: 1000, resetAfterMs: 60000 });
  backoff.next(0);
  backoff.next(0);
  backoff.started(10000);
  assert.equal(backoff.next(20000), 4000); // up 10 s: keep backing off
  backoff.started(30000);
  assert.equal(backoff.next(100000), 1000); // up 70 s: reset
});
