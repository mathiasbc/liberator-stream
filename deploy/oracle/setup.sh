#!/usr/bin/env bash
# Install or update The Liberator on a fresh Ubuntu 22.04/24.04 server
# (built for Oracle Cloud's Always Free Ampere A1, works on any arm64/x86_64).
#
#   curl -fsSL https://raw.githubusercontent.com/mathiasbc/liberator-stream/main/deploy/oracle/setup.sh | sudo bash
#
# Safe to re-run: it installs what's missing, pulls the latest code, rebuilds
# the frontend next to the live one, then swaps it in and restarts the app.
#
# Settings (environment variables):
#   DOMAIN   site name Caddy serves with HTTPS         (default btc-dash.com)
#   REPO     git URL to deploy                          (default the GitHub repo)
#   BRANCH   branch to deploy                           (default main)
set -euo pipefail

DOMAIN="${DOMAIN:-btc-dash.com}"
REPO="${REPO:-https://github.com/mathiasbc/liberator-stream.git}"
BRANCH="${BRANCH:-main}"
APP_DIR=/opt/liberator-stream
APP_USER=liberator
ENV_FILE=/etc/liberator-stream.env
NODE_MAJOR=22

log() { printf '\n\033[1;33m==> %s\033[0m\n' "$*"; }

[ "$(id -u)" -eq 0 ] || { echo "Run as root (sudo)." >&2; exit 1; }
export DEBIAN_FRONTEND=noninteractive

log "System packages"
apt-get update -q
apt-get install -y -q git curl ca-certificates gnupg debian-keyring \
  debian-archive-keyring apt-transport-https iptables-persistent

if ! command -v node >/dev/null || ! node -v | grep -q "^v${NODE_MAJOR}\."; then
  log "Node.js ${NODE_MAJOR}"
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y -q nodejs
fi

if ! command -v caddy >/dev/null; then
  log "Caddy (automatic HTTPS)"
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' |
    gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
    -o /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -q
  apt-get install -y -q caddy
fi

log "Firewall: allow HTTP/HTTPS"
# Oracle's Ubuntu images end the INPUT chain with a REJECT rule, so the
# ACCEPTs have to go in front of it (the cloud Security List must allow
# 80/443 too; see README).
for port in 80 443; do
  if ! iptables -C INPUT -p tcp --dport "$port" -m state --state NEW -j ACCEPT 2>/dev/null; then
    reject_line=$(iptables -L INPUT --line-numbers -n | awk '$2=="REJECT"{print $1; exit}')
    if [ -n "$reject_line" ]; then
      iptables -I INPUT "$reject_line" -p tcp --dport "$port" -m state --state NEW -j ACCEPT
    else
      iptables -A INPUT -p tcp --dport "$port" -m state --state NEW -j ACCEPT
    fi
  fi
done
netfilter-persistent save >/dev/null

log "App user and code"
id -u "$APP_USER" >/dev/null 2>&1 ||
  useradd --system --create-home --home-dir "/home/$APP_USER" --shell /usr/sbin/nologin "$APP_USER"
if [ ! -d "$APP_DIR/.git" ]; then
  git clone --branch "$BRANCH" "$REPO" "$APP_DIR"
fi
chown -R "$APP_USER:$APP_USER" "$APP_DIR"
as_app() { sudo -u "$APP_USER" -H bash -c "cd '$APP_DIR' && $*"; }
as_app "git fetch --quiet origin '$BRANCH' && git checkout --quiet '$BRANCH' && git reset --quiet --hard 'origin/$BRANCH'"
echo "Deploying $(as_app 'git log -1 --format="%h %s"')"

log "Dependencies and frontend build"
as_app "npm ci --prefix backend --omit=dev --no-audit --no-fund"
as_app "npm ci --prefix frontend --include=dev --no-audit --no-fund"
# Build beside the live site and swap, so a failed build never takes it down
as_app "rm -rf frontend/build.next && cd frontend && BUILD_PATH=build.next GENERATE_SOURCEMAP=false npm run build"
as_app "rm -rf frontend/build.prev && { [ ! -d frontend/build ] || mv frontend/build frontend/build.prev; } && mv frontend/build.next frontend/build"

log "Service configuration"
if [ ! -f "$ENV_FILE" ]; then
  cat >"$ENV_FILE" <<EOF
NODE_ENV=production
PORT=3001
# Optional: COINGECKO_API_KEY=...
EOF
fi
chmod 640 "$ENV_FILE"
chgrp "$APP_USER" "$ENV_FILE"

install -m 644 "$APP_DIR/deploy/oracle/liberator-stream.service" /etc/systemd/system/liberator-stream.service
sed "s/{{DOMAIN}}/$DOMAIN/g" "$APP_DIR/deploy/oracle/Caddyfile" >/etc/caddy/Caddyfile
caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null

systemctl daemon-reload
systemctl enable --quiet liberator-stream caddy
systemctl restart liberator-stream
systemctl reload caddy || systemctl restart caddy

log "Health check"
for _ in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:3001/api/health >/dev/null 2>&1; then
    echo "App is up on :3001"
    echo "Site: https://$DOMAIN (HTTPS starts working once DNS points here)"
    exit 0
  fi
  sleep 1
done
echo "App did not answer on :3001. Check: journalctl -u liberator-stream -n 50" >&2
exit 1
