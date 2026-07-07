# EDITH — Enhanced Digital Intelligence & Trading Hub
## Complete Full-Stack Software

**Single-user AI-powered business platform** with two income engines:
- 🤖 **Engine 1 — AI Freelancer:** 13 AI agents that find jobs, write proposals, execute work, QC check, and deliver
- 🛍️ **Engine 2 — Dropshipping:** 5 AI agents that find trending products, validate demand, build stores, run ads, and auto-optimize ROAS

---

## 📁 What's in This Folder

```
EDITH/
├── frontend/              React + Vite + Tailwind dashboard
├── backend/               Express + TypeScript API (PostgreSQL mode)
├── backend-sqlite-patches/ Patches to convert backend to SQLite (for desktop)
├── desktop/               Electron wrapper (builds Windows .exe)
├── frontend-patch/        Frontend patches for desktop mode
├── docs/                  Architecture & API reference
├── docker-compose.yml     One-command web stack
├── setup.sh / setup.bat   Auto-setup scripts
├── build.ps1              Build Windows desktop .exe
└── QUICK_START.md         Start here
```

---

## 🚀 Three Ways to Run EDITH

### Option A — Web App (Docker, easiest)
```bash
cp backend/.env.example backend/.env
# Add your OPENROUTER_API_KEY to backend/.env
docker-compose up --build -d
# Open http://localhost:3000
```

### Option B — Web App (Manual)
```bash
# Terminal 1
cd backend && npm install && npm run db:migrate && npm run dev

# Terminal 2
cd frontend && npm install && npm run dev
# Open http://localhost:5173
```

### Option C — Windows Desktop App (.exe installer)
```powershell
# In PowerShell from this folder:
.\build.ps1
# Install the .exe from desktop/release/
```

---

## 🔑 Only One Key Required

Add your OpenRouter API key to `backend/.env`:
```
OPENROUTER_API_KEY=sk-or-v1-your-key
```
Get a FREE key at: **https://openrouter.ai**

---

## 📚 More Docs
- `QUICK_START.md` — Detailed setup guide
- `docs/architecture.md` — System design
- `docs/api-reference.md` — All 60+ API endpoints
- `docs/deployment.md` — Production deployment
