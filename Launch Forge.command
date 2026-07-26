#!/bin/zsh

set -e

PROJECT_DIR="${0:A:h}"
cd "$PROJECT_DIR"

clear 2>/dev/null || true
echo "FORGE — AI Interview Lab"
echo "Starting your private local study app..."
echo

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required but was not found."
  echo "Install Node.js 22 or newer, then double-click this file again."
  echo
  read "?Press Return to close."
  exit 1
fi

if [[ ! -x "node_modules/.bin/next" ]]; then
  echo "First launch: installing local app files. This may take a minute..."
  npm install
  echo
fi

PORT=3210
while lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; do
  PORT=$((PORT + 1))
done

LOCAL_URL="http://127.0.0.1:$PORT"

npm run dev -- --hostname 127.0.0.1 --port "$PORT" &
SERVER_PID=$!

cleanup() {
  kill "$SERVER_PID" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

for attempt in {1..120}; do
  if curl --silent --fail "$LOCAL_URL" >/dev/null 2>&1; then
    echo
    echo "Forge is ready at $LOCAL_URL"
    echo "Opening your browser..."
    echo
    echo "Keep this window open while studying."
    echo "Close it or press Control-C to stop Forge."
    open "$LOCAL_URL"
    wait "$SERVER_PID"
    exit 0
  fi

  if ! kill -0 "$SERVER_PID" >/dev/null 2>&1; then
    echo
    echo "Forge could not start. Review the message above."
    read "?Press Return to close."
    exit 1
  fi

  sleep 1
done

echo
echo "Forge took too long to start."
read "?Press Return to close."
exit 1
