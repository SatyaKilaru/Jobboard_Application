#!/bin/bash
PIDS_FILE="$(dirname "$0")/../logs/pids"
if [ -f "$PIDS_FILE" ]; then
  kill $(cat "$PIDS_FILE") 2>/dev/null && echo "All services stopped." || echo "Some processes were already stopped."
  rm "$PIDS_FILE"
else
  echo "No PID file found. Services may not be running."
fi
