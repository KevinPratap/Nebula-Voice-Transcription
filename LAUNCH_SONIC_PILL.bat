@echo off
SETLOCAL
cd /d "%~dp0"
echo 💊 Starting Sonic Pill in STEALTH MODE...
echo.

:: Verify Node.js
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js not found. Please install Node.js.
    pause
    exit /b
)

:: Verify Electron
if not exist "node_modules\.bin\electron.cmd" (
    echo [ERROR] Electron not found in node_modules.
    echo Running npm install...
    call npm install
)

:: Launch Electron
start /b "" "node_modules\.bin\electron.cmd" . >> "debug_log.txt" 2>&1

echo.
echo =======================================
echo 🚀 Sonic Pill Launched!
echo Press Alt+Shift+V to toggle.
echo =======================================
exit
