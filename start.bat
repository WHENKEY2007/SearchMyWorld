@echo off
title SearchMyWorld
echo ====================================================
echo Starting SearchMyWorld...
echo ====================================================

cd /d "%~dp0backend"

rem Check if Python virtual environment exists and uses Python 3.11
if exist ".venv\pyvenv.cfg" (
    findstr /i "3.11" .venv\pyvenv.cfg >nul 2>&1
    if errorlevel 1 (
        echo [NOTICE] Updating virtual environment to stable Python 3.11...
        rmdir /s /q .venv 2>nul
    )
)

if not exist ".venv\Scripts\python.exe" (
    echo ====================================================
    echo First-time setup detected!
    echo Creating virtual environment and installing packages...
    echo (This only happens on the first run. Please wait...)
    echo ====================================================
    if exist "%LOCALAPPDATA%\Programs\Python\Python311\python.exe" (
        "%LOCALAPPDATA%\Programs\Python\Python311\python.exe" -m venv .venv
    ) else (
        py -3.11 -m venv .venv 2>nul || python -m venv .venv
    )
    if errorlevel 1 (
        echo [ERROR] Python is not installed or not in your system PATH.
        echo Please install Python 3.11 from python.org and try again.
        pause
        exit /b 1
    )
    echo Installing dependencies from requirements.txt...
    .venv\Scripts\pip install -r requirements.txt
    if errorlevel 1 (
        echo [ERROR] Dependency installation failed.
        pause
        exit /b 1
    )
    echo Setup complete! Starting SearchMyWorld...
)

rem Start backend in background if not already running
start "SearchMyWorld Backend" /min cmd /k "cd /d "%~dp0backend" && .venv\Scripts\python.exe run.py"

rem Wait 3 seconds for server readiness
timeout /t 3 /nobreak >nul

rem Automatically open SearchMyWorld in your browser
start http://127.0.0.1:8000

echo.
echo SearchMyWorld is live!
echo Local Address: http://127.0.0.1:8000
echo ====================================================
