# EDITH Backend
## Enhanced Digital Intelligence & Trading Hub

Production-ready backend for EDITH — a personal, single-user AI-powered business platform running two income engines:

- **Engine 1 – Multi-Domain AI Freelancer** (13 specialised AI agents)
- **Engine 2 – Autonomous Dropshipping** (5 specialised AI agents)

---

## Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL 16+
- Redis 7+

### 1. Clone & Install
```bash
git clone <repo>
cd edith-backend
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Fill in all required values
```

### 3. Run Database Migration
```bash
npm run db:migrate
```

### 4. Start Development Server
```bash
npm run dev
```

### Docker (Recommended)
```bash
docker-compose up -d
```

---

## Architecture

```
edith-backend/
├── src/
│   ├── config/        # Env, constants, DB, Redis setup
│   ├── types/         # TypeScript interfaces
│   ├── db/            # Drizzle ORM schema + migrations
│   ├── middleware/    # Auth, rate limiter, error handler, validator
│   ├── routes/        # Express route definitions
│   ├── controllers/   # Request handlers
│   ├── services/      # Business logic + AI agents
│   ├── queues/        # BullMQ workers + schedulers
│   ├── webhooks/      # Stripe + Razorpay webhooks
│   └── utils/         # LLM client, scraper, logger
└── tests/
```

## API Base URL
All endpoints: `GET|POST|PUT|DELETE /api/v1/<resource>`

## Security
Single-user design. Protect with `x-api-key` header (set `API_KEY` in `.env`).

## Tech Stack
| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20 |
| Language | TypeScript (strict) |
| Framework | Express.js |
| Database | PostgreSQL + Drizzle ORM |
| Queue | BullMQ + Redis |
| AI | OpenRouter API |
| Payments | Stripe + Razorpay |
| Email | Resend |
| Storage | Supabase / S3 / R2 |
