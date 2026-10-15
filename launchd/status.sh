#!/bin/bash
# Shows whether each agent is running, its last exit, the Mac's sleep
# assertions, and the latest log lines.
set -uo pipefail

DOMAIN="gui/$(id -u)"
LOGS="$HOME/Library/Logs/liberator-stream"

for label in com.liberator-stream.backend com.liberator-stream.streamer; do
  if info="$(launchctl print "$DOMAIN/$label" 2>/dev/null)"; then
    state="$(awk -F' = ' '/^\tstate =/ {print $2; exit}' <<<"$info")"
    pid="$(awk -F' = ' '/^\tpid =/ {print $2; exit}' <<<"$info")"
    runs="$(awk -F' = ' '/^\truns =/ {print $2; exit}' <<<"$info")"
    last="$(awk -F' = ' '/last (exit code|terminating signal) =/ {print $2; exit}' <<<"$info")"
    echo "$label: ${state:-?}${pid:+, pid $pid}, started ${runs:-?} times, last exit: ${last:-none}"
  else
    echo "$label: not installed (make services-install)"
  fi
done

echo
echo "Keeping the Mac awake:"
pmset -g assertions | grep -E 'caffeinate' | sed 's/^ */  /' || echo "  nothing (the streamer isn't streaming)"

for name in backend streamer; do
  echo
  echo "== $LOGS/$name.log (last 10 lines)"
  tail -n 10 "$LOGS/$name.log" 2>/dev/null || echo "(no log yet)"
done
