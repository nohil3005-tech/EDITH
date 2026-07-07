/**
 * EDITH — PostgreSQL Database Migrator & Seed Runner
 * Connects via DATABASE_URL and executes Drizzle pg migrations.
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import * as path from 'path';
import { logger } from '../utils/logger';
import { DEFAULT_USER_ID } from '../config/constants';

const SEED_SQL = `
-- Insert default user (idempotent)
INSERT INTO users (id, email, role, status, profile, preferences, payment_settings, onboarding_completed)
VALUES (
  '${DEFAULT_USER_ID}',
  'admin@edith.local',
  'admin',
  'active',
  '{"name":"EDITH Operator","bio":null,"avatar":null,"timezone":"UTC","website":null,"skills":[],"hourlyRate":null,"portfolio":[]}'::jsonb,
  '{"language":"en","currency":"USD","theme":"dark","notifications":{"email":true,"newJobs":true,"proposalAccepted":true,"paymentReceived":true,"adPerformance":true},"aiDefaults":{"model":"deepseek/deepseek-chat","proposalTone":"professional","autoSendProposals":false,"autoExecute":false,"budgetThreshold":100}}'::jsonb,
  '{"stripeEnabled":false,"razorpayEnabled":false,"paymentLink":null,"defaultCurrency":"USD","taxRate":0,"bankAccount":null,"invoiceSettings":{"companyName":"EDITH","address":"","logo":null,"defaultDueDays":14,"termsAndConditions":"","footer":null}}'::jsonb,
  false
) ON CONFLICT (id) DO NOTHING;

-- Seed marketplace plugins
INSERT INTO marketplace_plugins (id, name, category, description, author, version, price, rating, installs)
VALUES
  ('plugin-001','Upwork Pro Scraper','scraper','Advanced Upwork job scraping with filters','EDITH Labs','2.1.0',0,48,1240),
  ('plugin-002','Fiverr Radar','scraper','Find trending Fiverr gig opportunities','EDITH Labs','1.5.0',0,42,980),
  ('plugin-003','Stripe Advanced','payment','Multi-currency Stripe integration','EDITH Labs','3.0.0',0,50,2100),
  ('plugin-004','TikTok Trend Tracker','analytics','Track viral product trends on TikTok','EDITH Labs','1.2.0',999,45,750),
  ('plugin-005','AliExpress Connect','sourcing','Direct AliExpress product sourcing','EDITH Labs','2.0.0',0,46,1500),
  ('plugin-006','GPT-4o Vision Agent','ai','Visual content analysis and generation','EDITH Labs','1.0.0',1999,49,430)
ON CONFLICT (id) DO NOTHING;

-- Seed default user platforms
INSERT INTO user_platforms (id, user_id, platform_name, platform_url, icon_url, status, last_synced, notifications_count, messages_count, is_active)
VALUES
  ('platform-upwork', '${DEFAULT_USER_ID}', 'Upwork', 'https://upwork.com', '🟢', 'Connected', 'Just now', 3, 2, true),
  ('platform-fiverr', '${DEFAULT_USER_ID}', 'Fiverr', 'https://fiverr.com', '🟢', 'Connected', '5m ago', 1, 0, true)
ON CONFLICT (id) DO NOTHING;

-- Seed default freelance jobs
INSERT INTO freelance_jobs (id, user_id, source_platform, external_id, title, description, budget_min, budget_max, client_rating, tags, ai_score, ai_insights, status)
VALUES
  ('job-001', '${DEFAULT_USER_ID}', 'upwork', 'mock-9', 'AI Consulting and RAG Pipeline Design', 'Consult on setting up an LLM-based RAG pipeline for corporate document search. Architect document indexing, vector stores, and prompt templates.', 2000, 5000, 5.0, '["AI Consulting","Python","LLM"]'::jsonb, 92, '{"matchScore":92,"strengths":["High budget","AI stack matching"],"concerns":[],"suggestedBid":3500,"estimatedDays":10,"summary":"Perfect fit"}'::jsonb, 'new'),
  ('job-002', '${DEFAULT_USER_ID}', 'upwork', 'mock-10', 'Shopify Store Builder & Product Importer', 'Design and build a professional Shopify drop-shipping store from scratch. Install plugins, import trending products, configure checkout, and design a custom banner.', 500, 1500, 4.8, '["Store Builder","Shopify","Web Dev"]'::jsonb, 85, '{"matchScore":85,"strengths":["Matches e-commerce skills"],"concerns":[],"suggestedBid":1200,"estimatedDays":7,"summary":"Good fit"}'::jsonb, 'new'),
  ('job-003', '${DEFAULT_USER_ID}', 'fiverr', 'mock-11', 'Blog Post Wellness Campaign', 'Write three 800-word blog posts on the benefits of daily meditation and yoga.', 150, 450, 4.9, '["Content","Writing","Blog"]'::jsonb, 88, '{"matchScore":88,"strengths":["Writing domain match"],"concerns":[],"suggestedBid":300,"estimatedDays":4,"summary":"Engaging writing"}'::jsonb, 'new'),
  ('job-004', '${DEFAULT_USER_ID}', 'freelancer', 'mock-12', 'Technical Documentation rest API manual', 'Develop API documentation rest guide.', 400, 1000, 4.9, '["Content","Developer","Writing"]'::jsonb, 90, '{"matchScore":90,"strengths":["Technical docs"],"concerns":[],"suggestedBid":800,"estimatedDays":6,"summary":"API specifications"}'::jsonb, 'new')
ON CONFLICT (id) DO NOTHING;

-- Seed proposals
INSERT INTO proposals (id, user_id, job_id, draft_text, final_text, bid_amount, delivery_days, status)
VALUES
  ('prop-001', '${DEFAULT_USER_ID}', 'job-001', 'I am writing to propose my technical consulting services for RAG pipeline...', 'I am writing to propose my technical consulting services for RAG pipeline...', 3500, 10, 'accepted')
ON CONFLICT (id) DO NOTHING;

-- Seed active freelance jobs
INSERT INTO active_freelance_jobs (id, user_id, job_id, proposal_id, column_name, subtasks)
VALUES
  ('act-001', '${DEFAULT_USER_ID}', 'job-001', 'prop-001', 'planning', '[{"id":"sub-1","title":"Milestone 1: Planning and Architecture Requirements Check","status":"completed"},{"id":"sub-2","title":"Milestone 2: Execution and Swarm Core Coding","status":"pending"},{"id":"sub-3","title":"Milestone 3: Run AI QC Code Audit Check","status":"pending"},{"id":"sub-4","title":"Milestone 4: Delivery Ready Compile and Packaging","status":"pending"}]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Seed messages & notifications
INSERT INTO platform_notifications (id, user_id, platform_account_id, type, title, description, external_url, is_read)
VALUES
  ('notif-001', '${DEFAULT_USER_ID}', null, 'message', 'Upwork Client: Nohil Bansu', 'Hi Nohil, we liked your bid. Let''s start the project as soon as you can. Please deploy the prototype inside EDITH.\n\n[Me]: Sounds good! I am initializing the environment now.', 'sim-job:job-001;sim-prop:prop-001', false),
  ('notif-002', '${DEFAULT_USER_ID}', null, 'message', 'Fiverr Client: Sarah Conner', 'Hello! Can you help resolve this database delay asap? We have an urgent release tonight.\n\n[Me]: Sure, let me run the query analysis immediately.', '', false)
ON CONFLICT (id) DO NOTHING;
`;

export async function runMigrations(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    logger.error('❌ DATABASE_URL environment variable is missing.');
    process.exit(1);
  }

  logger.info('🔄 Running PostgreSQL migrations...');

  const migrationClient = postgres(connectionString, { max: 1, ssl: { rejectUnauthorized: false } });
  const db = drizzle(migrationClient);

  try {
    // Run Drizzle migrations automatically using local migrations folder
    await migrate(db, {
      migrationsFolder: path.join(__dirname, 'migrations'),
    });
    logger.info('✅ Database schema migration complete');

    // Run seed SQL
    logger.info('🌱 Seeding PostgreSQL default values...');
    await migrationClient.unsafe(SEED_SQL);
    logger.info('✅ PostgreSQL seeding complete');
  } catch (err) {
    logger.error({ err }, '❌ Migration/Seeding failed');
    throw err;
  } finally {
    await migrationClient.end();
  }
}

if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('Migration successfully executed');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
