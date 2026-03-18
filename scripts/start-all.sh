#!/bin/bash
# Starts all services in the background and tails their logs.
# Run this after setup-db.sh has been run at least once.

set -e

SCRIPT_DIR="$(dirname "$0")"
LOG_DIR="$SCRIPT_DIR/../logs"
mkdir -p "$LOG_DIR"

export GOROOT=$HOME/sdk/go1.22.5
export GOPATH=$HOME/go
export PATH=$GOROOT/bin:$GOPATH/bin:$PATH

# ---- Build both services ----
echo "==> Building auth-service..."
cd "$SCRIPT_DIR/../auth-service"
go build -o bin/auth-service ./cmd/main.go

echo "==> Building api-gateway..."
cd "$SCRIPT_DIR/../api-gateway"
go build -o bin/api-gateway ./cmd/main.go

# ---- Start services ----
echo ""
echo "==> Starting auth-service  (log: logs/auth.log)"
cd "$SCRIPT_DIR/../auth-service"
./bin/auth-service > "$LOG_DIR/auth.log" 2>&1 &
AUTH_PID=$!

sleep 1

echo "==> Starting api-gateway   (log: logs/gateway.log)"
cd "$SCRIPT_DIR/../api-gateway"
./bin/api-gateway > "$LOG_DIR/gateway.log" 2>&1 &
GW_PID=$!

sleep 1

echo "==> Starting frontend      (log: logs/frontend.log)"
cd "$SCRIPT_DIR/../frontend"
npm run dev > "$LOG_DIR/frontend.log" 2>&1 &
FE_PID=$!

echo ""
echo "All services started:"
echo "  auth-service  PID=$AUTH_PID  → http://localhost:8081"
echo "  api-gateway   PID=$GW_PID    → http://localhost:8080"
echo "  frontend      PID=$FE_PID    → http://localhost:5173"
echo ""
echo "Logs: tail -f logs/auth.log logs/gateway.log logs/frontend.log"
echo "Stop: kill $AUTH_PID $GW_PID $FE_PID"
echo ""

# Save PIDs so you can stop later
echo "$AUTH_PID $GW_PID $FE_PID" > "$LOG_DIR/pids"

# Tail all logs
tail -f "$LOG_DIR/auth.log" "$LOG_DIR/gateway.log" "$LOG_DIR/frontend.log"
