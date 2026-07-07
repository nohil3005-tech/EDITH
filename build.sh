#!/usr/bin/env bash
set -e
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND="$ROOT/backend"; FRONTEND="$ROOT/frontend"; DESKTOP="$ROOT/desktop"
PATCHES="$ROOT/backend-sqlite-patches"; FPATCHES="$ROOT/frontend-patch"
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; CYAN='\033[0;36m'; NC='\033[0m'
ok()  { echo -e "  ${GREEN}✅ $1${NC}"; }
warn(){ echo -e "  ${YELLOW}⚠️  $1${NC}"; }
err() { echo -e "  ${RED}❌ $1${NC}"; exit 1; }

echo ""; echo "╔═══════════════════════════════════════════════╗"
echo "║   EDITH Desktop — Build Script (Mac/Linux)    ║"
echo "╚═══════════════════════════════════════════════╝"

node --version>/dev/null 2>&1 || err "Node.js not found"
ok "Node.js $(node --version)"
[ -d "$PATCHES" ]  || err "backend-sqlite-patches/ not found"
[ -d "$BACKEND" ]  || err "backend/ not found"
[ -d "$FRONTEND" ] || err "frontend/ not found"
[ -d "$DESKTOP" ]  || err "desktop/ not found"

echo -e "\n${CYAN}[1] Patching backend${NC}"
declare -A PM=(
  ["config/database.ts"]="src/config/database.ts"
  ["config/redis.ts"]="src/config/redis.ts"
  ["config/env.ts"]="src/config/env.ts"
  ["config/constants.ts"]="src/config/constants.ts"
  ["db/schema/index.ts"]="src/db/schema/index.ts"
  ["db/schema/payments.ts"]="src/db/schema/payments.ts"
  ["db/schema/freelance.ts"]="src/db/schema/freelance.ts"
  ["db/schema/dropshipping.ts"]="src/db/schema/dropshipping.ts"
  ["db/schema/logs.ts"]="src/db/schema/logs.ts"
  ["db/schema/users.ts"]="src/db/schema/users.ts"
  ["db/schema/files.ts"]="src/db/schema/files.ts"
  ["db/schema/chat.ts"]="src/db/schema/chat.ts"
  ["db/migrate.ts"]="src/db/migrate.ts"
  ["db/client.ts"]="src/db/client.ts"
  ["queues/inMemoryQueue.ts"]="src/queues/inMemoryQueue.ts"
  ["queues/scheduler.ts"]="src/queues/scheduler.ts"
  ["queues/workers.ts"]="src/queues/workers.ts"
  ["controllers/healthController.ts"]="src/controllers/healthController.ts"
  ["controllers/dashboardController.ts"]="src/controllers/dashboardController.ts"
  ["controllers/activeJobsController.ts"]="src/controllers/activeJobsController.ts"
  ["controllers/adminController.ts"]="src/controllers/adminController.ts"
  ["controllers/adsController.ts"]="src/controllers/adsController.ts"
  ["controllers/completedController.ts"]="src/controllers/completedController.ts"
  ["controllers/analyticsController.ts"]="src/controllers/analyticsController.ts"
  ["controllers/agentsController.ts"]="src/controllers/agentsController.ts"
  ["controllers/marketplaceController.ts"]="src/controllers/marketplaceController.ts"
  ["controllers/authController.ts"]="src/controllers/authController.ts"
  ["controllers/paymentController.ts"]="src/controllers/paymentController.ts"
  ["controllers/chatController.ts"]="src/controllers/chatController.ts"
  ["controllers/referralsController.ts"]="src/controllers/referralsController.ts"
  ["controllers/platformController.ts"]="src/controllers/platformController.ts"
  ["controllers/processorController.ts"]="src/controllers/processorController.ts"
  ["controllers/notificationController.ts"]="src/controllers/notificationController.ts"
  ["services/storage/StorageService.ts"]="src/services/storage/StorageService.ts"
  ["services/storage/FileManager.ts"]="src/services/storage/FileManager.ts"
  ["services/payment/PaymentService.ts"]="src/services/payment/PaymentService.ts"
  ["services/payment/InvoiceService.ts"]="src/services/payment/InvoiceService.ts"
  ["services/payment/PayoutTracker.ts"]="src/services/payment/PayoutTracker.ts"
  ["services/freelance/JobDiscoveryService.ts"]="src/services/freelance/JobDiscoveryService.ts"
  ["services/freelance/ExecutionService.ts"]="src/services/freelance/ExecutionService.ts"
  ["services/freelance/QCService.ts"]="src/services/freelance/QCService.ts"
  ["services/freelance/DeliveryService.ts"]="src/services/freelance/DeliveryService.ts"
  ["services/platform/PlatformAuthService.ts"]="src/services/platform/PlatformAuthService.ts"
  ["services/platform/UpworkScraper.ts"]="src/services/platform/UpworkScraper.ts"
  ["services/platform/FiverrScraper.ts"]="src/services/platform/FiverrScraper.ts"
  ["services/platform/FreelancerScraper.ts"]="src/services/platform/FreelancerScraper.ts"
  ["services/platform/PlatformIntegrationService.ts"]="src/services/platform/PlatformIntegrationService.ts"
  ["services/platform/PlatformPoller.ts"]="src/services/platform/PlatformPoller.ts"
  ["services/processor/FormatConverter.ts"]="src/services/processor/FormatConverter.ts"
  ["services/processor/ProcessorService.ts"]="src/services/processor/ProcessorService.ts"
  ["services/notification/PushNotificationService.ts"]="src/services/notification/PushNotificationService.ts"
  ["routes/freelance.ts"]="src/routes/freelance.ts"
  ["routes/platform.ts"]="src/routes/platform.ts"
  ["routes/processor.ts"]="src/routes/processor.ts"
  ["routes/notification.ts"]="src/routes/notification.ts"
  ["routes/index.ts"]="src/routes/index.ts"
  ["services/dropshipping/AnalyticsService.ts"]="src/services/dropshipping/AnalyticsService.ts"
  ["services/chat/ContextManager.ts"]="src/services/chat/ContextManager.ts"
  ["services/chat/ResponseGenerator.ts"]="src/services/chat/ResponseGenerator.ts"
  ["services/intelligence/CrossLearningService.ts"]="src/services/intelligence/CrossLearningService.ts"
  ["services/notification/NotificationService.ts"]="src/services/notification/NotificationService.ts"
  ["utils/scraper.ts"]="src/utils/scraper.ts"
  ["index.ts"]="src/index.ts"
  ["package.json"]="package.json"
  ["drizzle.config.ts"]="drizzle.config.ts"
  ["tsconfig.json"]="tsconfig.json"
)
for SRC in "${!PM[@]}"; do
  DST="${PM[$SRC]}"; S="$PATCHES/$SRC"; D="$BACKEND/$DST"
  [ -f "$S" ] && mkdir -p "$(dirname "$D")" && cp "$S" "$D" && ok "$DST" || warn "Not found: $SRC"
done
rm -rf "$BACKEND/src/queues/workers" "$BACKEND/src/queues/producers"

echo -e "\n${CYAN}[2] Backend npm install${NC}"
cd "$BACKEND" && npm install --prefer-offline --silent && ok "Backend deps installed"

echo -e "\n${CYAN}[3] Backend compile${NC}"
npx tsc --project tsconfig.json || npx tsc --project tsconfig.json --noEmitOnError false
[ -f "$BACKEND/dist/index.js" ] || err "Backend compile failed — dist/index.js not found"
ok "Backend compiled"

echo -e "\n${CYAN}[4] Frontend patches${NC}"
[ -f "$FPATCHES/api.desktop.ts" ]          && cp "$FPATCHES/api.desktop.ts"          "$FRONTEND/src/lib/api.ts" && ok "API client patched"
[ -f "$FPATCHES/vite.config.desktop.ts" ]  && cp "$FPATCHES/vite.config.desktop.ts"  "$FRONTEND/vite.config.ts" && ok "Vite config patched"

echo -e "\n${CYAN}[5] Frontend build${NC}"
cd "$FRONTEND"
[ ! -d node_modules ] && npm install --prefer-offline --silent
npm run build 2>&1 | tail -3
[ -f "$FRONTEND/dist/index.html" ] || err "Frontend build failed"
ok "Frontend built"

echo -e "\n${CYAN}[6] Electron install${NC}"
cd "$DESKTOP"
[ -f "$ROOT/.env" ] && cp "$ROOT/.env" "$DESKTOP/.env" && ok "Copied .env"
[ ! -f "$DESKTOP/.env" ] && printf "PORT=3001\nNODE_ENV=production\nAPI_KEY=edith-desktop-key\nOPENROUTER_API_KEY=PASTE_YOUR_KEY_HERE\n" > "$DESKTOP/.env" && warn "Created template .env"
npm install --prefer-offline --silent && ok "Electron installed"

echo -e "\n${CYAN}[7] Rebuild better-sqlite3${NC}"
EV=$(node -e "console.log(require('./node_modules/electron/package.json').version)" 2>/dev/null||echo "")
if [ -n "$EV" ]; then
  cd "$BACKEND"
  export npm_config_target="$EV" npm_config_arch="x64" npm_config_runtime="electron"
  export npm_config_disturl="https://electronjs.org/headers" npm_config_build_from_source="true"
  npm rebuild better-sqlite3 2>&1|tail -2 || warn "Rebuild failed — pre-built binary will be used"
  ok "better-sqlite3 ready for Electron $EV"; cd "$DESKTOP"
else warn "Could not detect Electron version — skipping rebuild"; fi

echo -e "\n${CYAN}[8] Packaging...${NC}"
npm run dist 2>&1 | grep -E "•|✔|error|wrote" | head -15

echo ""; echo "════════════════════════════════════════════"
echo -e "${GREEN}  🎉 BUILD COMPLETE!${NC}"
find "$DESKTOP/release" \( -name "*.exe" -o -name "*.dmg" -o -name "*.AppImage" \) 2>/dev/null | while read f; do
  echo -e "  📦 ${GREEN}$(basename "$f")${NC} ($(du -sh "$f"|cut -f1))"; echo "     $f"
done
echo ""; echo "  Add OPENROUTER_API_KEY to .env → restart EDITH"
echo "  Free key: https://openrouter.ai"; echo ""
