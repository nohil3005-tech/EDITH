#!/usr/bin/env bash
set -e
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; CYAN='\033[0;36m'; NC='\033[0m'
ok()   { echo -e "${GREEN}  ✅ $1${NC}"; }
warn() { echo -e "${YELLOW}  ⚠️  $1${NC}"; }
err()  { echo -e "${RED}  ❌ $1${NC}"; exit 1; }

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║         EDITH — Auto Setup Script                    ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

node --version > /dev/null 2>&1 || err "Node.js not found. Install from https://nodejs.org"
ok "Node.js $(node --version)"

[ ! -f "$ROOT/backend/.env" ] && cp "$ROOT/backend/.env.example" "$ROOT/backend/.env" && warn "Created backend/.env — add your OPENROUTER_API_KEY"
[ ! -f "$ROOT/frontend/.env" ] && cp "$ROOT/frontend/.env.example" "$ROOT/frontend/.env" 2>/dev/null || true
[ ! -f "$ROOT/.env" ] && cp "$ROOT/backend/.env" "$ROOT/.env" && ok "Created root/.env"

echo ""
echo "Installing backend..."
cd "$ROOT/backend" && npm install --prefer-offline --silent && ok "Backend deps installed"

echo "Installing frontend..."
cd "$ROOT/frontend" && npm install --prefer-offline --silent && ok "Frontend deps installed"

echo ""
if command -v docker &>/dev/null; then
  echo "Starting PostgreSQL + Redis via Docker..."
  cd "$ROOT" && docker-compose up postgres redis -d 2>/dev/null
  sleep 3
  ok "PostgreSQL + Redis started"
else
  warn "Docker not found — start PostgreSQL and Redis manually"
fi

echo ""
echo "Running database migration..."
cd "$ROOT/backend"
node scripts/migrate.js && ok "Database ready" || warn "Migration failed — ensure PostgreSQL is running"

echo ""
echo "════════════════════════════════════════════════════"
echo -e "${GREEN}  🎉 Setup complete!${NC}"
echo ""
echo "  Start EDITH:"
echo "  Terminal 1: cd backend && npm run dev"
echo "  Terminal 2: cd frontend && npm run dev"
echo "  Open: http://localhost:5173"
echo ""
echo -e "${YELLOW}  ⚠️  Add OPENROUTER_API_KEY to backend/.env for AI features${NC}"
echo "  Free key at: https://openrouter.ai"
echo "════════════════════════════════════════════════════"
