@echo off
echo ================================================
echo Email Service - Worker
echo ================================================
echo.
echo Starting Email Worker...
echo This processes the email queue
echo Press Ctrl+C to stop
echo.

node src/worker.js
