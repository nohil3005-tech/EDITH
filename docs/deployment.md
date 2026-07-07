# EDITH Deployment Guide

## Option 1: Local Development (Recommended First)

```bash
# 1. Start services
docker-compose -f docker-compose.yml up postgres redis -d

# 2. Backend
cd backend
cp .env.example .env     # Fill in OPENROUTER_API_KEY at minimum
npm install
npm run db:migrate
npm run dev              # http://localhost:4000

# 3. Frontend (new terminal)
cd frontend
cp .env.example .env     # Set VITE_API_BASE_URL=http://localhost:4000
npm install
npm run dev              # http://localhost:5173
```

---

## Option 2: Full Docker (Easiest)

```bash
# From project root
cp backend/.env.example .env

# Edit .env — at minimum set:
# OPENROUTER_API_KEY=sk-or-v1-...
# API_KEY=your-secret-key
# SUPABASE_URL=...
# SUPABASE_PUBLISHABLE_KEY=...

docker-compose up --build -d

# Frontend: http://localhost:3000
# Backend API: http://localhost:4000
# Adminer (DB GUI): add to docker-compose if needed
```

---

## Option 3: Cloud Deployment

### Backend → Railway

1. Create new Railway project
2. Add PostgreSQL plugin → copy `DATABASE_URL`
3. Add Redis plugin → copy `REDIS_URL`
4. Deploy from GitHub → `backend/` folder
5. Set all environment variables in Railway dashboard
6. Set `PORT=4000` and `NODE_ENV=production`

```bash
# Railway CLI
railway login
cd backend
railway up
```

### Backend → Render

```yaml
# render.yaml (place in backend/)
services:
  - type: web
    name: edith-api
    env: node
    buildCommand: npm install && npm run build
    startCommand: node dist/index.js
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: edith-db
          property: connectionString
```

### Frontend → Vercel

```bash
cd frontend
npm install -g vercel
vercel
# Set env vars:
#   VITE_API_BASE_URL = https://your-api.railway.app
#   VITE_API_KEY = your-api-key
#   VITE_SUPABASE_URL = ...
#   VITE_SUPABASE_PUBLISHABLE_KEY = ...
```

### Frontend → Cloudflare Pages

```bash
# wrangler.jsonc already configured in frontend/
cd frontend
npm run build
wrangler pages deploy dist
```

---

## Environment Variable Checklist

### Backend (Required)
- [x] `DATABASE_URL` — PostgreSQL connection string
- [x] `REDIS_URL` — Redis connection string
- [x] `OPENROUTER_API_KEY` — Get from openrouter.ai
- [x] `API_KEY` — Any random secret (min 16 chars)

### Backend (Optional but recommended)
- [ ] `STRIPE_SECRET_KEY` — For Stripe payments
- [ ] `STRIPE_WEBHOOK_SECRET` — For payment webhooks
- [ ] `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET` — For Razorpay
- [ ] `RESEND_API_KEY` — For sending emails
- [ ] `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` — For Supabase storage
- [ ] `STORAGE_PROVIDER` — `supabase` | `s3` | `r2` | `local`

### Frontend (Required)
- [x] `VITE_API_BASE_URL` — Your backend URL
- [x] `VITE_API_KEY` — Same as backend `API_KEY`
- [x] `VITE_SUPABASE_URL` — Your Supabase project URL
- [x] `VITE_SUPABASE_PUBLISHABLE_KEY` — Supabase anon key

---

## Post-Deployment Checklist

```bash
# 1. Verify backend health
curl https://your-api.com/api/v1/health

# Expected:
# { "success": true, "data": { "status": "healthy", ... } }

# 2. Test AI agent
curl -X POST https://your-api.com/api/v1/chat/message \
  -H "x-api-key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"message": "scan jobs"}'

# 3. Run a job scan
curl -X POST https://your-api.com/api/v1/freelance/jobs/scan \
  -H "x-api-key: your-api-key"

# 4. Check queues are running
curl https://your-api.com/api/v1/health | jq .data.checks.queues
```

---

## Database Maintenance

```bash
# View DB with Drizzle Studio
cd backend
npm run db:studio    # Opens at https://local.drizzle.studio

# Run fresh migration
npm run db:migrate

# Seed default user (already in 001_initial.sql)
psql $DATABASE_URL -c "SELECT id, email FROM users;"
```

---

## Troubleshooting

### "Cannot connect to Redis"
- Ensure Redis is running: `redis-cli ping`
- BullMQ workers will fail silently — check logs

### "LLM requests failing"
- Check `OPENROUTER_API_KEY` is valid
- Test: `curl https://openrouter.ai/api/v1/models -H "Authorization: Bearer $KEY"`

### "Frontend shows no data"
- Check browser console for CORS errors
- Verify `VITE_API_BASE_URL` matches backend port
- Verify `VITE_API_KEY` matches backend `API_KEY`

### "Supabase auth not working"
- The app works fully without Supabase auth (single-user mode)
- Only needed if you want the `/auth` login page to work
- Frontend falls back gracefully when Supabase is not configured
