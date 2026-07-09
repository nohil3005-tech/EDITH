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

-- Clear any old mock data from previous deployments
DELETE FROM active_freelance_jobs WHERE id = 'act-001';
DELETE FROM proposals WHERE id = 'prop-001';
DELETE FROM freelance_jobs WHERE id IN ('job-001', 'job-002', 'job-003', 'job-004');
DELETE FROM platform_notifications WHERE id IN ('notif-001', 'notif-002');
DELETE FROM user_platforms WHERE id IN ('platform-upwork', 'platform-fiverr');

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
`;

export async function runMigrations(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    logger.error('❌ DATABASE_URL environment variable is missing.');
    process.exit(1);
  }

  logger.info('🔄 Running PostgreSQL migrations...');

  const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1') || connectionString.includes('postgres');
  const migrationClient = postgres(connectionString, { 
    max: 1, 
    ssl: isLocal ? false : { rejectUnauthorized: false } 
  });
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
