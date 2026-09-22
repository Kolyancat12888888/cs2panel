#!/usr/bin/env bash
set -e

echo "====================================================="
echo "       CS2Panel Automated Production Installer       "
echo "====================================================="

# Check requirements
command -v docker >/dev/null 2>&1 || { echo "Docker is required but not installed. Aborting." >&2; exit 1; }
command -v docker compose >/dev/null 2>&1 || { echo "Docker Compose is required. Aborting." >&2; exit 1; }

echo "[+] Preparing directories..."
mkdir -p /opt/cs2panel/master_cs2 /opt/cs2panel/servers /opt/cs2panel/fastdl

echo "[+] Launching Docker Compose stack..."
docker compose up -d --build

echo ""
echo "====================================================="
echo "  CS2Panel is now running!"
echo "  Frontend Dashboard: http://localhost:3000"
echo "  Backend API:        http://localhost:8000"
echo "  Default Admin:      admin@cs2panel.local / admin123"
echo "====================================================="
