# EDITH Desktop — Complete Step-by-Step Conversion Guide

## What This Does

Transforms EDITH from a web app requiring PostgreSQL + Redis + Docker into
a **private Windows desktop app** (.exe installer) that:

- Double-click to open — no terminal, no browser required
- SQLite database stored in `%APPDATA%\EDITH\edith.db`
- No PostgreSQL, no Redis, no Docker
- All data stays on YOUR machine
- Only external connection: OpenRouter AI API (when you use AI features)

---

## Prerequisites (Install These First)

| Tool | Download | Why |
|------|----------|-----|
| Node.js 20 LTS | https://nodejs.org | Runs everything |
| Git (optional) | https://git-scm.com | Version control |

**That's it.** No Docker, no PostgreSQL, no Redis needed.

---

## Folder Structure After Setup

```
EDITH-FULLSTACK/              ← Your existing project
EDITH-DESKTOP/                ← This package (place next to it)
  ├── backend-sqlite-patches/  ← Files that replace backend postgres/redis code
  │   ├── config/database.ts   → SQLite database client
  │   ├── config/redis.ts      → Redis stub (no-op)
  │   ├── config/env.ts        → Updated env config
  │   ├── db/schema/index.ts   → SQLite Drizzle schema
  │   ├── db/migrate.ts        → Auto-migration script
  │   ├── queues/              → In-memory queue (replaces BullMQ)
  │   ├── index.ts             → New entry point (prints BACKEND_READY)
  │   ├── package.json         → Updated deps (no bullmq, no ioredis)
  │   └── drizzle.config.ts    → SQLite drizzle config
  ├── desktop/                 ← Electron wrapper
  │   ├── main.js              → Electron main process
  │   ├── preload.js           → IPC bridge
  │   ├── package.json         → electron + electron-builder
  │   ├── .env                 → Config shipped with installer
  │   └── assets/
  │       ├── icon.ico         → App icon (replace with yours)
  │       ├── LICENSE.txt      → Required by NSIS
  │       └── installer.nsh    → NSIS custom installer script
  ├── frontend-patch/
  │   ├── api.desktop.ts       → Updated API client for desktop
  │   └── vite.config.desktop.ts → Updated Vite config
  ├── build.ps1                ← Windows build script (ONE command)
  ├── build.sh                 ← Mac/Linux build script
  └── STEP_BY_STEP_GUIDE.md   ← This file
```

---

## Step 1 — Place the EDITH-DESKTOP folder

Extract `EDITH-DESKTOP.zip` so it sits **next to** `EDITH-FULLSTACK`:

```
C:\Projects\
  EDITH-FULLSTACK\    ← your existing project
  EDITH-DESKTOP\      ← this package
```

Or copy everything inside `EDITH-DESKTOP\` directly **into** `EDITH-FULLSTACK\`.
The build script uses `..` relative paths to find the project.

**Recommended: Copy into the same folder:**
```
C:\Projects\EDITH-FULLSTACK\
  backend\
  frontend\
  backend-sqlite-patches\   ← copy from EDITH-DESKTOP
  desktop\                  ← copy from EDITH-DESKTOP
  frontend-patch\           ← copy from EDITH-DESKTOP
  build.ps1                 ← copy from EDITH-DESKTOP
  build.sh                  ← copy from EDITH-DESKTOP
```

---

## Step 2 — Add Your OpenRouter API Key

Open `EDITH-FULLSTACK\desktop\.env` in Notepad and set:

```
OPENROUTER_API_KEY=sk-or-v1-your-real-key-here
```

Get a free key at: **https://openrouter.ai** (sign up → API Keys → Create key)

---

## Step 3 — Add an App Icon (Optional but Recommended)

1. Create or download a 256×256 PNG image for your app
2. Convert it to .ico format at: **https://convertio.co/png-ico/**
3. Save as: `desktop\assets\icon.ico`

If you skip this, the build script creates a placeholder icon automatically.

---

## Step 4 — Run the Build (ONE COMMAND)

Open **PowerShell** in the `EDITH-FULLSTACK` folder and run:

```powershell
.\build.ps1
```

This single command will:
1. Copy all SQLite patch files over the backend
2. `npm install` in backend (with better-sqlite3 instead of pg/bullmq)
3. Compile TypeScript → `backend/dist/`
4. Copy desktop API client + Vite config to frontend
5. Build React app → `frontend/dist/`
6. `npm install` Electron + electron-builder
7. Package everything into a Windows installer

**Wait 3–8 minutes.** You'll see output like:
```
[1] Applying SQLite patches to backend
  ✅ Patched: backend/src/config/database.ts
  ✅ Patched: backend/src/config/redis.ts
  ...
[8] Building Windows installer (.exe)
  ✅ EDITH Setup 1.0.0.exe  (142 MB)
     C:\Projects\EDITH-FULLSTACK\desktop\release\EDITH Setup 1.0.0.exe
```

---

## Step 5 — Install and Run

1. Go to `desktop\release\`
2. Double-click **`EDITH Setup 1.0.0.exe`**
3. Follow the installer (you can choose install directory)
4. EDITH will launch automatically after install
5. Find the **EDITH icon** in your system tray (bottom-right of taskbar)
6. Double-click it to open the dashboard

---

## Step 6 — Configure After Install

The `.env` file is installed at:
```
C:\Program Files\EDITH\.env
```
(or wherever you chose to install)

Open it with Notepad and ensure:
```
OPENROUTER_API_KEY=sk-or-v1-your-real-key
```
is set. **Restart EDITH after saving.**

---

## Where Your Data Is Stored

| Item | Location |
|------|----------|
| Database | `%APPDATA%\EDITH\edith.db` |
| Uploaded files | `%APPDATA%\EDITH\uploads\` |
| Configuration | `C:\Program Files\EDITH\.env` |
| Logs | `%APPDATA%\EDITH\logs\` |

To open the data folder: right-click EDITH tray icon → **Open Data Folder**

---

## Daily Usage

1. EDITH starts with Windows if you set it to (or launch from Start Menu / Desktop)
2. The backend starts automatically in the background (no terminal window)
3. The dashboard opens in the EDITH window (not your browser)
4. Close the window → EDITH minimizes to system tray (still running)
5. Quit fully: right-click tray icon → **Quit EDITH**

---

## Troubleshooting

### "Cannot find backend at..."
Run the build script again. The `backend/dist/` folder is missing.

### "BACKEND_READY never received"
- Check your `.env` file — ensure `OPENROUTER_API_KEY` is set
- Look for errors in the console (during dev mode: `npm run dev` in desktop/)

### "better-sqlite3 failed to load"
The native module needs to be rebuilt for your Electron version:
```powershell
cd backend
npx @electron/rebuild -f -m . 
```

### "npm run build fails in backend"
```powershell
cd backend
# Check TypeScript errors:
npx tsc --noEmit
```

### "Frontend shows blank screen"
The `base: './'` in vite.config.desktop.ts is required.
Ensure the desktop Vite config was applied before building frontend.

### AI features not working
Set `OPENROUTER_API_KEY` in your `.env` and restart EDITH.
Test at: `http://localhost:3001/api/v1/health`

---

## Rebuilding After Code Changes

If you change any backend code:
```powershell
cd backend && npm run build
```
Then restart EDITH.

If you change frontend code:
```powershell
cd frontend && npm run build
```
Then restart EDITH (it loads from `frontend/dist/` directly).

To create a new installer after any changes:
```powershell
.\build.ps1
```

---

## Uninstall

Use Windows Settings → Apps → EDITH → Uninstall

The uninstaller will ask if you want to delete your data (`%APPDATA%\EDITH\`).
Choose **No** to keep your database, invoices, and files.
Choose **Yes** to remove everything.

---

## Privacy Guarantee

- All your data stays in `%APPDATA%\EDITH\` on your computer
- The app NEVER phones home or sends telemetry
- The ONLY external connections are:
  - **OpenRouter** (`openrouter.ai`) — your AI API calls (requires your key)
  - **Stripe/Razorpay** — only if you configure payment keys
  - **Resend** — only if you configure email keys
- No analytics, no crash reporting, no cloud sync

---

## Complete File Change Summary

### Files REPLACED in backend:

| Original File | Replaced With | Change |
|--------------|---------------|--------|
| `src/config/database.ts` | SQLite client | PostgreSQL → better-sqlite3 |
| `src/config/redis.ts` | Redis stub | ioredis → in-memory no-op |
| `src/config/env.ts` | Desktop env | Removes DB_URL, adds SQLITE_PATH |
| `src/db/schema/index.ts` | SQLite schema | pgTable → sqliteTable |
| `src/index.ts` | Desktop entry | Adds migration, prints BACKEND_READY |
| `package.json` | SQLite deps | Removes pg/bullmq/ioredis, adds better-sqlite3 |
| `drizzle.config.ts` | SQLite config | dialect: postgresql → sqlite |

### Files ADDED to backend:
| New File | Purpose |
|---------|---------|
| `src/db/migrate.ts` | Auto-creates all tables on first launch |
| `src/queues/inMemoryQueue.ts` | Lightweight queue replacing BullMQ |
| `src/queues/workers.ts` | All workers in one file, no Redis |

### Files REPLACED in frontend:
| Original | Replaced With | Change |
|---------|---------------|--------|
| `src/lib/api.ts` | `api.desktop.ts` | Uses localhost:3001, reads from Electron preload |
| `vite.config.ts` | `vite.config.desktop.ts` | base:'./', injects desktop env vars |

### New desktop/ folder (Electron wrapper):
| File | Purpose |
|-----|---------|
| `desktop/main.js` | Spawns backend, opens window, manages tray |
| `desktop/preload.js` | Exposes safe IPC to frontend |
| `desktop/package.json` | Electron + electron-builder config |
| `desktop/.env` | Ships inside installer |
| `desktop/assets/` | Icon, license, NSIS scripts |
