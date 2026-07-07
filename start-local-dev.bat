@echo off
echo ========================================================
echo   EDITH - Auto Launcher for Local Host Dev Servers
echo ========================================================
echo.

if not exist "%~dp0backend\.env" (
    echo [ENV] Creating backend\.env from example...
    copy "%~dp0backend\.env.example" "%~dp0backend\.env" >nul
)
if not exist "%~dp0frontend\.env" (
    echo [ENV] Creating frontend\.env from example...
    copy "%~dp0frontend\.env.example" "%~dp0frontend\.env" >nul
)

echo [1/2] Launching Backend Dev Server in new window...
start "EDITH Backend Dev Server" cmd /k "cd /d %~dp0backend && npm install && npm run db:migrate && npm run dev"

echo [2/2] Launching Frontend Dev Server in new window...
start "EDITH Frontend Dev Server" cmd /k "cd /d %~dp0frontend && npm install && npm run dev"

echo.
echo ========================================================
echo   Servers are spinning up! Check the new windows.
echo   Once booted, open http://localhost:8080 (or http://localhost:8081) in browser.
echo ========================================================
pause
