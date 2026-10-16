const { spawn } = require('child_process');
const { EventEmitter } = require('events');
const readline = require('readline');
const log = require('./log');

// More than this waiting for ffmpeg means it can't keep up (usually a stalled
// upload). Frames are dropped then instead of piling up in memory.
const MAX_QUEUED_BYTES = 16 * 1024 * 1024;

const isNetworkUrl = (url) => /^[a-z]+:\/\//i.test(url);

// Harmless lines ffmpeg prints at every start or track change
const NOISE = /Estimating duration from bitrate|deprecated pixel format used/;

const buildFfmpegArgs = (config, output, { playlist = null } = {}) => {
  const { fps, videoBitrateKbps, keyframeSeconds } = config;
  const kbps = videoBitrateKbps;
  // prettier-ignore
  return [
    '-hide_banner', '-loglevel', 'warning', '-nostats', '-y',
    '-progress', 'pipe:3', '-stats_period', '5',
    // Video: Chrome's JPEG frames on stdin, at a constant frame rate
    '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', String(fps), '-i', 'pipe:0',
    // Audio: the prepared music on a loop (see music.js), or silence (YouTube
    // expects an audio track). No -shortest: it buffers ~10 s of raw frames,
    // close to 1 GB at 1080p.
    ...(playlist
      ? ['-stream_loop', '-1', '-f', 'concat', '-safe', '0', '-i', playlist]
      : ['-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100']),
    '-map', '0:v', '-map', '1:a',
    // Chrome's JPEGs are full-range BT.601; YouTube expects limited-range BT.709
    '-vf', 'scale=in_range=full:out_range=limited:in_color_matrix=bt601:out_color_matrix=bt709,format=nv12',
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
    // Hardware H.264 at a constant bit rate, keyframe every keyframeSeconds
    '-c:v', 'h264_videotoolbox', '-allow_sw', '0', '-realtime', '1', '-profile:v', 'high',
    '-b:v', `${kbps}k`, '-constant_bit_rate', '1',
    '-g', String(Math.round(fps * keyframeSeconds)),
    '-force_key_frames', `expr:gte(t,n_forced*${keyframeSeconds})`,
    // Prepared tracks are already 44.1 kHz stereo AAC: copy them as they are
    ...(playlist ? ['-c:a', 'copy'] : ['-c:a', 'aac', '-b:a', '128k', '-ar', '44100']),
    // Give up on a network write that hangs for 20 s, so ffmpeg exits and restarts
    ...(isNetworkUrl(output) ? ['-rw_timeout', '20000000'] : []),
    '-f', 'flv', '-flvflags', 'no_duration_filesize', output,
  ];
};

// At most `limit` ffmpeg log lines a minute, so a repeating warning can't fill
// the disk
const makeLineLogger = (limit = 30) => {
  let windowStart = Date.now();
  let count = 0;
  let suppressed = 0;
  return (line) => {
    const now = Date.now();
    if (now - windowStart >= 60000) {
      if (suppressed) log.warn(`[ffmpeg] ${suppressed} more lines suppressed`);
      windowStart = now;
      count = 0;
      suppressed = 0;
    }
    if (count < limit) {
      count += 1;
      log.warn(`[ffmpeg] ${line}`);
    } else {
      suppressed += 1;
    }
  };
};

// One ffmpeg run. Emits 'exit' once, whether it exited or failed to start.
class FfmpegProcess extends EventEmitter {
  constructor({ ffmpegPath, args }) {
    super();
    this.ffmpegPath = ffmpegPath;
    this.args = args;
    this.child = null;
    this.progress = {};
    this.dropped = 0;
  }

  get running() {
    return Boolean(this.child);
  }

  start() {
    const child = spawn(this.ffmpegPath, this.args, {
      stdio: ['pipe', 'ignore', 'pipe', 'pipe'],
    });
    this.child = child;
    this.startedAt = Date.now();
    this.lastProgressAt = Date.now();

    let exited = false;
    const onExit = (result) => {
      if (exited) return;
      exited = true;
      this.child = null;
      this.emit('exit', result);
    };
    child.on('error', (error) => onExit({ error }));
    child.on('exit', (code, signal) => onExit({ code, signal }));

    // EPIPE when ffmpeg exits mid-write; the exit handler deals with it
    child.stdin.on('error', () => {});

    const logLine = makeLineLogger();
    readline.createInterface({ input: child.stderr }).on('line', (line) => {
      if (line.trim() && !NOISE.test(line)) logLine(line.trim());
    });

    // -progress writes key=value lines, ending each report with progress=...
    let report = {};
    readline.createInterface({ input: child.stdio[3] }).on('line', (line) => {
      const eq = line.indexOf('=');
      if (eq < 0) return;
      const key = line.slice(0, eq).trim();
      report[key] = line.slice(eq + 1).trim();
      if (key === 'progress') {
        this.progress = report;
        this.lastProgressAt = Date.now();
        report = {};
      }
    });
  }

  write(frame) {
    const stdin = this.child?.stdin;
    if (!stdin || !stdin.writable) return false;
    if (stdin.writableLength > MAX_QUEUED_BYTES) {
      this.dropped += 1;
      return false;
    }
    stdin.write(frame);
    return true;
  }

  // SIGINT makes ffmpeg flush and end the stream cleanly (closing stdin alone
  // isn't enough: the silent audio input never ends). Killed if it hangs.
  stop(timeoutMs = 5000) {
    const child = this.child;
    if (!child) return Promise.resolve();
    return new Promise((resolve) => {
      const timer = setTimeout(() => child.kill('SIGKILL'), timeoutMs);
      this.once('exit', () => {
        clearTimeout(timer);
        resolve();
      });
      child.stdin.end();
      child.kill('SIGINT');
    });
  }

  kill() {
    this.child?.kill('SIGKILL');
  }
}

module.exports = { FfmpegProcess, buildFfmpegArgs };
