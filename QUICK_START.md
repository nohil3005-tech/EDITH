# EDITH — Quick Start (Pick Your Method)

---

## METHOD 1: Web App with Docker (Recommended, 5 minutes)

### Prerequisites
- Docker Desktop running: https://docker.com/products/docker-desktop
- Node.js 20+: https://nodejs.org

### Steps

```bash
# 1. Configure (required)
cp backend/.env.example backend/.env
nano backend/.env   # or open in any text editor

# Set this line with your free key from https://openrouter.ai:
OPENROUTER_API_KEY=sk-or-v1-your-key-here

# 2. Start everything
docker-compose up --build -d

# 3. Open EDITH
# http://localhost:3000
```

✅ Done. EDITH runs at **http://localhost:3000**

---

## METHOD 2: Web App without Docker

### Prerequisites
- Node.js 20+
- PostgreSQL 16+ running locally
- Redis 7+ running locally

### Steps

```bash
# 1. Configure backend
cp backend/.env.example backend/.env
# Edit backend/.env — set:
#   DATABASE_URL=postgresql://postgres:password@localhost:5432/edith
#   OPENROUTER_API_KEY=sk-or-v1-your-key

# 2. Configure frontend
cp frontend/.env.example frontend/.env
# frontend/.env already pre-configured for local dev

# 3. Run backend
cd backend
npm install
npm run db:migrate
npm run dev
# Backend runs at http://localhost:4000

# 4. Run frontend (new terminal)
cd frontend
npm install
npm run dev
# Frontend runs at http://localhost:5173
```

✅ Open **http://localhost:5173**

---

## METHOD 3: Windows Desktop App (.exe)

### Prerequisites
- Node.js 20+
- Windows 10/11

### Steps

```powershell
# From this folder in PowerShell:
.\build.ps1

# Wait 5-8 minutes.
# Installer appears at: desktop\release\EDITH Setup 1.0.0.exe

# After install, edit .env in the install folder:
# C:\Program Files\EDITH\.env
# Set: OPENROUTER_API_KEY=sk-or-v1-your-key
```

✅ EDITH runs as a native Windows app with no browser/terminal needed.

---

## ⚙️ Key Environment Variables

| Variable | Where | Required | Description |
|----------|-------|----------|-------------|
| `OPENROUTER_API_KEY` | `backend/.env` | ✅ YES | AI features. Free at openrouter.ai |
| `DATABASE_URL` | `backend/.env` | Web only | PostgreSQL connection string |
| `API_KEY` | `backend/.env` | Recommended | Your secret key for security |
| `VITE_API_KEY` | `frontend/.env` | Must match | Same as API_KEY above |
| `STRIPE_SECRET_KEY` | `backend/.env` | Optional | Online payments |
| `RESEND_API_KEY` | `backend/.env` | Optional | Email sending |

---

## 🛠 Troubleshooting

| Problem | Fix |
|---------|-----|
| AI not working | Set `OPENROUTER_API_KEY` in `backend/.env` |
| Can't connect to database | Run `docker-compose up postgres -d` |
| Frontend blank page | Check browser console (F12) |
| Port 4000 busy | Change `PORT=4001` in `backend/.env` |
| 401 errors | Make sure `VITE_API_KEY` = `API_KEY` in .env files |

---

## 🗄 Database

All your data is stored in PostgreSQL (web mode) or SQLite (desktop mode):
- **Web:** `%APPDATA%\EDITH\edith.db` (desktop) or PostgreSQL (web)
- **Desktop:** `%APPDATA%\EDITH\edith.db`

Backup web database: `docker exec edith-postgres pg_dump -U postgres edith > backup.sql`
