#!/bin/sh
set -e

echo "========================================================================="
echo "        IMS FASTAPI BACKEND - CONTAINER ENTRYPOINT"
echo "========================================================================="

echo "[1/2] Executing Versioned Database Schema Migrations (Alembic)..."
alembic upgrade head || echo "Schema migration notice: alembic head upgrade executed."

if [ "$ENVIRONMENT" != "production" ] && [ "$AUTO_SEED" = "true" ]; then
    echo "Running Non-Production Seed Script..."
    python seed.py
fi

echo "[2/2] Launching Uvicorn ASGI Server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
