#!/bin/bash
# Installs the backend and the streamer as launchd agents for the current user,
# then (re)starts them. They start at every login and restart if they exit.
set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
LOGS="$HOME/Library/Logs/liberator-stream"
AGENTS="$HOME/Library/LaunchAgents"
DOMAIN="gui/$(id -u)"
LABELS=(com.liberator-stream.backend com.liberator-stream.streamer)

fail() {
  echo "$1" >&2
  exit 1
}

# Node 22 at a fixed path: Homebrew's node@22, else nvm's, else node on PATH
BREW_PREFIX="$(brew --prefix 2>/dev/null || echo /opt/homebrew)"
NODE=""
for candidate in \
  "$BREW_PREFIX/opt/node@22/bin/node" \
  "$(ls -d "$HOME"/.nvm/versions/node/v22.*/bin/node 2>/dev/null | tail -1)" \
  "$(command -v node || true)"; do
  if [ -x "$candidate" ] && "$candidate" -v | grep -q '^v22\.'; then
    NODE="$candidate"
    break
  fi
done
[ -n "$NODE" ] || fail "Node 22 not found: run 'brew install node@22'"

command -v ffmpeg >/dev/null || fail "ffmpeg not found: run 'brew install ffmpeg'"
[ -f "$REPO/frontend/build/index.html" ] || fail "Build the frontend first: make build"
[ -d "$REPO/streamer/node_modules/puppeteer" ] || fail "Install dependencies first: make install"

SERVICE_PATH="$BREW_PREFIX/bin:/usr/bin:/bin:/usr/sbin:/sbin"
mkdir -p "$LOGS" "$AGENTS"

for label in "${LABELS[@]}"; do
  plist="$AGENTS/$label.plist"
  sed -e "s|__NODE__|$NODE|g" \
    -e "s|__REPO__|$REPO|g" \
    -e "s|__LOGS__|$LOGS|g" \
    -e "s|__PATH__|$SERVICE_PATH|g" \
    "$REPO/launchd/$label.plist" >"$plist"
  plutil -lint -s "$plist"

  # Replace a running copy: wait for launchd to finish unloading it first
  if launchctl print "$DOMAIN/$label" >/dev/null 2>&1; then
    launchctl bootout "$DOMAIN/$label" || true
    for _ in $(seq 1 40); do
      launchctl print "$DOMAIN/$label" >/dev/null 2>&1 || break
      sleep 0.5
    done
  fi
  launchctl bootstrap "$DOMAIN" "$plist"
  echo "Started $label"
done

echo "Node: $NODE"
echo "Logs: $LOGS"
