@echo off
echo ================================================
echo Email Service - Docker Setup and Start
echo ================================================
echo.

REM Check if .env file exists
if not exist ".env" (
    echo [!] WARNING: .env file not found
    echo Creating .env from .env.example...
    copy .env.example .env
    echo.
    echo Please edit .env file with your actual configuration
    echo Then run this script again.
    pause
    exit /b 1
)

REM Create data directory if it doesn't exist
if not exist "data" (
    echo Creating data directory...
    mkdir data
    echo.
)

echo [1/3] Building Docker images...
docker-compose build
if errorlevel 1 (
    echo ERROR: Failed to build Docker images
    pause
    exit /b 1
)
echo.

echo [2/3] Starting services...
docker-compose up -d
if errorlevel 1 (
    echo ERROR: Failed to start services
    pause
    exit /b 1
)
echo.

echo [3/3] Checking service health...
timeout /t 5 /nobreak > nul
docker-compose ps
echo.

echo ================================================
echo Email Service is now running!
echo ================================================
echo.
echo API Server:    http://localhost:4000
echo Health Check:  http://localhost:4000/api/health
echo Redis:         localhost:6379
echo.
echo Useful commands:
echo   docker-compose logs -f              View all logs
echo   docker-compose logs -f email-api    View API logs
echo   docker-compose logs -f email-worker View worker logs
echo   docker-compose stop                 Stop services
echo   docker-compose down                 Stop and remove containers
echo   docker-compose down -v              Stop and remove with volumes
echo.
pause
