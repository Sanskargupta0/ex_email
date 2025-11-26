@echo off
echo ================================================
echo Email Service - Stop Docker Services
echo ================================================
echo.

echo Stopping all services...
docker-compose down

echo.
echo Services stopped successfully!
echo.
echo NOTE: Database files are saved in the ./data directory on your host machine.
echo Your data is safe even after stopping containers.
echo.
echo To completely remove everything:
echo   docker-compose down -v     (removes Redis data)
echo   rmdir /s /q data           (removes database files)
echo.
pause
