@echo off
echo.
echo  EDITH — Auto Setup Script
echo  ═══════════════════════════════════════════
echo.

node --version >nul 2>&1 || (echo [ERROR] Node.js not found. Install from https://nodejs.org && exit /b 1)
echo [OK] Node.js found

if not exist backend\.env copy backend\.env.example backend\.env
if not exist frontend\.env copy frontend\.env.example frontend\.env 2>nul
if not exist .env copy backend\.env .env

echo Installing backend...
cd backend && call npm install --prefer-offline
echo [OK] Backend deps installed

cd ..
echo Installing frontend...
cd frontend && call npm install --prefer-offline
echo [OK] Frontend deps installed

cd ..
echo Running migration...
cd backend && node scripts/migrate.js
cd ..

echo.
echo  ═══════════════════════════════════════════
echo  Done! Start EDITH:
echo    Terminal 1: cd backend ^&^& npm run dev
echo    Terminal 2: cd frontend ^&^& npm run dev
echo    Open: http://localhost:5173
echo.
echo  IMPORTANT: Add OPENROUTER_API_KEY to backend\.env
echo  Free key: https://openrouter.ai
echo  ═══════════════════════════════════════════
pause
