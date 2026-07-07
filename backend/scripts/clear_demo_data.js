#!/usr/bin/env node
/**
 * EDITH Database Demo Data Cleaner
 * Usage: node scripts/clear_demo_data.js
 */
require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL ||
    'postgresql://postgres:edith_secret_2024@localhost:5432/edith',
  connectionTimeoutMillis: 10000,
});

const tablesToClear = [
  'freelance_deliveries',
  'active_freelance_jobs',
  'proposals',
  'freelance_jobs',
  'validation_results',
  'store_orders',
  'ads',
  'dropshipping_stores',
  'dropshipping_products',
  'invoices',
  'payments',
  'payouts',
  'chat_messages',
  'chat_sessions',
  'agent_logs',
  'activity_log',
  'notifications',
  'referrals'
];

async function run() {
  console.log('\n🧹 EDITH Demo Data Cleaner\n' + '─'.repeat(40));
  await client.connect();
  console.log('  ✅ Connected to database');

  console.log('  🔄 Starting deletion transaction...');
  await client.query('BEGIN');

  try {
    for (const table of tablesToClear) {
      const { rows } = await client.query(`SELECT count(*) as count FROM ${table}`);
      const beforeCount = parseInt(rows[0].count);
      
      await client.query(`DELETE FROM ${table}`);
      console.log(`  🗑️  Cleared: ${table} (${beforeCount} rows removed)`);
    }

    await client.query('COMMIT');
    console.log('  ✅ Transaction committed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('  ❌ Error during deletion, transaction rolled back.');
    throw err;
  }

  // Verification checks as requested by user
  console.log('\n🔍 Verification Checks:');
  const checks = [
    { label: 'freelance_jobs', query: 'SELECT count(*) FROM freelance_jobs' },
    { label: 'proposals', query: 'SELECT count(*) FROM proposals' },
    { label: 'dropshipping_products', query: 'SELECT count(*) FROM dropshipping_products' },
    { label: 'invoices', query: 'SELECT count(*) FROM invoices' },
    { label: 'payments', query: 'SELECT count(*) FROM payments' },
  ];

  for (const check of checks) {
    const { rows } = await client.query(check.query);
    console.log(`  📊 Count of ${check.label}: ${rows[0].count}`);
  }

  await client.end();
  console.log('\n🎉 Database cleared successfully! Complete clean slate ready for production use.\n');
}

run().catch((err) => {
  console.error('\n❌ Clearing demo data failed:', err);
  client.end().catch(() => {});
  process.exit(1);
});
