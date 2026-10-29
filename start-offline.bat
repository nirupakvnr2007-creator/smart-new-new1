@echo off
TITLE Mepco Retail Hub - 100% Offline Local Runner
cd /d "%~dp0"

echo =================================================================
echo   MEPCO RETAIL HUB - 100% OFFLINE LOCAL RUNNER
echo   Zero Cloud Server Dependencies - Local MongoDB Engine
echo =================================================================
echo.

where node >nul 2>nul
if errorlevel 1 goto NO_NODE

if not exist "node_modules\express" goto INSTALL_DEPS
if not exist "dist\index.html" goto BUILD_APP
goto RUN_APP

:INSTALL_DEPS
echo [1/3] Installing dependencies for first-time setup...
call npm install --legacy-peer-deps --no-audit --no-fund
if errorlevel 1 goto INSTALL_ERROR
if not exist "dist\index.html" goto BUILD_APP
goto RUN_APP

:BUILD_APP
echo [2/3] Generating application build...
call npm run build
if errorlevel 1 goto BUILD_ERROR
goto RUN_APP

:RUN_APP
set MONGODB_URI=mongodb://127.0.0.1:27017/smart_inventory
set PORT=3000
set AUTO_OPEN=true
set NODE_ENV=production

echo.
echo [3/3] Launching Mepco Retail Hub...
echo - Target MongoDB: mongodb://localhost:27017/smart_inventory
echo - Web App URL:    http://localhost:3000
echo.
echo Opening your browser now...
start "" "http://localhost:3000"

call npm start
goto EXIT_SCRIPT

:NO_NODE
echo.
echo [ERROR] Node.js is not found on your computer!
echo Please download and install Node.js from: https://nodejs.org
echo After installing Node.js, run start-offline.bat again.
echo.
pause
goto EXIT_SCRIPT

:INSTALL_ERROR
echo.
echo [ERROR] Failed to install dependencies.
echo Please run: npm install --legacy-peer-deps
echo.
pause
goto EXIT_SCRIPT

:BUILD_ERROR
echo.
echo [ERROR] Application build step failed.
echo.
pause
goto EXIT_SCRIPT

:EXIT_SCRIPT
echo.
echo =================================================================
echo   Server stopped. Press any key to close this window...
echo =================================================================
pause
