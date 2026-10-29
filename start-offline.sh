#!/bin/bash
# Mepco Retail Hub - 100% Offline Local Runner

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
cd "$DIR"

echo "================================================================="
echo "  MEPCO RETAIL HUB - 100% OFFLINE LOCAL RUNNER"
echo "  Zero Cloud Server Dependencies - Local MongoDB Engine"
echo "================================================================="
echo ""

if ! command -v node &> /dev/null; then
  echo "[ERROR] Node.js is not found. Please install Node.js from https://nodejs.org/"
  read -p "Press Enter to exit..."
  exit 1
fi

if [ ! -d "node_modules" ]; then
  echo "[1/3] First-time setup: Installing dependencies..."
  npm install --legacy-peer-deps --no-audit --no-fund
  if [ $? -ne 0 ]; then
    echo "[ERROR] Failed to install dependencies."
    read -p "Press Enter to exit..."
    exit 1
  fi
fi

if [ ! -f "dist/index.html" ]; then
  echo "[2/3] Generating application build..."
  npm run build
fi

export MONGODB_URI="mongodb://127.0.0.1:27017/smart_inventory"
export PORT="3000"
export AUTO_OPEN="true"
export NODE_ENV="production"

echo "[3/3] Starting server on http://localhost:3000..."
if command -v open &> /dev/null; then
  open "http://localhost:3000" &
elif command -v xdg-open &> /dev/null; then
  xdg-open "http://localhost:3000" &
fi

npm start

echo ""
echo "================================================================="
echo "  Mepco Retail Hub server has stopped."
echo "================================================================="
read -p "Press Enter to exit..."
