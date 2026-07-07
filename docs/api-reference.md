# EDITH API Reference

Base URL: `http://localhost:4000/api/v1`  
Auth: `x-api-key: <your-api-key>` header on all requests.

All responses follow:
```json
{ "success": true, "data": { ... }, "meta": { "page": 1, "total": 50 } }
{ "success": false, "error": { "code": "ERROR_CODE", "message": "..." } }
```

---

## Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dashboard/summary` | KPIs: earnings, jobs, stores, agents |
| GET | `/dashboard/revenue-chart?period=30d` | Revenue timeseries |
| GET | `/dashboard/activities?limit=50` | Activity log |

---

## Freelance Engine

### Job Discovery
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/freelance/jobs/scan` | Trigger job scan across platforms |
| GET | `/freelance/jobs?status=new&page=1&limit=20` | List jobs |
| GET | `/freelance/jobs/:id` | Get single job |
| POST | `/freelance/jobs/:id/save` | Save a job |
| POST | `/freelance/jobs/:id/dismiss` | Dismiss a job |

### Proposals
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/freelance/jobs/:jobId/proposals/generate` | AI-generate proposal |
| GET | `/freelance/proposals?status=draft` | List proposals |
| PUT | `/freelance/proposals/:id` | Update proposal text/bid |
| POST | `/freelance/proposals/:id/send` | Mark as sent + email |

### Active Jobs (Kanban)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/freelance/active-jobs` | List all kanban cards |
| POST | `/freelance/active-jobs` | Create active job |
| PUT | `/freelance/active-jobs/:id/move` | Move to column |
| POST | `/freelance/active-jobs/:id/execute` | Run AI execution |
| POST | `/freelance/active-jobs/:id/qc` | Run QC check |
| POST | `/freelance/active-jobs/:id/deliver` | Mark delivered |
| GET | `/freelance/completed?format=csv` | Completed jobs |

---

## Dropshipping Engine

### Products
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/dropshipping/products/scan` | Scan for trending products |
| GET | `/dropshipping/products?sort=trending` | List products |
| GET | `/dropshipping/products/:id` | Get product |
| POST | `/dropshipping/products/:id/validate` | Start 5-step validation |
| GET | `/dropshipping/products/:id/validation-status` | Get validation steps |

### Stores
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/dropshipping/stores` | Build store for product |
| GET | `/dropshipping/stores` | List all stores |
| GET | `/dropshipping/stores/:id` | Get store details |
| PUT | `/dropshipping/stores/:id/settings` | Update store settings |
| POST | `/dropshipping/stores/:id/kill` | Kill underperforming store |

### Ads
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dropshipping/stores/:storeId/ads` | List store ads |
| POST | `/dropshipping/stores/:storeId/ads/generate` | AI-generate ad creatives |
| PUT | `/dropshipping/stores/:storeId/ads/:adId/pause` | Pause ad |
| PUT | `/dropshipping/stores/:storeId/ads/:adId/resume` | Resume ad |

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dropshipping/analytics/overview` | All-stores overview |
| GET | `/dropshipping/analytics/:storeId?period=30d` | Per-store analytics |

---

## Payments

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/payment/invoice/generate` | Create invoice |
| POST | `/payment/invoice/send` | Email invoice to client |
| GET | `/payment/invoice/:id` | Get invoice |
| GET | `/payment/invoices?status=sent` | List invoices |
| PUT | `/payment/invoice/:id/mark-paid` | Mark as paid |
| POST | `/payment/stripe/checkout` | Create Stripe session |
| POST | `/payment/razorpay/order` | Create Razorpay order |
| POST | `/payment/webhook/stripe` | Stripe webhook (public) |
| POST | `/payment/webhook/razorpay` | Razorpay webhook (public) |
| GET | `/payment/earnings?period=30d` | Earnings summary |
| GET | `/payment/earnings/freelance` | Freelance earnings |
| GET | `/payment/earnings/dropshipping` | Dropshipping earnings |
| GET | `/payment/transactions?page=1` | All transactions |
| GET | `/payment/payouts` | Payout history |
| POST | `/payment/payouts/request` | Request payout |

---

## Files

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/files/upload` | Upload file (multipart/form-data) |
| GET | `/files?folder=deliverables` | List files |
| GET | `/files/:id` | Get file metadata |
| DELETE | `/files/:id` | Delete file |
| POST | `/files/:id/share` | Create expiring share link |
| GET | `/files/download/:shareToken` | Download via share token (public) |

---

## AI Agents

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/agents` | List all 18 agents with stats |
| GET | `/agents/:id` | Get single agent |
| PUT | `/agents/:id/config` | Update agent config (model, temperature) |
| GET | `/agents/:id/logs?page=1` | Agent execution logs |
| POST | `/agents/:id/pause` | Pause agent |
| POST | `/agents/:id/resume` | Resume agent |

---

## Analytics & Reporting

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/analytics/profit-loss?period=30d` | P&L report |
| GET | `/analytics/agent-performance` | Agent success rates |
| GET | `/analytics/time-saved` | Automation hours saved |
| GET | `/analytics/projections` | Revenue projections |
| POST | `/analytics/export-report` | Export CSV/JSON report |

---

## Marketplace

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/marketplace/plugins?category=ai` | Browse plugins |
| GET | `/marketplace/plugins/:id` | Plugin details |
| POST | `/marketplace/plugins/:id/install` | Install plugin |
| DELETE | `/marketplace/plugins/:id/uninstall` | Uninstall |
| GET | `/marketplace/installed` | List installed plugins |
| PUT | `/marketplace/installed/:id/toggle` | Enable/disable |

---

## Referrals

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/referrals/stats` | Referral stats + code |
| GET | `/referrals/list` | All referral records |
| POST | `/referrals/withdraw` | Withdraw commission |

---

## Chat (AI Command Bar)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/chat/message` | Send message, get AI response |
| GET | `/chat/sessions` | List sessions |
| GET | `/chat/sessions/:id/messages` | Get session messages |
| DELETE | `/chat/sessions/:id` | Delete session |

**POST /chat/message body:**
```json
{
  "message": "scan jobs on upwork",
  "session_id": "uuid (optional)",
  "contextPage": "/freelance"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "uuid",
    "text": "✅ Scanned 23 jobs — found 8 new opportunities.",
    "commandType": "job_scan",
    "responseData": {
      "type": "job_cards",
      "cards": [{ "id": "...", "title": "...", "actions": [...] }]
    }
  }
}
```

---

## Intelligence

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/intelligence/insights` | Cross-engine AI insights |

---

## Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | System health (DB, Redis, queues, LLM) |

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "uptime": 3600,
    "checks": {
      "database": { "status": "ok", "latencyMs": 2 },
      "redis": { "status": "ok", "latencyMs": 1 },
      "openrouter": { "status": "ok" },
      "queues": { "status": "ok" }
    }
  }
}
```

---

## Auth / Profile

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/auth/profile` | Get user profile |
| PUT | `/auth/profile` | Update profile & preferences |
| PUT | `/auth/payment-settings` | Update payment settings |
| POST | `/auth/onboarding/complete` | Mark onboarding done |
| GET | `/auth/export-data` | Export all user data (JSON download) |
