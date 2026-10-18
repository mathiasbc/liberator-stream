const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { execFileSync } = require('node:child_process');
const {
  fadeFilters,
  findTracks,
  parseMeasurement,
  playlistText,
  prepareTracks,
  shuffle,
  writePlaylist,
} = require('../src/music');

test('finds audio files only, in name order', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'music-'));
  for (const name of ['b.mp3', 'a.flac', 'notes.txt', '.hidden.mp3', 'c.M4A']) {
    fs.writeFileSync(path.join(dir, name), '');
  }
  assert.deepEqual(
    findTracks(dir).map((f) => path.basename(f)),
    ['a.flac', 'b.mp3', 'c.M4A']
  );
  assert.deepEqual(findTracks('/nonexistent/music'), []);
});

test('shuffle keeps every track once', () => {
  const tracks = ['a', 'b', 'c', 'd', 'e'];
  let seed = 0.3;
  const random = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  const shuffled = shuffle(tracks, random);
  assert.deepEqual([...shuffled].sort(), tracks);
  assert.notDeepEqual(shuffled, tracks);
});

test('writes a concat list and escapes quotes', () => {
  const file = path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), 'pl-')),
    'playlist.txt'
  );
  writePlaylist(["/music/Don't Stop.mp3", '/music/b.mp3'], file);
  assert.equal(
    fs.readFileSync(file, 'utf8'),
    "ffconcat version 1.0\nfile '/music/Don'\\''t Stop.mp3'\nfile '/music/b.mp3'\n"
  );
  assert.equal(playlistText([]), 'ffconcat version 1.0\n');
});

test('fades each end, shorter on short tracks', () => {
  assert.deepEqual(fadeFilters(180, 3), [
    'afade=t=in:st=0:d=3.00',
    'afade=t=out:st=177.00:d=3.00',
  ]);
  assert.deepEqual(fadeFilters(8, 3), [
    'afade=t=in:st=0:d=2.00',
    'afade=t=out:st=6.00:d=2.00',
  ]);
  assert.deepEqual(fadeFilters(180, 0), []);
});

test('reads the loudness ffmpeg measured', () => {
  const stderr =
    'noise\n[Parsed_loudnorm_0 @ 0x1] \n{\n\t"input_i" : "-23.5",\n\t"input_tp" : "-5.0",\n\t"input_lra" : "7.1",\n\t"input_thresh" : "-33.6",\n\t"target_offset" : "0.2"\n}\n';
  assert.equal(parseMeasurement(stderr).input_i, '-23.5');
  assert.throws(() => parseMeasurement('nothing here'), /measurement/);
});

const hasFfmpeg = (() => {
  try {
    execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
})();

test(
  'prepares tracks once and reuses the cache',
  { skip: !hasFfmpeg },
  async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'music-src-'));
    const cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), 'music-cache-'));
    execFileSync('ffmpeg', [
      '-v',
      'error',
      '-y',
      '-f',
      'lavfi',
      '-i',
      'sine=frequency=440:duration=2',
      path.join(dir, 'tone.wav'),
    ]);
    fs.writeFileSync(path.join(dir, 'broken.mp3'), 'not audio');

    const first = await prepareTracks({ dir, cacheDir });
    assert.equal(first.length, 1);
    assert.match(first[0], /\.m4a$/);
    const stamp = fs.statSync(first[0]).mtimeMs;

    const second = await prepareTracks({ dir, cacheDir });
    assert.deepEqual(second, first);
    assert.equal(fs.statSync(first[0]).mtimeMs, stamp);
    assert.deepEqual(fs.readdirSync(cacheDir), [path.basename(first[0])]);
  }
);
