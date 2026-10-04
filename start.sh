#!/usr/bin/env bash
# Starts the local web server (if it isn't already running) and opens the mock-ups
# in their own app-style Chrome window.
set -e
cd "$(dirname "$0")"
PORT=8642
URL="http://localhost:$PORT/"

if ! curl -s -o /dev/null "$URL"; then
  setsid nohup python3 -m http.server "$PORT" --bind 127.0.0.1 > /tmp/futuristic-ui-server.log 2>&1 &
  for _ in $(seq 20); do curl -s -o /dev/null "$URL" && break; sleep 0.2; done
fi

if command -v google-chrome > /dev/null; then
  setsid google-chrome --app="$URL" --window-size=1600,990 > /dev/null 2>&1 &
else
  xdg-open "$URL"
fi
echo "Mock-ups running at $URL"
