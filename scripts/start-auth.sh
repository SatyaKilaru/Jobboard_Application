#!/bin/bash
# Starts the auth-service on port 8081
set -e

export GOROOT=$HOME/sdk/go1.22.5
export GOPATH=$HOME/go
export PATH=$GOROOT/bin:$GOPATH/bin:$PATH

cd "$(dirname "$0")/../auth-service"

echo "==> Building auth-service..."
go build -o bin/auth-service ./cmd/main.go

echo "==> Starting auth-service on :8081..."
./bin/auth-service
