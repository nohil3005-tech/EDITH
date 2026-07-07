# EDITH System Architecture

## Overview

EDITH is a single-user, dual-engine AI business platform. The architecture separates concerns cleanly between a rich React SPA (frontend) and a production Express API (backend).

```
┌─────────────────────────────────────────────────────────┐
│                    BROWSER / PWA                         │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  React 19 + TanStack Router + Tailwind v4        │   │
│  │                                                  │   │
│  │  Pages: Dashboard, Freelance, Dropshipping,      │   │
│  │         Invoices, Files, Agents, Analytics,      │   │
│  │         Marketplace, Settings                    │   │
│  │                                                  │   │
│  │  State: Zustand (persist → localStorage)         │   │
│  │  API:   src/lib/api.ts → fetch → backend         │   │
│  │  Auth:  Supabase client-side auth                │   │
│  └──────────────────────────────────────────────────┘   │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTP  x-api-key header
                        ▼
┌─────────────────────────────────────────────────────────┐
│               BACKEND  :4000  /api/v1/*                  │
│                                                          │
│  Express.js + TypeScript (strict)                        │
│                                                          │
│  Routes ──► Controllers ──► Services ──► DB/LLM/Storage  │
│                                                          │
│  ┌────────────┐  ┌────────────┐  ┌────────────────────┐ │
│  │  Freelance │  │ Dropshipping│  │    Payments        │ │
│  │  Engine    │  │  Engine    │  │  Stripe/Razorpay   │ │
│  └────────────┘  └────────────┘  └────────────────────┘ │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  18 AI Agents via OpenRouter                     │   │
│  │  (DeepSeek / GPT-4o / Gemini)                   │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  BullMQ Workers (10 queues, 24/7)                │   │
│  │  scraping · proposals · execution · validation   │   │
│  │  ads · optimization · email · payment            │   │
│  └──────────────────────────────────────────────────┘   │
└───────────────────────┬─────────────────────────────────┘
                        │
          ┌─────────────┼─────────────┐
          ▼             ▼             ▼
    PostgreSQL        Redis      OpenRouter
    (Drizzle ORM)   (BullMQ)    (LLM API)
                              
          ┌─────────────┬─────────────┐
          ▼             ▼             ▼
       Supabase/      Resend       Stripe /
       S3 / R2       (Email)      Razorpay
      (Storage)
```

---

## Frontend Architecture

### State Management

```
Zustand Store (edith-store)
├── profile          - User name, email, skills, hourly rate
├── paymentSettings  - Invoice prefix, currency, payment links
├── jobs[]           - Freelance job cards (from backend or mock)
├── proposals[]      - Proposal drafts + statuses
├── activeJobs[]     - Kanban board jobs
├── completed[]      - Completed work history
├── products[]       - Dropshipping products
├── stores[]         - Active dropshipping stores (mock)
├── invoices[]       - All invoices (created + synced)
├── files[]          - Uploaded files
├── agents[]         - AI agent statuses
├── chat[]           - Chat message history
├── alerts[]         - Dashboard attention items
├── activity[]       - Live activity feed
├── theme            - dark | light
└── automation{}     - Automation rule toggles
```

All state persists to `localStorage` via Zustand `persist` middleware.

### API Integration Layer

```
src/lib/api.ts          ← Central fetch client (adds x-api-key)
src/lib/apiStore.ts     ← Store-aware API actions (sync results → Zustand)
src/hooks/useApi.ts     ← React hooks with loading/error states
```

**Design principle:** Components use the local Zustand store for display (instant, offline-capable). Backend calls sync new data back into the store. This means the UI is never blocked waiting for API responses.

---

## Backend Architecture

### Request Flow

```
Request → Express Router
       → Auth Middleware (check x-api-key, attach default user)
       → Rate Limiter
       → Zod Validator
       → Controller
       → Service(s)
       → Database (Drizzle ORM) / LLM (OpenRouter) / External APIs
       → JSON Response { success, data, error?, meta? }
```

### AI Agent Pipeline

```
User Action / Queue Job
       ↓
AgentRegistry.get('agent-name')
       ↓
BaseAgent.run(action, input)
       ↓
LLMClient.chat(messages)   ← OpenRouter API
       ↓
Parse & validate JSON response
       ↓
Save to DB + log to agent_logs
       ↓
Return result
```

### Queue Architecture

```
BullMQ Queue → Worker → Service → DB
    ↑
Scheduler (repeating jobs every N hours)
    + Producers (on-demand from API handlers)
```

---

## Data Flow Examples

### 1. Job Scan
```
User clicks "New Job Scan"
  → POST /api/v1/freelance/jobs/scan
  → JobDiscoveryService.scan()
  → scraper.ts scrapes Upwork/Fiverr
  → LLM scores each job (aiScore, aiInsights)
  → Saved to freelance_jobs table
  → Response: { newJobs: N, jobs: [...] }
  → Frontend adds to Zustand jobs[]
  → UI updates instantly
```

### 2. Proposal Generation
```
User clicks "Generate Proposal" on job card
  → POST /api/v1/freelance/jobs/:id/proposals/generate
  → ProposalService.generate(jobId)
  → Fetches job from DB
  → LLM generates tailored proposal text
  → Saved to proposals table (status: 'draft')
  → Response: { id, draftText, bidAmount, deliveryDays }
  → Frontend adds draft to proposals[] in store
  → Proposal panel opens for review
```

### 3. Invoice Creation
```
User fills invoice modal
  → POST /api/v1/payment/invoice/generate
  → InvoiceService.generate({ clientName, items, ... })
  → Computes subtotal/tax/total
  → Generates invoice number (EDITH-2024-XXXX)
  → Saved to invoices table
  → Response: invoice object
  → Frontend adds to invoices[] in store
  → Table updates immediately
```

---

## Database Schema Overview

| Table | Purpose |
|-------|---------|
| `users` | Single default user + preferences |
| `freelance_jobs` | Scraped/discovered jobs with AI scores |
| `proposals` | AI-generated proposal drafts |
| `active_freelance_jobs` | Kanban board jobs |
| `freelance_deliveries` | Delivery records |
| `dropshipping_products` | Discovered products |
| `validation_results` | 5-step validation pipeline |
| `dropshipping_stores` | Active stores |
| `store_orders` | Order records |
| `ads` | Ad campaigns with ROAS |
| `payments` | Payment records |
| `invoices` | Invoice records |
| `payouts` | Payout requests |
| `agent_logs` | Every AI agent execution |
| `chat_sessions` | Chat conversation sessions |
| `chat_messages` | Individual chat messages |
| `files` | Uploaded file metadata |
| `marketplace_plugins` | Available plugins |
| `installed_plugins` | User's installed plugins |
| `referrals` | Referral tracking |
| `activity_log` | System activity log |

---

## Security Model

Since EDITH is a **single-user personal platform**:
- No multi-user auth on the backend
- Simple `x-api-key` header check (configurable via `API_KEY` env var)
- Default user ID `00000000-0000-0000-0000-000000000001` is hardcoded
- Supabase auth is used only on the frontend for the `/auth` page (optional)
- All backend routes are protected by the API key middleware
- Webhooks (Stripe/Razorpay) use signature verification

---

## Deployment

See `docs/deployment.md` for step-by-step deployment guides.
