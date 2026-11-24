@echo off
title SearchMyWorld
echo ====================================================
echo Starting SearchMyWorld...
echo ====================================================

rem Lock in Python 3.11 PATH priority safely without parenthesis expansion bugs
if not exist "%LOCALAPPDATA%\Programs\Python\Python311\python.exe" goto :skip_path_override
set "PATH=%LOCALAPPDATA%\Programs\Python\Python311;%LOCALAPPDATA%\Programs\Python\Python311\Scripts;%PATH%"
:skip_path_override

cd /d "%~dp0backend"

rem If virtual environment already exists, skip directly to server launch
if exist ".venv\Scripts\python.exe" goto :start_server
if exist "%~dp0backend\.venv\Scripts\python.exe" goto :start_server

echo ====================================================
echo First-time setup detected!
echo Creating virtual environment and installing packages...
echo (This only happens on the first run. Please wait...)
echo ====================================================

if exist "%LOCALAPPDATA%\Programs\Python\Python311\python.exe" goto :create_venv_direct
py -3.11 -m venv .venv 2>nul || python -m venv .venv
goto :check_venv_created

:create_venv_direct
"%LOCALAPPDATA%\Programs\Python\Python311\python.exe" -m venv .venv

:check_venv_created
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

:start_server
rem Check if backend server is already running on port 8000
netstat -ano | findstr /r ":8000.*LISTENING" >nul 2>&1
if not errorlevel 1 goto :server_already_running

echo Launching SearchMyWorld backend server...
start "SearchMyWorld Backend" /d "%~dp0backend" /min cmd /k ".venv\Scripts\python.exe run.py"
ping 127.0.0.1 -n 4 >nul
goto :open_browser

:server_already_running
echo Backend server is already running!

:open_browser
rem Automatically open SearchMyWorld in browser
start http://127.0.0.1:8000

echo.
echo ====================================================
echo SearchMyWorld is live!
echo Local Address: http://127.0.0.1:8000
echo ====================================================
