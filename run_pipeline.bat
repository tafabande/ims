@echo off
TITLE IMS Pipeline Launcher & Environment Control
COLOR 0A
CLS

echo =========================================================================
echo               INVENTORY MANAGEMENT SYSTEM (IMS) 
echo                  PIPELINE & SERVICE LAUNCHER
echo =========================================================================
echo.

:MENU
echo  Select pipeline execution mode:
echo.
echo    [1] Launch Full Development Pipeline (FastAPI Backend + Vite Frontend)
echo    [2] Run Automated Verification Suite (Pytest + Vite Production Build)
echo    [3] Launch Docker Container Stack (Nginx + FastAPI + Postgres + Redis)
echo    [4] Re-seed Database (ims.db)
echo    [5] Exit
echo.
set /p CHOICE="Enter your choice [1-5]: "

if "%CHOICE%"=="1" goto DEV_PIPELINE
if "%CHOICE%"=="2" goto TEST_PIPELINE
if "%CHOICE%"=="3" goto DOCKER_PIPELINE
if "%CHOICE%"=="4" goto SEED_DB
if "%CHOICE%"=="5" goto END

echo Invalid selection. Please try again.
pause
cls
goto MENU

:DEV_PIPELINE
cls
echo =========================================================================
echo [1/3] Seeding Initial Database...
echo =========================================================================
cd /d "%~dp0backend"
python seed.py
echo.

echo =========================================================================
echo [2/3] Starting FastAPI Microservices Backend (Port 8000)...
echo =========================================================================
start "IMS FastAPI Backend" cmd /k "cd /d %~dp0backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

echo =========================================================================
echo [3/3] Starting React Vite Frontend (Port 5173)...
echo =========================================================================
start "IMS Vite Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo SUCCESS! Pipelines started in dedicated console windows:
echo   - Backend API Gateway: http://localhost:8000 / Swagger: http://localhost:8000/docs
echo   - Frontend Application: http://localhost:5173
echo.
pause
exit

:TEST_PIPELINE
cls
echo =========================================================================
echo [1/2] Running Backend Pytest Test Suite...
echo =========================================================================
cd /d "%~dp0backend"
python -m pytest
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo [ERROR] Pytest suite failed! Check logs above.
    pause
    color 0A
    goto MENU
)
echo.

echo =========================================================================
echo [2/2] Running Frontend Vite Production Build Verification...
echo =========================================================================
cd /d "%~dp0frontend"
call npm run build
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo [ERROR] Vite build failed! Check errors above.
    pause
    color 0A
    goto MENU
)

echo.
echo =========================================================================
echo VERIFICATION SUCCESS! All backend unit tests and frontend build passed!
echo =========================================================================
pause
cls
goto MENU

:DOCKER_PIPELINE
cls
echo =========================================================================
echo Launching Docker Compose Stack (Nginx Gateway + FastAPI + Postgres + Redis)...
echo =========================================================================
cd /d "%~dp0"
docker-compose up --build -d
echo.
echo Stack Launched! Checking container status:
docker-compose ps
echo.
pause
cls
goto MENU

:SEED_DB
cls
echo =========================================================================
echo Seeding Database (ims.db)...
echo =========================================================================
cd /d "%~dp0backend"
python seed.py
echo.
pause
cls
goto MENU

:END
exit
