const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const log = require('./log');

const run = promisify(execFile);

const AUDIO_EXT = new Set([
  '.mp3',
  '.m4a',
  '.aac',
  '.wav',
  '.flac',
  '.ogg',
  '.opus',
  '.aiff',
  '.aif',
]);

const CACHE_DIR = path.join(
  os.homedir(),
  'Library',
  'Caches',
  'liberator-stream'
);
// Prepared tracks live here; ffmpeg reads the shuffled list from the playlist
const PREPARED_DIR = path.join(CACHE_DIR, 'music');
const PLAYLIST_FILE = path.join(CACHE_DIR, 'playlist.txt');

// YouTube's own loudness target
const LOUDNESS = 'I=-16:TP=-1.5:LRA=11';
// Bump when the prepared format changes, so old cache files are redone
const PREP_VERSION = 1;

// Audio files in the music folder, in name order. Missing folder: no tracks.
const findTracks = (dir) => {
  let names;
  try {
    names = fs.readdirSync(dir);
  } catch {
    return [];
  }
  return names
    .filter(
      (n) => !n.startsWith('.') && AUDIO_EXT.has(path.extname(n).toLowerCase())
    )
    .sort()
    .map((n) => path.join(dir, n));
};

// Fisher–Yates, so a restart doesn't always open with the same track
const shuffle = (list, random = Math.random) => {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

// The concat demuxer's list format; a quote inside a name becomes '\''
const playlistText = (files) =>
  [
    'ffconcat version 1.0',
    ...files.map((f) => `file '${f.replace(/'/g, "'\\''")}'`),
  ].join('\n') + '\n';

const writePlaylist = (files, file = PLAYLIST_FILE) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, playlistText(files));
  return file;
};

// The loudness ffmpeg measured in a first pass, from the JSON it prints last
const parseMeasurement = (stderr) => {
  const start = stderr.lastIndexOf('{');
  const end = stderr.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('no loudness measurement');
  return JSON.parse(stderr.slice(start, end + 1));
};

/**
 * Encodes one track to the stream's audio format: 44.1 kHz stereo AAC in a
 * raw ADTS stream, levelled with two-pass loudnorm (linear gain, so no
 * pumping) and the user's volume on top.
 */
const transcode = async (src, target, { loudnorm, volume, ffmpegPath }) => {
  const filters = [];
  if (loudnorm) {
    const { stderr } = await run(
      ffmpegPath,
      [
        '-hide_banner',
        '-nostats',
        '-i',
        src,
        '-vn',
        '-af',
        `loudnorm=${LOUDNESS}:print_format=json`,
        '-f',
        'null',
        '-',
      ],
      { maxBuffer: 16 * 1024 * 1024 }
    );
    const m = parseMeasurement(stderr);
    filters.push(
      `loudnorm=${LOUDNESS}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`
    );
  }
  if (volume !== 1) filters.push(`volume=${volume}`);
  const tmp = `${target}.tmp.aac`;
  // prettier-ignore
  await run(ffmpegPath, [
    '-hide_banner', '-nostats', '-loglevel', 'error', '-y',
    '-i', src, '-vn',
    ...(filters.length ? ['-af', filters.join(',')] : []),
    '-ar', '44100', '-ac', '2', '-c:a', 'aac', '-b:a', '160k',
    '-f', 'adts', tmp,
  ]);
  fs.renameSync(tmp, target);
};

/**
 * Prepares every track in `dir` once (cached by file size, date and
 * settings) and returns the prepared files, skipping any that fail. Stale
 * cache files are removed.
 */
const prepareTracks = async ({
  dir,
  loudnorm = true,
  volume = 1,
  ffmpegPath = 'ffmpeg',
  cacheDir = PREPARED_DIR,
}) => {
  const sources = findTracks(dir);
  if (!sources.length) return [];
  fs.mkdirSync(cacheDir, { recursive: true });
  const prepared = [];
  for (const src of sources) {
    const stat = fs.statSync(src);
    const key = crypto
      .createHash('sha1')
      .update(
        `${src}|${stat.size}|${stat.mtimeMs}|${loudnorm}|${volume}|${PREP_VERSION}`
      )
      .digest('hex');
    const target = path.join(cacheDir, `${key}.aac`);
    if (!fs.existsSync(target)) {
      log.info(`Music: preparing ${path.basename(src)}`);
      try {
        await transcode(src, target, { loudnorm, volume, ffmpegPath });
      } catch (err) {
        log.warn(
          `Music: skipping ${path.basename(src)}: ${err.message.split('\n')[0]}`
        );
        continue;
      }
    }
    prepared.push(target);
  }
  const keep = new Set(prepared.map((f) => path.basename(f)));
  for (const name of fs.readdirSync(cacheDir)) {
    if (!keep.has(name)) fs.rmSync(path.join(cacheDir, name), { force: true });
  }
  return prepared;
};

module.exports = {
  AUDIO_EXT,
  PLAYLIST_FILE,
  PREPARED_DIR,
  findTracks,
  shuffle,
  playlistText,
  writePlaylist,
  prepareTracks,
  parseMeasurement,
};
