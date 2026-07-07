#!/usr/bin/env node
/**
 * EDITH Database Migration Runner
 * Usage: node scripts/migrate.js
 *    or: npm run db:migrate
 */
require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(__dirname, '..', 'src', 'db', 'migrations');

const client = new Client({
  connectionString: process.env.DATABASE_URL ||
    'postgresql://postgres:edith_secret_2024@localhost:5432/edith',
  connectionTimeoutMillis: 10000,
});

async function run() {
  console.log('\n🔄 EDITH Database Migration\n' + '─'.repeat(40));
  console.log('  DB:', process.env.DATABASE_URL ? 
    process.env.DATABASE_URL.replace(/:([^:@]+)@/, ':***@') : 
    'postgresql://localhost:5432/edith');
  
  await client.connect();
  console.log('  ✅ Connected');

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log(`  🔍 Found ${files.length} migration file(s)`);

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    console.log(`  ⚙️  Applying: ${file}...`);
    const sql = fs.readFileSync(filePath, 'utf8');
    await client.query(sql);
    console.log(`  ✅ Applied: ${file}`);
  }
  
  // Verify tables
  const res = await client.query(
    "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename"
  );
  console.log(`  ✅ ${res.rows.length} tables ready:`, 
    res.rows.map(r => r.tablename).join(', '));
  
  await client.end();
  console.log('\n🎉 EDITH database is ready!\n');
}

run().catch((err) => {
  console.error('\n❌ Migration failed:', err.message);
  console.error('   Make sure PostgreSQL is running and DATABASE_URL is correct\n');
  client.end().catch(() => {});
  process.exit(1);
});
