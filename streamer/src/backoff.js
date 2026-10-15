// Exponential restart delay: 2 s, 4 s, 8 s ... up to a minute. Once a process
// has stayed up for resetAfterMs, the next failure starts again from 2 s.
class Backoff {
  constructor({ initialMs = 2000, maxMs = 60000, resetAfterMs = 120000 } = {}) {
    this.initialMs = initialMs;
    this.maxMs = maxMs;
    this.resetAfterMs = resetAfterMs;
    this.attempt = 0;
    this.startedAt = null;
  }

  started(now = Date.now()) {
    this.startedAt = now;
  }

  next(now = Date.now()) {
    if (this.startedAt !== null && now - this.startedAt >= this.resetAfterMs) {
      this.attempt = 0;
    }
    this.startedAt = null;
    const delay = Math.min(this.maxMs, this.initialMs * 2 ** this.attempt);
    this.attempt += 1;
    return delay;
  }
}

module.exports = Backoff;
