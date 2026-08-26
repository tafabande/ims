#!/bin/sh
set -e

echo "========================================================================="
echo "        IMS FASTAPI BACKEND - CONTAINER ENTRYPOINT & AUTO-SEED"
echo "========================================================================="

echo "[1/2] Running Database Migrations & Initializing Sample Data..."
python seed.py

echo "[2/2] Launching Uvicorn ASGI Production Server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
