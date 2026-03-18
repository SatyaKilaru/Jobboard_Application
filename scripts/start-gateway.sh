#!/bin/bash
# Starts the api-gateway on port 8080
set -e

export GOROOT=$HOME/sdk/go1.22.5
export GOPATH=$HOME/go
export PATH=$GOROOT/bin:$GOPATH/bin:$PATH

cd "$(dirname "$0")/../api-gateway"

echo "==> Building api-gateway..."
go build -o bin/api-gateway ./cmd/main.go

echo "==> Starting api-gateway on :8080..."
./bin/api-gateway
