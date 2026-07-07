#!/usr/bin/env pwsh
# ================================================================
#  EDITH - Windows Desktop Build Script
#  Converts web app into a native Windows .exe installer
#  Usage: .\build.ps1
#  Output: desktop\release\EDITH Setup 1.0.0.exe
# ================================================================

$ErrorActionPreference = "Continue"
$ROOT     = Split-Path -Parent $MyInvocation.MyCommand.Path
$BACKEND  = Join-Path $ROOT "backend"
$FRONTEND = Join-Path $ROOT "frontend"
$DESKTOP  = Join-Path $ROOT "desktop"
$PATCHES  = Join-Path $ROOT "backend-sqlite-patches"
$FPATCHES = Join-Path $ROOT "frontend-patch"

function Write-Step { param($n,$t); Write-Host ""; Write-Host "[$n] $t" -ForegroundColor Cyan; Write-Host ("-"*62) -ForegroundColor DarkGray }
function Write-OK   { param($t); Write-Host "  [OK] $t" -ForegroundColor Green  }
function Write-WARN { param($t); Write-Host "  [WARN] $t" -ForegroundColor Yellow }
function Write-ERR  { param($t); Write-Host "  [ERR] $t" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "====================================================" -ForegroundColor Magenta
Write-Host "     EDITH Desktop - Windows Installer Builder      " -ForegroundColor Magenta
Write-Host "====================================================" -ForegroundColor Magenta

Write-Step "0" "Pre-flight checks"
try { $nv = node --version; Write-OK "Node.js $nv" } catch { Write-ERR "Node.js not found - https://nodejs.org" }
if (-not (Test-Path $PATCHES))  { Write-ERR "backend-sqlite-patches/ not found" }
if (-not (Test-Path $BACKEND))  { Write-ERR "backend/ not found" }
if (-not (Test-Path $FRONTEND)) { Write-ERR "frontend/ not found" }
if (-not (Test-Path $DESKTOP))  { Write-ERR "desktop/ not found" }

Write-Step "1" "Applying SQLite patches to backend"

$patchList = @(
  "config\database.ts;src\config\database.ts"
  "config\redis.ts;src\config\redis.ts"
  "config\env.ts;src\config\env.ts"
  "config\constants.ts;src\config\constants.ts"
  "db\schema\index.ts;src\db\schema\index.ts"
  "db\schema\payments.ts;src\db\schema\payments.ts"
  "db\schema\freelance.ts;src\db\schema\freelance.ts"
  "db\schema\dropshipping.ts;src\db\schema\dropshipping.ts"
  "db\schema\logs.ts;src\db\schema\logs.ts"
  "db\schema\users.ts;src\db\schema\users.ts"
  "db\schema\files.ts;src\db\schema\files.ts"
  "db\schema\chat.ts;src\db\schema\chat.ts"
  "db\migrate.ts;src\db\migrate.ts"
  "db\client.ts;src\db\client.ts"
  "queues\inMemoryQueue.ts;src\queues\inMemoryQueue.ts"
  "queues\scheduler.ts;src\queues\scheduler.ts"
  "queues\workers.ts;src\queues\workers.ts"
  "controllers\healthController.ts;src\controllers\healthController.ts"
  "controllers\dashboardController.ts;src\controllers\dashboardController.ts"
  "controllers\activeJobsController.ts;src\controllers\activeJobsController.ts"
  "controllers\adminController.ts;src\controllers\adminController.ts"
  "controllers\adsController.ts;src\controllers\adsController.ts"
  "controllers\completedController.ts;src\controllers\completedController.ts"
  "controllers\analyticsController.ts;src\controllers\analyticsController.ts"
  "controllers\agentsController.ts;src\controllers\agentsController.ts"
  "controllers\marketplaceController.ts;src\controllers\marketplaceController.ts"
  "controllers\authController.ts;src\controllers\authController.ts"
  "controllers\paymentController.ts;src\controllers\paymentController.ts"
  "controllers\chatController.ts;src\controllers\chatController.ts"
  "controllers\referralsController.ts;src\controllers\referralsController.ts"
  "controllers\platformController.ts;src\controllers\platformController.ts"
  "controllers\platformHubController.ts;src\controllers\platformHubController.ts"
  "controllers\processorController.ts;src\controllers\processorController.ts"
  "controllers\notificationController.ts;src\controllers\notificationController.ts"
  "services\storage\StorageService.ts;src\services\storage\StorageService.ts"
  "services\storage\FileManager.ts;src\services\storage\FileManager.ts"
  "services\payment\PaymentService.ts;src\services\payment\PaymentService.ts"
  "services\payment\InvoiceService.ts;src\services\payment\InvoiceService.ts"
  "services\payment\PayoutTracker.ts;src\services\payment\PayoutTracker.ts"
  "services\freelance\JobDiscoveryService.ts;src\services\freelance\JobDiscoveryService.ts"
  "services\freelance\ExecutionService.ts;src\services\freelance\ExecutionService.ts"
  "services\freelance\QCService.ts;src\services\freelance\QCService.ts"
  "services\freelance\DeliveryService.ts;src\services\freelance\DeliveryService.ts"
  "services\platform\PlatformAuthService.ts;src\services\platform\PlatformAuthService.ts"
  "services\platform\UpworkScraper.ts;src\services\platform\UpworkScraper.ts"
  "services\platform\FiverrScraper.ts;src\services\platform\FiverrScraper.ts"
  "services\platform\FreelancerScraper.ts;src\services\platform\FreelancerScraper.ts"
  "services\platform\PlatformDiscoveryService.ts;src\services\platform\PlatformDiscoveryService.ts"
  "services\platform\PlatformIntegrationService.ts;src\services\platform\PlatformIntegrationService.ts"
  "services\platform\PlatformPoller.ts;src\services\platform\PlatformPoller.ts"
  "services\processor\FormatConverter.ts;src\services\processor\FormatConverter.ts"
  "services\processor\ProcessorService.ts;src\services\processor\ProcessorService.ts"
  "services\notification\PushNotificationService.ts;src\services\notification\PushNotificationService.ts"
  "routes\freelance.ts;src\routes\freelance.ts"
  "routes\platform.ts;src\routes\platform.ts"
  "routes\platformsHub.ts;src\routes\platformsHub.ts"
  "routes\processor.ts;src\routes\processor.ts"
  "routes\notification.ts;src\routes\notification.ts"
  "routes\index.ts;src\routes\index.ts"
  "services\dropshipping\AnalyticsService.ts;src\services\dropshipping\AnalyticsService.ts"
  "services\chat\ContextManager.ts;src\services\chat\ContextManager.ts"
  "services\chat\ResponseGenerator.ts;src\services\chat\ResponseGenerator.ts"
  "services\intelligence\CrossLearningService.ts;src\services\intelligence\CrossLearningService.ts"
  "services\notification\NotificationService.ts;src\services\notification\NotificationService.ts"
  "utils\scraper.ts;src\utils\scraper.ts"
  "index.ts;src\index.ts"
  "package.json;package.json"
  "drizzle.config.ts;drizzle.config.ts"
  "tsconfig.json;tsconfig.json"
)

foreach ($p in $patchList) {
  $parts = $p -split ";"
  $srcFile = $parts[0]
  $dstFile = $parts[1]
  $src = Join-Path $PATCHES $srcFile; $dst = Join-Path $BACKEND $dstFile
  $dir = Split-Path $dst
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
  if (Test-Path $src) { Copy-Item -Path $src -Destination $dst -Force; Write-OK $dstFile }
  else { Write-WARN "Not found: $srcFile" }
}

# Remove old BullMQ files
@("src\queues\workers","src\queues\producers") | ForEach-Object {
  $d = Join-Path $BACKEND $_
  if (Test-Path $d) { Remove-Item $d -Recurse -Force; Write-OK "Removed $_" }
}

Write-Step "2" "Backend: npm install (SQLite edition)"
Set-Location $BACKEND
npm install --prefer-offline 2>&1 | Select-String "added|error" | ForEach-Object { Write-Host "  $_" -ForegroundColor DarkGray }
if ($LASTEXITCODE -ne 0) { Write-ERR "Backend npm install failed" }
Write-OK "Backend dependencies installed"

Write-Step "3" "Backend: TypeScript compile"
npx tsc --project tsconfig.json 2>&1 | ForEach-Object { Write-Host "  $_" -ForegroundColor DarkGray }
if (-not (Test-Path (Join-Path $BACKEND "dist\index.js"))) {
  Write-WARN "Trying with --noEmitOnError false..."
  npx tsc --project tsconfig.json --noEmitOnError false 2>&1 | Out-Null
  if (-not (Test-Path (Join-Path $BACKEND "dist\index.js"))) { Write-ERR "Backend compile failed" }
}
Write-OK "Backend compiled -> backend/dist/"
Set-Location $ROOT

Write-Step "4" "Frontend: apply desktop patches"
if (Test-Path (Join-Path $FPATCHES "api.desktop.ts")) {
  Copy-Item (Join-Path $FPATCHES "api.desktop.ts")          (Join-Path $FRONTEND "src\lib\api.ts")  -Force
  Write-OK "api.desktop.ts applied"
}

Write-Step "5" "Frontend: build"
Set-Location $FRONTEND
if (-not (Test-Path "node_modules")) {
  npm install --prefer-offline 2>&1 | Select-String "added|error" | ForEach-Object { Write-Host "  $_" -ForegroundColor DarkGray }
}
$env:VITE_API_BASE_URL="http://localhost:5001"
$env:VITE_API_KEY="edith-desktop-key"
$env:VITE_IS_DESKTOP="true"
npm run build 2>&1 | ForEach-Object { Write-Host "  $_" -ForegroundColor DarkGray }
if (-not (Test-Path (Join-Path $FRONTEND "dist\server\index.mjs"))) { Write-ERR "Frontend build failed - dist/server/index.mjs not found" }
Write-OK "Frontend built -> frontend/dist/"
Set-Location $ROOT

Write-Step "6" "Icon & Logo compilation"
$converterScript = Join-Path $DESKTOP "assets\convert_logo.py"
if (Test-Path $converterScript) {
  Write-Host "  Compiling custom logo..." -ForegroundColor DarkGray
  python $converterScript
  if ($LASTEXITCODE -ne 0) {
    Write-WARN "Logo compilation failed, using existing icon or fallback"
  } else {
    Write-OK "Custom logo compiled to desktop icons and frontend assets"
  }
} else {
  Write-WARN "Logo converter script not found, skipping icon compilation"
}

Write-Step "7" "Electron: prepare package files & install"
Set-Location $DESKTOP

# Prepare .env
$rootEnv = Join-Path $ROOT ".env"; $desktopEnv = Join-Path $DESKTOP ".env"
if (Test-Path $rootEnv) { Copy-Item $rootEnv $desktopEnv -Force; Write-OK "Copied .env" }
elseif (-not (Test-Path $desktopEnv)) {
  "PORT=5001`nNODE_ENV=production`nAPI_KEY=edith-desktop-key`nOPENROUTER_API_KEY=PASTE_YOUR_KEY_HERE`nDEFAULT_MODEL=deepseek/deepseek-chat`n" | Out-File $desktopEnv -Encoding UTF8
  Write-WARN "Created template .env - edit desktop\.env and add your OPENROUTER_API_KEY"
}

# Create local folders inside desktop
$desktopBackend = Join-Path $DESKTOP "backend"
$desktopFrontend = Join-Path $DESKTOP "frontend"

if (Test-Path $desktopBackend) { Remove-Item $desktopBackend -Recurse -Force -ErrorAction SilentlyContinue | Out-Null }
if (Test-Path $desktopFrontend) { Remove-Item $desktopFrontend -Recurse -Force -ErrorAction SilentlyContinue | Out-Null }

New-Item -ItemType Directory -Path $desktopBackend -Force | Out-Null
New-Item -ItemType Directory -Path $desktopFrontend -Force | Out-Null

# Copy backend dist and package.json to desktop/backend
Copy-Item -Path (Join-Path $BACKEND "dist") -Destination (Join-Path $desktopBackend "dist") -Recurse -Force
Copy-Item -Path (Join-Path $BACKEND "package.json") -Destination (Join-Path $desktopBackend "package.json") -Force
Write-OK "Copied backend dist & package.json to desktop/backend"

# Copy frontend dist to desktop/frontend
Copy-Item -Path (Join-Path $FRONTEND "dist") -Destination (Join-Path $desktopFrontend "dist") -Recurse -Force
Write-OK "Copied frontend dist to desktop/frontend"

# Install production dependencies for desktop/backend
Write-Host "  Installing production dependencies in desktop/backend..." -ForegroundColor DarkGray
Set-Location $desktopBackend
npm install --omit=dev --prefer-offline 2>&1 | Select-String "added|error" | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }
if ($LASTEXITCODE -ne 0) { Write-ERR "desktop/backend npm install failed" }
Write-OK "Installed desktop/backend dependencies"

# Install electron wrapper dependencies
Set-Location $DESKTOP
npm install --prefer-offline 2>&1 | Select-String "added|error" | ForEach-Object { Write-Host "  $_" -ForegroundColor DarkGray }
Write-OK "Electron installed"

Write-Step "8" "Rebuild better-sqlite3 for Electron"
try {
  $ev = (Get-Content (Join-Path $DESKTOP "node_modules\electron\package.json") -Raw | ConvertFrom-Json).version
  Set-Location $desktopBackend
  npx -y @electron/rebuild -w better-sqlite3 -v "$ev" 2>&1 | ForEach-Object { Write-Host "  $_" -ForegroundColor DarkGray }
  Write-OK "better-sqlite3 rebuilt for Electron $ev"
  Set-Location $DESKTOP
} catch { Write-WARN "Rebuild skipped - pre-built binary will be tried"; Set-Location $DESKTOP }

Write-Step "9" "Packaging NSIS installer..."
npm run dist 2>&1 | ForEach-Object {
  if ($_ -match "ERR!|error") { Write-Host "  $_" -ForegroundColor Red }
  elseif ($_ -match "wrote|success|dist") { Write-Host "  $_" -ForegroundColor Green }
  else { Write-Host "  $_" -ForegroundColor DarkGray }
}
if ($LASTEXITCODE -ne 0) { Write-ERR "Packaging failed - check output above" }

Set-Location $ROOT
$exes = Get-ChildItem (Join-Path $DESKTOP "release") -Filter "*.exe" -ErrorAction SilentlyContinue | Where-Object { $_.Name -notlike "*.blockmap" }

Write-Host ""
Write-Host "=======================================================" -ForegroundColor Green
Write-Host "  *  BUILD COMPLETE! *" -ForegroundColor Green
Write-Host "=======================================================" -ForegroundColor Green
foreach ($e in $exes) { Write-Host "  [PKG] $($e.Name) ($([math]::Round($e.Length/1MB,1)) MB)" -ForegroundColor White; Write-Host "     $($e.FullName)" -ForegroundColor DarkGray }
Write-Host ""
Write-Host "  After install: edit .env - set OPENROUTER_API_KEY" -ForegroundColor Cyan
Write-Host "  Free key: https://openrouter.ai" -ForegroundColor Yellow
Write-Host ""
