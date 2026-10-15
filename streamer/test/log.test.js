const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const log = require('../src/log');
const { rotateLogs } = require('../src/log-rotate');

test('redacts the stream key from log messages', () => {
  log.addSecret('secret-key-123');
  assert.equal(
    log.redact('rtmps://a.rtmps.youtube.com/live2/secret-key-123: I/O error'),
    'rtmps://a.rtmps.youtube.com/live2/<stream-key>: I/O error'
  );
});

test('rotates large logs and keeps a fixed number of copies', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'streamer-logs-'));
  const big = path.join(dir, 'backend.log');
  const small = path.join(dir, 'streamer.log');
  fs.writeFileSync(small, 'small');

  for (const round of [1, 2, 3, 4]) {
    fs.writeFileSync(big, `round ${round}`.padEnd(100, '.'));
    assert.deepEqual(rotateLogs(dir, { maxBytes: 50, keep: 3 }), [
      'backend.log',
    ]);
  }

  assert.equal(fs.statSync(big).size, 0);
  assert.match(fs.readFileSync(`${big}.1`, 'utf8'), /^round 4/);
  assert.match(fs.readFileSync(`${big}.3`, 'utf8'), /^round 2/);
  assert.ok(!fs.existsSync(`${big}.4`));
  assert.equal(fs.readFileSync(small, 'utf8'), 'small');
});
