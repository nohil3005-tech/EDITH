/**
 * EDITH Desktop — SQLite Auto-Migration
 * Creates all tables and seeds default user on first launch.
 * Safe to run multiple times (uses CREATE TABLE IF NOT EXISTS).
 */

import Database from 'better-sqlite3';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { logger } from '../utils/logger';
import { DEFAULT_USER_ID } from '../config/constants';

function getDbPath(): string {
  if (process.env.SQLITE_PATH) return process.env.SQLITE_PATH;

  const appData =
    process.env.APPDATA ||
    (process.platform === 'darwin'
      ? join(process.env.HOME!, 'Library', 'Application Support')
      : join(process.env.HOME!, '.config'));

  const edithDir = join(appData, 'EDITH');
  if (!existsSync(edithDir)) mkdirSync(edithDir, { recursive: true });
  return join(edithDir, 'edith.db');
}

const MIGRATION_SQL = `
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA foreign_keys = ON;

-- users
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  supabase_id TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  status TEXT NOT NULL DEFAULT 'active',
  profile TEXT NOT NULL DEFAULT '{}',
  preferences TEXT NOT NULL DEFAULT '{}',
  payment_settings TEXT NOT NULL DEFAULT '{}',
  onboarding_completed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- activity_log
CREATE TABLE IF NOT EXISTS activity_log (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_activity_log_user ON activity_log(user_id);

-- freelance_jobs
CREATE TABLE IF NOT EXISTS freelance_jobs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_platform TEXT NOT NULL,
  external_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  budget_min REAL,
  budget_max REAL,
  client_rating REAL,
  deadline TEXT,
  tags TEXT NOT NULL DEFAULT '[]',
  ai_score REAL,
  ai_insights TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  raw_data TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_freelance_jobs_source ON freelance_jobs(source_platform, external_id);
CREATE INDEX IF NOT EXISTS idx_freelance_jobs_status ON freelance_jobs(user_id, status);

-- proposals
CREATE TABLE IF NOT EXISTS proposals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id TEXT NOT NULL REFERENCES freelance_jobs(id) ON DELETE CASCADE,
  draft_text TEXT NOT NULL DEFAULT '',
  final_text TEXT,
  bid_amount REAL,
  delivery_days INTEGER,
  portfolio_items TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft',
  human_modified_at TEXT,
  sent_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- active_freelance_jobs
CREATE TABLE IF NOT EXISTS active_freelance_jobs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id TEXT NOT NULL REFERENCES freelance_jobs(id) ON DELETE CASCADE,
  proposal_id TEXT REFERENCES proposals(id),
  column_name TEXT NOT NULL DEFAULT 'planning',
  subtasks TEXT NOT NULL DEFAULT '[]',
  qc_results TEXT,
  delivery_files TEXT NOT NULL DEFAULT '[]',
  delivery_message TEXT,
  client_rating REAL,
  feedback TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- freelance_deliveries
CREATE TABLE IF NOT EXISTS freelance_deliveries (
  id TEXT PRIMARY KEY,
  active_job_id TEXT NOT NULL REFERENCES active_freelance_jobs(id) ON DELETE CASCADE,
  files TEXT NOT NULL DEFAULT '[]',
  delivery_message TEXT NOT NULL DEFAULT '',
  client_response TEXT,
  revision_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- dropshipping_products
CREATE TABLE IF NOT EXISTS dropshipping_products (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  cost_price REAL NOT NULL DEFAULT 0,
  target_sell_price REAL NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'general',
  trending_score REAL NOT NULL DEFAULT 0,
  trend_data TEXT,
  validation_status TEXT NOT NULL DEFAULT 'pending',
  ai_score REAL,
  images TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- validation_results
CREATE TABLE IF NOT EXISTS validation_results (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES dropshipping_products(id) ON DELETE CASCADE,
  step_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  result_data TEXT,
  completed_at TEXT
);

-- dropshipping_stores
CREATE TABLE IF NOT EXISTS dropshipping_stores (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES dropshipping_products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  domain TEXT,
  platform TEXT NOT NULL DEFAULT 'shopify',
  settings TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'new',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- store_orders
CREATE TABLE IF NOT EXISTS store_orders (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL REFERENCES dropshipping_stores(id) ON DELETE CASCADE,
  order_data TEXT NOT NULL DEFAULT '{}',
  revenue REAL NOT NULL DEFAULT 0,
  cost REAL NOT NULL DEFAULT 0,
  placed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- ads
CREATE TABLE IF NOT EXISTS ads (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL REFERENCES dropshipping_stores(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  creative_type TEXT NOT NULL DEFAULT 'image',
  ad_name TEXT NOT NULL,
  spend REAL NOT NULL DEFAULT 0,
  revenue REAL NOT NULL DEFAULT 0,
  roas REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- payments
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  amount REAL NOT NULL,
  gateway_fee REAL NOT NULL DEFAULT 0,
  platform_fee REAL NOT NULL DEFAULT 0,
  net_amount REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  gateway TEXT NOT NULL,
  gateway_payment_id TEXT,
  currency TEXT NOT NULL DEFAULT 'USD',
  customer_email TEXT,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  completed_at TEXT
);

-- invoices
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  payment_id TEXT REFERENCES payments(id),
  invoice_number TEXT NOT NULL UNIQUE,
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  client_address TEXT,
  items TEXT NOT NULL DEFAULT '[]',
  subtotal REAL NOT NULL DEFAULT 0,
  tax REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  payment_link TEXT,
  notes TEXT,
  pdf_url TEXT,
  due_date TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  sent_at TEXT,
  paid_at TEXT
);

-- payouts
CREATE TABLE IF NOT EXISTS payouts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount REAL NOT NULL,
  source_gateway TEXT NOT NULL,
  destination_bank TEXT,
  destination_account_last4 TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  reference_id TEXT,
  initiated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  completed_at TEXT
);

-- agent_logs
CREATE TABLE IF NOT EXISTS agent_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL,
  action TEXT NOT NULL,
  input TEXT NOT NULL DEFAULT '{}',
  output TEXT,
  error TEXT,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_agent_logs_agent ON agent_logs(agent_name);
CREATE INDEX IF NOT EXISTS idx_agent_logs_created ON agent_logs(created_at DESC);

-- chat_sessions
CREATE TABLE IF NOT EXISTS chat_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New Conversation',
  context_page TEXT,
  message_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- chat_messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  command_type TEXT,
  response_data TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);

-- files
CREATE TABLE IF NOT EXISTS files (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL DEFAULT 0,
  storage_provider TEXT NOT NULL DEFAULT 'local',
  storage_path TEXT NOT NULL,
  public_url TEXT,
  folder TEXT NOT NULL DEFAULT 'general',
  tags TEXT NOT NULL DEFAULT '[]',
  download_count INTEGER NOT NULL DEFAULT 0,
  share_token TEXT UNIQUE,
  share_expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- marketplace_plugins
CREATE TABLE IF NOT EXISTS marketplace_plugins (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  author TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '1.0.0',
  price INTEGER NOT NULL DEFAULT 0,
  rating INTEGER NOT NULL DEFAULT 0,
  installs INTEGER NOT NULL DEFAULT 0,
  icon_url TEXT,
  screenshots TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- installed_plugins
CREATE TABLE IF NOT EXISTS installed_plugins (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plugin_id TEXT NOT NULL REFERENCES marketplace_plugins(id) ON DELETE CASCADE,
  enabled TEXT NOT NULL DEFAULT 'true',
  config TEXT NOT NULL DEFAULT '{}',
  installed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(user_id, plugin_id)
);

-- referrals
CREATE TABLE IF NOT EXISTS referrals (
  id TEXT PRIMARY KEY,
  referrer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_email TEXT NOT NULL,
  referral_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  commission_earned REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- payment_methods
CREATE TABLE IF NOT EXISTS payment_methods (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '{}',
  is_active INTEGER NOT NULL DEFAULT 1,
  is_default INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- user_whitelist
CREATE TABLE IF NOT EXISTS user_whitelist (
  email TEXT PRIMARY KEY,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- system_settings
CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- notifications
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,
  message TEXT,
  read INTEGER NOT NULL DEFAULT 0,
  type TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- platform_accounts
CREATE TABLE IF NOT EXISTS platform_accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform_name TEXT NOT NULL,
  email TEXT NOT NULL,
  encrypted_password TEXT NOT NULL,
  profile_url TEXT,
  status TEXT NOT NULL DEFAULT 'connected',
  last_synced_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- platform_notifications
CREATE TABLE IF NOT EXISTS platform_notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform_account_id TEXT REFERENCES platform_accounts(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  external_url TEXT,
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- processor_sessions
CREATE TABLE IF NOT EXISTS processor_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  current_step TEXT NOT NULL DEFAULT 'planning',
  progress_percent INTEGER NOT NULL DEFAULT 0,
  logs TEXT NOT NULL DEFAULT '[]',
  output_files TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- user_platforms
CREATE TABLE IF NOT EXISTS user_platforms (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform_name TEXT NOT NULL,
  platform_url TEXT NOT NULL,
  icon_url TEXT,
  status TEXT NOT NULL DEFAULT 'Not connected',
  last_synced TEXT,
  notifications_count INTEGER NOT NULL DEFAULT 0,
  messages_count INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
`;

const SEED_SQL = `
-- Insert default user (idempotent)
INSERT OR IGNORE INTO users (id, email, profile, preferences, payment_settings, onboarding_completed)
VALUES (
  '${DEFAULT_USER_ID}',
  'admin@edith.local',
  '{"name":"EDITH Operator","bio":null,"avatar":null,"timezone":"UTC","website":null,"skills":[],"hourlyRate":null,"portfolio":[]}',
  '{"language":"en","currency":"USD","theme":"dark","notifications":{"email":true,"newJobs":true,"proposalAccepted":true,"paymentReceived":true,"adPerformance":true},"aiDefaults":{"model":"deepseek/deepseek-chat","proposalTone":"professional","autoSendProposals":false,"autoExecute":false,"budgetThreshold":100}}',
  '{"stripeEnabled":false,"razorpayEnabled":false,"paymentLink":null,"defaultCurrency":"USD","taxRate":0,"bankAccount":null,"invoiceSettings":{"companyName":"EDITH","address":"","logo":null,"defaultDueDays":14,"termsAndConditions":"","footer":null}}',
  0
);

-- Seed marketplace plugins
INSERT OR IGNORE INTO marketplace_plugins (id, name, category, description, author, version, price, rating, installs)
VALUES
  ('plugin-001','Upwork Pro Scraper','scraper','Advanced Upwork job scraping with filters','EDITH Labs','2.1.0',0,48,1240),
  ('plugin-002','Fiverr Radar','scraper','Find trending Fiverr gig opportunities','EDITH Labs','1.5.0',0,42,980),
  ('plugin-003','Stripe Advanced','payment','Multi-currency Stripe integration','EDITH Labs','3.0.0',0,50,2100),
  ('plugin-004','TikTok Trend Tracker','analytics','Track viral product trends on TikTok','EDITH Labs','1.2.0',999,45,750),
  ('plugin-005','AliExpress Connect','sourcing','Direct AliExpress product sourcing','EDITH Labs','2.0.0',0,46,1500),
  ('plugin-006','GPT-4o Vision Agent','ai','Visual content analysis and generation','EDITH Labs','1.0.0',1999,49,430);
`;

export function runMigrations(): void {
  const dbPath = getDbPath();
  logger.info({ dbPath }, '🔄 Running SQLite migrations...');

  const db = new Database(dbPath);

  try {
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    // Run migration in a single transaction
    db.exec(MIGRATION_SQL);
    db.exec(SEED_SQL);

    // Run self-healing column migrations for existing users
    try {
      db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'");
    } catch (err) { /* ignore if column already exists */ }
    try {
      db.exec("ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active'");
    } catch (err) { /* ignore if column already exists */ }

    // Record migration version
    db.exec(`
      CREATE TABLE IF NOT EXISTS _migrations (
        version INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
      );
      INSERT OR IGNORE INTO _migrations (version) VALUES (1);
    `);

    logger.info('✅ SQLite migrations complete');
  } finally {
    db.close();
  }
}

// Allow running directly: node migrate.js
if (require.main === module) {
  runMigrations();
  console.log('Migration complete');
}
