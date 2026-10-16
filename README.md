# Liberator Stream: Bitcoin Live Dashboard

```
██████╗ ████████╗ ██████╗      ██████╗  █████╗ ███████╗██╗  ██╗
██╔══██╗╚══██╔══╝██╔════╝      ██╔══██╗██╔══██╗██╔════╝██║  ██║
██████╔╝   ██║   ██║     █████╗██║  ██║███████║███████╗███████║
██╔══██╗   ██║   ██║     ╚════╝██║  ██║██╔══██║╚════██║██╔══██║
██████╔╝   ██║   ╚██████╗      ██████╔╝██║  ██║███████║██║  ██║
╚═════╝    ╚═╝    ╚═════╝      ╚═════╝ ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝
```

![The Liberator, On Air dashboard](screenshot.png)

A 24/7 live Bitcoin dashboard built as a broadcast graphic for a YouTube live stream. A Node.js backend pulls data from several public APIs (with fallbacks) and pushes it over a WebSocket to a React page designed on a fixed 1920×1080 canvas.

## Status (October 2026)

| Area | State |
| --- | --- |
| "On Air" broadcast redesign | Done |
| Live price | Done: Binance WebSocket, about 1 update/s, REST fallback |
| Network data (blocks, fees, mempool) | Done: Blockstream |
| Hosting | The old Render deployment (btc-dash.com) is retired; the domain isn't serving the app |
| 24/7 YouTube stream | Built: background services on a Mac (see below); goes live once the stream key is in `streamer/stream.env` |
| Selected-posts ("Bitcoin on X") loop | Done: 48 hand-picked posts from `content/posts.json`, with real avatars and like/reply counts; edits go live without a restart |
| Music and live title | Built: tracks in `streamer/music/` play on a loop, levelled; the title follows the price once you've run `make youtube-auth` |

## What's on screen

- **On-air bar:** LIVE (turns DELAYED if the price stalls for 45 s, RECONNECTING if the server connection drops), world clocks, UTC clock.
- **Header:** logo, live price with a per-tick readout and the 24 h range, six metric plates (market cap, dominance, sats per dollar, 24 h volume, distance from the all-time high, supply mined). Moments get a five-second tag: the price crossing a round number ("▲ CROSSED $83,000"), a new 24 h high or low.
- **Chart:** candles that rotate through 5M / 1H / 4H / 1D / 1W every 60 s, with a logo wipe on each switch. The last candle follows the live price. Also volume, a 20-period average, high/low markers, a plain-language legend and a candle-close countdown.
- **Network panel:** last block, fees in sat/vB and what a transfer costs in dollars, transactions waiting, difficulty change and halving countdowns.
- **Bitcoin on X:** rotating hand-picked posts with the author's photo, the post date and its replies and likes; longer posts stay up longer.
- **Ticker:** one fact at a time (block reward, block pace, the whole market, data sources) plus the last hour's moments. It flips rather than crawls: cheaper to encode and readable on any screen.

## Architecture

One Koa backend (`backend/`) serves the API, the WebSocket and the built React app (`frontend/build`).

| Data | Source (fallbacks) | Refresh |
| --- | --- | --- |
| Price, 24 h stats | Binance WebSocket; REST only while the stream is down (Binance → CoinGecko → CoinPaprika → CoinCap) | ~1 s (REST every 30 s) |
| Candles | Binance (CoinGecko) | 5M: 1 min · 1H: 5 min · 4H: 30 min · 1D: 12 h · 1W: 24 h |
| Block, fees, mempool | Blockstream | 1 min |
| Supply, ATH | CoinGecko (CoinPaprika, CoinCap) | 30 min |
| Dominance, total market | CoinGecko (CoinPaprika) | 15 min |

Clients get the full data once on connect and on changes, plus small (~200 byte) price ticks once a second. Details for contributors are in [CLAUDE.md](CLAUDE.md).

## Run it locally

Requires Node 22.

```bash
make install   # root, backend, frontend and streamer dependencies
make build     # production build of the frontend
make start     # backend on http://localhost:3001 (serves the built app)
```

`make dev` runs the frontend dev server (port 3000) and the backend with auto-reload.

The page is designed for 1920×1080 and scales to fit any window.

### Configuration (environment variables)

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3001` | Backend port |
| `COINGECKO_API_KEY` | none | Optional; avoids CoinGecko free-tier rate limits |
| `BINANCE_WS_URL` | Binance market-data stream | Comma-separated override for the live price stream |
| `PRICE_STREAM` | on | `off` disables the WebSocket and polls REST every 30 s |
| `REACT_APP_WS_URL` | same host | Frontend build-time override for the WebSocket URL |
| `POSTS_FILE` | `content/posts.json` | The ON X posts |
| `POST_STATS` | on | `off` stops fetching likes, replies and avatars from X |

### Monitoring

- `/api/health`: is the app up
- `/api/stats`: scheduler, cache, live price stream health, skipped REST polls
- `/api/adapters`: health of each API source
- `/api/cache`: current data
- `/api/memory`: process memory
- `/api/posts`: the ON X posts as the panel gets them

## Streaming to YouTube

Everything runs on one Mac, with no cloud hosting. Two `launchd` services start at login and restart if they exit:

- **backend** (`com.liberator-stream.backend`): the app on `localhost:3001`.
- **streamer** (`com.liberator-stream.streamer`, in `streamer/`): opens the page in headless Chrome at 1920×1080, captures it with the DevTools screencast, and feeds the frames at a constant 30 fps into ffmpeg. ffmpeg encodes on the Mac's hardware encoder (`h264_videotoolbox`, 4.5 Mbps constant bit rate, a keyframe every 2 s, silent AAC audio) and sends RTMPS to YouTube. About 0.9 of a core and 1 GB of memory on an M2.

### Set up

Requires Node 22 and ffmpeg (`brew install node@22 ffmpeg`).

```bash
make install            # also downloads the streamer's pinned Chrome
make build
make services-install   # creates streamer/stream.env, installs and starts both services
```

Then put your stream key in `streamer/stream.env` (git ignores it). In YouTube Studio: **Go live** → **Stream**, use a persistent key, turn auto-start on and auto-stop off. The streamer checks the file every 30 s and starts streaming once the key is there. After changing the key later, run `make services-restart`. Other settings (bit rate, frame rate, ingest URL) are listed in `streamer/stream.env.example`.

### What keeps it running

| Problem | What happens |
| --- | --- |
| A service exits or crashes | `launchd` restarts it after 10 s |
| ffmpeg exits (upload dropped, YouTube hiccup) | Restarted with backoff: 2 s, 4 s … up to 60 s |
| ffmpeg hangs (no progress for 30 s) | Killed and restarted |
| Chrome crashes, or the page stops producing frames for 20 s | Chrome is restarted; meanwhile ffmpeg repeats the last frame, so the stream stays up |
| Chrome's memory creeps up over days | Chrome restarts once a day (`CHROME_RESTART_HOURS`) |
| The Mac wants to sleep | The streamer holds a `caffeinate` assertion (idle, disk and system sleep, on AC power) while it streams; the display can still turn off |
| Logs grow | Both logs rotate at 10 MB, keeping 3 old copies |

### Music

Put audio files in `streamer/music/` (mp3, m4a, aac, wav, flac, ogg, opus, aiff). At start the streamer levels each track to -16 LUFS once (two-pass, cached in `~/Library/Caches/liberator-stream/music`), then ffmpeg loops the shuffled list with no re-encoding. Without files the stream is silent. After changing the folder, `make services-restart`. [streamer/music/README.md](streamer/music/README.md) lists sources that are safe on YouTube; `MUSIC_VOLUME` and `MUSIC_LOUDNORM` are in `stream.env.example`.

### Live title

The streamer can keep the broadcast title current with the price, e.g. "Bitcoin $82,201 ▲ 0.8% · live 24/7", every 10 minutes. One-time setup: in Google Cloud, enable the YouTube Data API v3 and create an OAuth client of type "Desktop app"; put its id and secret in `streamer/stream.env` (`YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`), then run `make youtube-auth` and sign in with the channel's account. The template and interval are `YOUTUBE_TITLE_TEMPLATE` and `TITLE_UPDATE_MINUTES`; each update costs 51 of the API's 10,000 daily quota units.

### Day to day

```bash
make services-status     # running? last exit, sleep assertion, recent log lines
make logs                # follow both logs (~/Library/Logs/liberator-stream/)
make services-restart
make services-uninstall  # stop both and remove them from login
```

### Mac settings

- Keep the Mac on power with the lid open: a closed laptop without an external display sleeps regardless.
- Services start at login, so turn on automatic login (System Settings → Users & Groups; needs FileVault off) to come back after a reboot or macOS update.
- To start again after a power cut: `sudo pmset autorestart 1`.

## Development

```bash
make test      # backend, frontend and streamer tests
make lint      # ESLint (+ Prettier rules)
make format    # Prettier
```

## Project structure

```
liberator-stream/
├── backend/
│   └── src/
│       ├── adapters/     # Binance, CoinGecko, CoinPaprika, CoinCap, Blockstream
│       ├── cache/        # cache + schema/validation
│       ├── config/       # timeframes and refresh intervals
│       ├── services/     # scheduler, API manager, Binance ticker stream
│       ├── websocket/    # client WebSocket server
│       ├── __tests__/
│       └── app.js
├── frontend/
│   ├── assets/           # original logo artwork (source)
│   ├── public/           # index.html, recoloured logo
│   └── src/
│       ├── components/   # Stage, OnAirBar, PriceSection, Chart, NetworkPulse, SocialWire, Ticker, Logo, Sketch
│       ├── data/         # sample posts for the ON X loop
│       ├── hooks/, utils/, theme/
│       └── __tests__/
├── content/
│   └── posts.json        # hand-picked posts for the ON X panel
├── streamer/
│   ├── src/              # Chrome capture, ffmpeg, frame clock, watchdogs
│   ├── test/
│   └── stream.env.example
├── launchd/              # service templates, install/uninstall/status scripts
├── Makefile
└── CLAUDE.md
```
