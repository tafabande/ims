#!/bin/sh
set -e

echo "========================================================================="
echo "        IMS FASTAPI BACKEND - CONTAINER ENTRYPOINT"
echo "========================================================================="

export PYTHONPATH=/app:${PYTHONPATH:-}

echo "[1/2] Executing Versioned Database Schema Migrations (Alembic)..."
alembic upgrade head

if [ "$ENVIRONMENT" != "production" ] && [ "$AUTO_SEED" = "true" ]; then
    echo "Running Non-Production Seed Script..."
    python seed.py
fi

echo "[2/2] Launching Uvicorn ASGI Server..."
exec uvicorn app.main:app \
    --host 0.0.0.0 \
    --port 8000 \
    --proxy-headers \
    --forwarded-allow-ips="${TRUSTED_PROXY_IPS:-127.0.0.1}"
