@echo off
TITLE Enterprise IMS - 1-Click Turnkey System Launcher
COLOR 0A
CLS

cd /d "%~dp0"

echo =========================================================================
echo               ENTERPRISE INVENTORY MANAGEMENT SYSTEM (IMS)
echo                    1-CLICK TURNKEY SYSTEM LAUNCHER
echo =========================================================================
echo.
echo Starting IMS Application Stack... Please wait...
echo.

:: Check if Docker is installed & daemon is running
docker info >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [DOCKER MODE DETECTED] Launching Production Docker Containers...
    docker compose up -d --build
    if %ERRORLEVEL% EQU 0 (
        echo.
        echo =========================================================================
        echo SUCCESS! IMS Production Stack is RUNNING via Docker NGINX.
        echo Opening web browser to http://localhost ...
        echo =========================================================================
        timeout /t 3 >nul
        start http://localhost
        goto SUCCESS_FOOTER
    )
)

echo.
echo [LOCAL MODE DETECTED] Launching Local Backend ^& Web Frontend...
echo.

:: Start FastAPI Backend
echo Starting Backend API Server (127.0.0.1:8000)...
cd /d "%~dp0backend"
start "IMS Backend API" cmd /k "cd /d %~dp0backend && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

:: Start Vite Frontend
echo Starting Web Frontend Server (http://localhost:5173)...
cd /d "%~dp0frontend"
start "IMS Web Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

timeout /t 4 >nul
start http://localhost:5173

:SUCCESS_FOOTER
CLS
COLOR 0A
echo =========================================================================
echo                    ★ IMS IS NOW LIVE ^& READY TO USE ★
echo =========================================================================
echo.
echo Your default browser window should now be open!
echo.
echo DEFAULT LOGIN ACCOUNTS (All sample data pre-loaded):
echo   -------------------------------------------------------------------
echo   ROLE               EMAIL                     PASSWORD
echo   -------------------------------------------------------------------
echo   System Admin       admin@ims.co.zw           admin123
echo   Store Manager      manager@ims.co.zw         manager123
echo   Front Cashier      staff@ims.co.zw           staff123
echo   Warehouse Staff    warehouse@ims.co.zw       warehouse123
echo   Auditor            auditor@ims.co.zw         auditor123
echo   -------------------------------------------------------------------
echo.
echo Keep this window open while using IMS. Press any key to stop/exit.
echo =========================================================================
pause >nul
