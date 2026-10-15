const { performance } = require('perf_hooks');

// Number of frames that should have been sent by `now` and haven't been yet.
// Frame 0 is due at `origin`.
const framesDue = ({ origin, now, sent, intervalMs }) =>
  Math.floor((now - origin) / intervalMs) + 1 - sent;

// Calls onFrame at a constant rate. ffmpeg timestamps frames by count, so the
// clock corrects timer drift by catching up: a short event-loop stall sends a
// burst of frames to stay in step with real time. After a long stall (over
// maxBurst frames) it skips ahead instead of flooding ffmpeg.
class FrameClock {
  constructor({
    fps,
    onFrame,
    maxBurst = fps * 2,
    now = () => performance.now(),
  }) {
    this.intervalMs = 1000 / fps;
    this.onFrame = onFrame;
    this.maxBurst = maxBurst;
    this.now = now;
    this.timer = null;
    this.sent = 0;
    this.skipped = 0;
  }

  start() {
    if (this.timer) return;
    this.origin = this.now();
    this.sent = 0;
    this.skipped = 0;
    this.tick();
  }

  tick() {
    let due = framesDue({
      origin: this.origin,
      now: this.now(),
      sent: this.sent,
      intervalMs: this.intervalMs,
    });
    if (due > this.maxBurst) {
      this.skipped += due - 1;
      this.origin += (due - 1) * this.intervalMs;
      due = 1;
    }
    for (let i = 0; i < due; i += 1) {
      this.onFrame();
      this.sent += 1;
    }
    const nextAt = this.origin + this.sent * this.intervalMs;
    this.timer = setTimeout(
      () => this.tick(),
      Math.max(0, nextAt - this.now())
    );
  }

  stop() {
    clearTimeout(this.timer);
    this.timer = null;
  }
}

module.exports = { FrameClock, framesDue };
