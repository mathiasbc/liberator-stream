# Music for the stream

Drop audio files in this folder (mp3, m4a, aac, wav, flac, ogg, opus, aiff)
and the streamer plays them on a loop, shuffled at every start, levelled to
-16 LUFS so quiet and loud tracks sit at the same volume, each fading in and
out over 3 seconds. Git ignores everything here except this file: most
licences, Pixabay's included, don't allow redistributing the tracks. With no
files, the stream is silent.

After adding or removing tracks, run `make services-restart`: ffmpeg reads
the folder when it starts.

## When YouTube flags a song

A live stream that plays a song registered with Content ID gets interrupted
("third-party content"), usually without a claim on the video. Find the
song by the time of the warning in the streamer log:

    grep "Now playing" ~/Library/Logs/liberator-stream/streamer.log | tail

(times are UTC). Move that file into `removed/` here, which the streamer
ignores, and run `make services-restart`.

## Where to get tracks that are safe on YouTube

- **YouTube Audio Library** (YouTube Studio → Audio Library): the only source
  with no Content ID risk, because YouTube owns or licenses it. Filter by
  genre "Jazz & Blues" and mood "Calm". Some tracks ask for a credit in the
  video description; the library says which.
- **Pixabay Music** (pixabay.com/music, search "jazz" or "lo-fi jazz"): free
  for commercial use, no credit needed.
- **Free Music Archive** (freemusicarchive.org): filter the licence to CC0 or
  CC BY. CC BY needs the artist and track credited in the description.
- **Public-domain recordings** (Library of Congress National Jukebox, the
  Internet Archive): US recordings published before 1926 are public domain,
  which covers early jazz. Lovely vintage texture, but remastered re-releases
  sometimes trigger false Content ID claims that you then have to dispute.

Settings in `stream.env`: `MUSIC_DIR`, `MUSIC_VOLUME` (0.1–2, after
levelling), `MUSIC_FADE_SECONDS` (0 turns fades off), `MUSIC_LOUDNORM=off`
to keep tracks as they are.
