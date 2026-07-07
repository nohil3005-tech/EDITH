-- ============================================================
--  EDITH – Initial Database Migration
--  001_initial.sql
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── users ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  supabase_id TEXT,
  profile JSONB NOT NULL DEFAULT '{}',
  preferences JSONB NOT NULL DEFAULT '{}',
  payment_settings JSONB NOT NULL DEFAULT '{}',
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default user
INSERT INTO users (id, email, profile, preferences, payment_settings, onboarding_completed)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'admin@edith.local',
  '{"name":"EDITH Operator","bio":null,"avatar":null,"timezone":"UTC","website":null,"skills":[],"hourlyRate":null,"portfolio":[]}',
  '{"language":"en","currency":"USD","theme":"dark","notifications":{"email":true,"newJobs":true,"proposalAccepted":true,"paymentReceived":true,"adPerformance":true},"aiDefaults":{"model":"deepseek/deepseek-chat","proposalTone":"professional","autoSendProposals":false,"autoExecute":false,"budgetThreshold":100}}',
  '{"stripeEnabled":false,"razorpayEnabled":false,"paymentLink":null,"defaultCurrency":"USD","taxRate":0,"bankAccount":null,"invoiceSettings":{"companyName":"EDITH","address":"","logo":null,"defaultDueDays":14,"termsAndConditions":"","footer":null}}',
  FALSE
) ON CONFLICT (id) DO NOTHING;

-- ─── activity_log ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at DESC);

-- ─── freelance_jobs ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS freelance_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_platform TEXT NOT NULL,
  external_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  budget_min NUMERIC(12,2),
  budget_max NUMERIC(12,2),
  client_rating REAL,
  deadline TIMESTAMPTZ,
  tags TEXT[] NOT NULL DEFAULT '{}',
  ai_score REAL,
  ai_insights JSONB,
  status TEXT NOT NULL DEFAULT 'new',
  raw_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_freelance_jobs_source ON freelance_jobs(source_platform, external_id);
CREATE INDEX IF NOT EXISTS idx_freelance_jobs_user_status ON freelance_jobs(user_id, status);
CREATE INDEX IF NOT EXISTS idx_freelance_jobs_ai_score ON freelance_jobs(ai_score DESC NULLS LAST);

-- ─── proposals ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS proposals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES freelance_jobs(id) ON DELETE CASCADE,
  draft_text TEXT NOT NULL DEFAULT '',
  final_text TEXT,
  bid_amount NUMERIC(12,2),
  delivery_days INTEGER,
  portfolio_items JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft',
  human_modified_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_proposals_job_id ON proposals(job_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);

-- ─── active_freelance_jobs ────────────────────────────────────
CREATE TABLE IF NOT EXISTS active_freelance_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES freelance_jobs(id) ON DELETE CASCADE,
  proposal_id UUID REFERENCES proposals(id),
  "column" TEXT NOT NULL DEFAULT 'planning',
  subtasks JSONB NOT NULL DEFAULT '[]',
  qc_results JSONB,
  delivery_files JSONB NOT NULL DEFAULT '[]',
  delivery_message TEXT,
  client_rating REAL,
  feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_active_jobs_user_id ON active_freelance_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_active_jobs_column ON active_freelance_jobs("column");

-- ─── freelance_deliveries ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS freelance_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  active_job_id UUID NOT NULL REFERENCES active_freelance_jobs(id) ON DELETE CASCADE,
  files JSONB NOT NULL DEFAULT '[]',
  delivery_message TEXT NOT NULL DEFAULT '',
  client_response TEXT,
  revision_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── dropshipping_products ────────────────────────────────────
CREATE TABLE IF NOT EXISTS dropshipping_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  cost_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  target_sell_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'general',
  trending_score REAL NOT NULL DEFAULT 0,
  trend_data JSONB,
  validation_status TEXT NOT NULL DEFAULT 'pending',
  ai_score REAL,
  images TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ds_products_user_id ON dropshipping_products(user_id);
CREATE INDEX IF NOT EXISTS idx_ds_products_trending ON dropshipping_products(trending_score DESC);

-- ─── validation_results ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS validation_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES dropshipping_products(id) ON DELETE CASCADE,
  step_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  result_data JSONB,
  completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_validation_results_product_id ON validation_results(product_id);

-- ─── dropshipping_stores ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS dropshipping_stores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES dropshipping_products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  domain TEXT,
  platform TEXT NOT NULL DEFAULT 'shopify',
  settings JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_stores_user_id ON dropshipping_stores(user_id);
CREATE INDEX IF NOT EXISTS idx_stores_status ON dropshipping_stores(status);

-- ─── store_orders ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS store_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES dropshipping_stores(id) ON DELETE CASCADE,
  order_data JSONB NOT NULL DEFAULT '{}',
  revenue NUMERIC(12,2) NOT NULL DEFAULT 0,
  cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  placed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_store_orders_store_id ON store_orders(store_id);

-- ─── ads ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES dropshipping_stores(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  creative_type TEXT NOT NULL DEFAULT 'image',
  ad_name TEXT NOT NULL,
  spend NUMERIC(12,2) NOT NULL DEFAULT 0,
  revenue NUMERIC(12,2) NOT NULL DEFAULT 0,
  roas REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ads_store_id ON ads(store_id);
CREATE INDEX IF NOT EXISTS idx_ads_status ON ads(status);

-- ─── payments ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  gateway_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
  platform_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_amount NUMERIC(12,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  gateway TEXT NOT NULL,
  gateway_payment_id TEXT,
  currency TEXT NOT NULL DEFAULT 'USD',
  customer_email TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_gateway_payment_id ON payments(gateway_payment_id);

-- ─── invoices ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES payments(id),
  invoice_number TEXT NOT NULL UNIQUE,
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  client_address TEXT,
  items JSONB NOT NULL DEFAULT '[]',
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  payment_link TEXT,
  notes TEXT,
  pdf_url TEXT,
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_client_email ON invoices(client_email);

-- ─── payouts ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  source_gateway TEXT NOT NULL,
  destination_bank TEXT,
  destination_account_last4 TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  reference_id TEXT,
  initiated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ─── agent_logs ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL,
  action TEXT NOT NULL,
  input JSONB NOT NULL DEFAULT '{}',
  output JSONB,
  error TEXT,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_agent_logs_user_id ON agent_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_agent_name ON agent_logs(agent_name);
CREATE INDEX IF NOT EXISTS idx_agent_logs_created_at ON agent_logs(created_at DESC);

-- ─── chat_sessions ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New Conversation',
  context_page TEXT,
  message_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);

-- ─── chat_messages ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  command_type TEXT,
  response_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);

-- ─── files ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL DEFAULT 0,
  storage_provider TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  public_url TEXT,
  folder TEXT NOT NULL DEFAULT 'general',
  tags TEXT[] NOT NULL DEFAULT '{}',
  download_count INTEGER NOT NULL DEFAULT 0,
  share_token TEXT UNIQUE,
  share_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id);
CREATE INDEX IF NOT EXISTS idx_files_folder ON files(folder);
CREATE INDEX IF NOT EXISTS idx_files_share_token ON files(share_token);

-- ─── marketplace_plugins ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS marketplace_plugins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  author TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '1.0.0',
  price INTEGER NOT NULL DEFAULT 0,
  rating INTEGER NOT NULL DEFAULT 0,
  installs INTEGER NOT NULL DEFAULT 0,
  icon_url TEXT,
  screenshots TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed marketplace plugins
INSERT INTO marketplace_plugins (id, name, category, description, author, version, price, rating, installs, icon_url) VALUES
  (uuid_generate_v4(), 'Upwork Pro Scraper', 'scraper', 'Advanced Upwork job scraping with filters', 'EDITH Labs', '2.1.0', 0, 48, 1240, null),
  (uuid_generate_v4(), 'Fiverr Radar', 'scraper', 'Find trending Fiverr gig opportunities', 'EDITH Labs', '1.5.0', 0, 42, 980, null),
  (uuid_generate_v4(), 'Stripe Advanced', 'payment', 'Multi-currency Stripe integration', 'EDITH Labs', '3.0.0', 0, 50, 2100, null),
  (uuid_generate_v4(), 'TikTok Trend Tracker', 'analytics', 'Track viral product trends on TikTok', 'EDITH Labs', '1.2.0', 999, 45, 750, null),
  (uuid_generate_v4(), 'AliExpress Connect', 'sourcing', 'Direct AliExpress product sourcing', 'EDITH Labs', '2.0.0', 0, 46, 1500, null),
  (uuid_generate_v4(), 'GPT-4o Vision Agent', 'ai', 'Visual content analysis and generation', 'EDITH Labs', '1.0.0', 1999, 49, 430, null)
ON CONFLICT DO NOTHING;

-- ─── installed_plugins ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS installed_plugins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plugin_id UUID NOT NULL REFERENCES marketplace_plugins(id) ON DELETE CASCADE,
  enabled TEXT NOT NULL DEFAULT 'true',
  config JSONB NOT NULL DEFAULT '{}',
  installed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, plugin_id)
);

-- ─── referrals ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_email TEXT NOT NULL,
  referral_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  commission_earned NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Updated-at trigger ───────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_freelance_jobs_updated_at ON freelance_jobs;
CREATE TRIGGER trg_freelance_jobs_updated_at BEFORE UPDATE ON freelance_jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_proposals_updated_at ON proposals;
CREATE TRIGGER trg_proposals_updated_at BEFORE UPDATE ON proposals FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_active_jobs_updated_at ON active_freelance_jobs;
CREATE TRIGGER trg_active_jobs_updated_at BEFORE UPDATE ON active_freelance_jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_ds_products_updated_at ON dropshipping_products;
CREATE TRIGGER trg_ds_products_updated_at BEFORE UPDATE ON dropshipping_products FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_stores_updated_at ON dropshipping_stores;
CREATE TRIGGER trg_stores_updated_at BEFORE UPDATE ON dropshipping_stores FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_ads_updated_at ON ads;
CREATE TRIGGER trg_ads_updated_at BEFORE UPDATE ON ads FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_chat_sessions_updated_at ON chat_sessions;
CREATE TRIGGER trg_chat_sessions_updated_at BEFORE UPDATE ON chat_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at();

