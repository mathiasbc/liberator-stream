# Picking this project up on another Mac

The goal on the new Mac: run the dashboard locally and stream it 24/7 to YouTube as a background service. No cloud hosting is involved.

## 1. Prepare the Mac

- **Claude Code:** install the Claude desktop app, sign in, open the **Code** tab. claude.ai/code in a browser runs in Anthropic's cloud, not on your Mac, so it can't set up the streamer.
- **Homebrew:** <https://brew.sh>
- **Node 22:** `brew install node@22`, or `nvm install 22` if you use nvm (the Makefile uses nvm when it's installed, otherwise Homebrew's node@22).
- **GitHub access:** add this Mac's SSH key to GitHub so you can push, or clone over HTTPS if you only need to pull.
- **Power:** keep the Mac on its power adapter with the lid open. The display can turn off; the streamer will keep the Mac from sleeping.

## 2. Get the code and check it runs

```bash
git clone git@github.com:mathiasbc/liberator-stream.git
cd liberator-stream
make install
make build
make start      # http://localhost:3001
```

Open <http://localhost:3001>. Within a few seconds the price should tick every second and the LIVE block should be red, not DELAYED.

Stop the dashboard on the old Mac if it's still running. Two copies just double the API polling.

## 3. Continue with Claude

Open the `liberator-stream` folder in the Code tab and start a new session with:

```
Read CLAUDE.md, README.md and transition.md. Goal: stream this dashboard 24/7 to my
YouTube channel from THIS Mac as a background service, with no cloud hosting.

Agreed plan:
- Run the backend (node backend/src/app.js, serving frontend/build on localhost:3001)
  as a launchd LaunchAgent.
- Streamer service: headless Chrome via the DevTools protocol (Page.startScreencast,
  everyNthFrame 2, about 30 fps; measured about 1 core on an M2). Feed frames at a
  constant 30 fps into ffmpeg: h264_videotoolbox, about 4.5 Mbps CBR, 2 s keyframes,
  silent AAC audio via anullsrc. Send RTMPS to YouTube.
- Robustness: launchd KeepAlive and caffeinate; restart ffmpeg with backoff; restart
  Chrome if frames stall, plus once a day; logs in ~/Library/Logs. OBS was too heavy
  before and died after a few hours.
- The YouTube stream key lives in a local, untracked config file and is never committed.
- Install ffmpeg with Homebrew.

Start by checking this Mac (chip, RAM, macOS, Homebrew, Node 22), then build the streamer.
```

## 4. Have these ready

- **YouTube stream key:** YouTube Studio → **Go live** → **Stream** tab. Use a persistent key, turn **auto-start** on and auto-stop off.
- **Home internet upload:** a steady ~5 Mbps; the stream uses about 1.5 TB/month.

## Where things stand (October 2026)

- **Done and on `main`:** the On Air redesign, the live Binance price stream with REST fallback, Blockstream network data, tests.
- **Built:** the background streamer above (`streamer/`, `launchd/`; see README "Streaming to YouTube"). `make services-install`, then add the stream key to `streamer/stream.env`.
- **Selected posts:** 48 hand-picked posts are in `content/posts.json`, curated in two review rounds (the rules are in CLAUDE.md).
- **Next:** wire the "ON X" panel to those posts; it shows sample posts until the backend sends `tweets`.
- **Hosting:** none. The Render deployment is retired, and Oracle (no free capacity in Santiago) and Hetzner (too expensive for a hobby) were ruled out.
- **btc-dash.com:** still points at Render, which no longer serves it, so visitors get an HTTPS error. Either forward it to the YouTube live page with GoDaddy's free domain forwarding, or let it lapse.
- **Hetzner:** close the account and request the $25 verification credit back through a support request. It's only refunded after the account is closed.
- **Design rules** for any UI change are in CLAUDE.md (one home per data point, colour = meaning, plain labels, verify at 1920×1080).
