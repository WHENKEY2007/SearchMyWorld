Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "Starting SearchMyWorld..." -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan

$backendDir = Join-Path $PSScriptRoot "backend"
$pythonExe = Join-Path $backendDir ".venv\Scripts\python.exe"

# First-time setup if virtual environment is missing
if (-not (Test-Path $pythonExe)) {
    Write-Host "====================================================" -ForegroundColor Yellow
    Write-Host "First-time setup detected!" -ForegroundColor Yellow
    Write-Host "Creating virtual environment and installing dependencies..." -ForegroundColor Yellow
    Write-Host "(This only happens on the first run. Please wait...)" -ForegroundColor Yellow
    Write-Host "====================================================" -ForegroundColor Yellow

    Push-Location $backendDir
    python -m venv .venv
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Python 3 is not found. Please install Python 3.10+ and re-run." -ForegroundColor Red
        Pop-Location
        exit 1
    }
    & "$pythonExe" -m pip install -r requirements.txt
    Pop-Location
    Write-Host "Setup complete!" -ForegroundColor Green
}

# Start backend if not already listening
$portListening = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
if (-not $portListening) {
    Start-Process powershell -ArgumentList "-WindowStyle", "Hidden", "-Command", "cd `"$backendDir`"; & `"$pythonExe`" run.py"
    Start-Sleep -Seconds 2
}

# Open the UI in default browser
Start-Process "http://127.0.0.1:8000"

Write-Host "SearchMyWorld is live at http://127.0.0.1:8000" -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Cyan
