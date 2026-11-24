@echo off
title SearchMyWorld
echo ====================================================
echo Starting SearchMyWorld...
echo ====================================================

rem Force Python 3.11 PATH priority over any system preview Python versions
if exist "%LOCALAPPDATA%\Programs\Python\Python311\python.exe" (
    set "PATH=%LOCALAPPDATA%\Programs\Python\Python311;%LOCALAPPDATA%\Programs\Python\Python311\Scripts;%PATH%"
)

cd /d "%~dp0backend"

rem Only run first-time setup if .venv does not exist
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
        echo [ERROR] Python 3.11 is required. Please install Python 3.11.
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
    echo Setup complete!
)

rem Check if backend server is already running on port 8000
netstat -ano | findstr /r ":8000.*LISTENING" >nul 2>&1
if errorlevel 1 (
    echo Launching SearchMyWorld backend server...
    start "SearchMyWorld Backend" /min cmd /k "cd /d "%~dp0backend" && set "PATH=%LOCALAPPDATA%\Programs\Python\Python311;%LOCALAPPDATA%\Programs\Python\Python311\Scripts;%PATH%" && .venv\Scripts\python.exe run.py"
    timeout /t 3 /nobreak >nul
) else (
    echo Backend server is already running!
)

rem Automatically open SearchMyWorld in browser
start http://127.0.0.1:8000

echo.
echo ====================================================
echo SearchMyWorld is live!
echo Local Address: http://127.0.0.1:8000
echo ====================================================
