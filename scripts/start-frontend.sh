#!/bin/bash
# Starts the frontend dev server on port 5173
set -e

cd "$(dirname "$0")/../frontend"

echo "==> Starting frontend on http://localhost:5173..."
npm run dev
