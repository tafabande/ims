#!/bin/bash

echo "========================================================================="
echo "              ENTERPRISE INVENTORY MANAGEMENT SYSTEM (IMS)"
echo "                   1-CLICK TURNKEY SYSTEM LAUNCHER"
echo "========================================================================="
echo ""
echo "Starting IMS Application Stack... Please wait..."
echo ""

cd "$(dirname "$0")"

# Check if Docker is available
if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
    echo "[DOCKER MODE DETECTED] Launching Production Docker Containers..."
    docker compose up -d --build
    echo ""
    echo "========================================================================="
    echo "SUCCESS! IMS Production Stack is RUNNING via Docker NGINX."
    echo "Opening web browser to http://localhost ..."
    echo "========================================================================="
    
    if command -v open >/dev/null 2>&1; then
        open http://localhost
    elif command -v xdg-open >/dev/null 2>&1; then
        xdg-open http://localhost
    fi
else
    echo "[LOCAL MODE DETECTED] Launching Local Backend & Web Frontend..."
    cd backend && python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8000 &
    cd ../frontend && npm run dev &
    sleep 3
    if command -v open >/dev/null 2>&1; then
        open http://localhost:5173
    elif command -v xdg-open >/dev/null 2>&1; then
        xdg-open http://localhost:5173
    fi
fi

echo ""
echo "========================================================================="
echo "                   ★ IMS IS NOW LIVE & READY TO USE ★"
echo "========================================================================="
echo "DEFAULT LOGIN ACCOUNTS:"
echo "  - System Admin:       admin@ims.co.zw     / admin123"
echo "  - Store Manager:      manager@ims.co.zw   / manager123"
echo "  - Front Cashier:      staff@ims.co.zw     / staff123"
echo "  - Warehouse Staff:    warehouse@ims.co.zw / warehouse123"
echo "  - Auditor:            auditor@ims.co.zw   / auditor123"
echo "========================================================================="
