#!/usr/bin/env bash
# Deploy the latest pushed code to the server from your machine:
#
#   deploy/oracle/deploy.sh ubuntu@<server-ip>
#
# Runs this repo's setup.sh on the server (install or update, idempotent).
# The server pulls from GitHub, so push your commits first.
set -euo pipefail

HOST="${1:?usage: deploy/oracle/deploy.sh ubuntu@<server-ip>}"
DOMAIN="${DOMAIN:-btc-dash.com}"
BRANCH="${BRANCH:-main}"

ssh "$HOST" "sudo env DOMAIN='$DOMAIN' BRANCH='$BRANCH' bash -s" <"$(dirname "$0")/setup.sh"
