@echo off
echo ================================================
echo Email Service - Setup and Start
echo ================================================
echo.

REM Check if node_modules exists
if not exist "node_modules" (
    echo [1/4] Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
) else (
    echo [1/4] Dependencies already installed
)
echo.

REM Check if Prisma client is generated
echo [2/4] Generating Prisma client...
call npx prisma generate
if errorlevel 1 (
    echo ERROR: Failed to generate Prisma client
    pause
    exit /b 1
)
echo.

REM Push database schema
echo [3/4] Setting up database...
call npx prisma db push
if errorlevel 1 (
    echo ERROR: Failed to setup database
    pause
    exit /b 1
)
echo.

echo [4/4] Starting services...
echo.
echo ================================================
echo IMPORTANT: You need to start TWO services:
echo   1. API Server (this window)
echo   2. Worker (run start_worker.bat in another window)
echo ================================================
echo.
echo Starting API Server on port %PORT%...
echo Press Ctrl+C to stop
echo.

node src/server.js
