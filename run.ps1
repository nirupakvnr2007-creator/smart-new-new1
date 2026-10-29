# Mepco Retail Hub - Offline PowerShell Launcher
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "  MEPCO RETAIL HUB - 100% OFFLINE LOCAL RUNNER" -ForegroundColor Cyan
Write-Host "  Zero Cloud Server Dependencies - Local MongoDB Engine" -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host ""

Set-Location -Path $PSScriptRoot

# Check Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Node.js is not found on your system." -ForegroundColor Red
    Write-Host "Please install Node.js (LTS) from https://nodejs.org/" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit..."
    exit 1
}

# Install dependencies if express is missing
if (-not (Test-Path "node_modules/express")) {
    Write-Host "[1/3] Installing dependencies for first-time setup..." -ForegroundColor Yellow
    npm install --legacy-peer-deps --no-audit --no-fund
}

# Build if dist is missing
if (-not (Test-Path "dist/index.html")) {
    Write-Host "[2/3] Generating application build..." -ForegroundColor Yellow
    npm run build
}

$env:MONGODB_URI = "mongodb://127.0.0.1:27017/smart_inventory"
$env:PORT = "3000"
$env:NODE_ENV = "production"
$env:AUTO_OPEN = "true"

Write-Host ""
Write-Host "[3/3] Starting server on http://localhost:3000..." -ForegroundColor Green
Write-Host "Target MongoDB: mongodb://localhost:27017/smart_inventory" -ForegroundColor Green
Write-Host ""

Start-Process "http://localhost:3000"

npm start

Write-Host ""
Write-Host "=================================================================" -ForegroundColor Gray
Write-Host "  Server has stopped." -ForegroundColor Gray
Write-Host "=================================================================" -ForegroundColor Gray
Read-Host "Press Enter to exit..."
