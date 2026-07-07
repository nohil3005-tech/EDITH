const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(
  process.env.APPDATA || (process.platform === 'darwin' ? process.env.HOME + '/Library/Application Support' : process.env.HOME + '/.config'),
  'EDITH',
  'edith.db'
);

console.log('Opening database at:', dbPath);
try {
  const db = new Database(dbPath, { readonly: true });
  
  // Count total jobs
  const countRow = db.prepare('SELECT COUNT(*) as count FROM freelance_jobs').get();
  console.log('Total jobs in database:', countRow.count);
  
  // Show first 5 jobs
  const jobs = db.prepare('SELECT id, title, source_platform, external_id, status FROM freelance_jobs LIMIT 5').all();
  console.log('Sample jobs:', jobs);
  
} catch (err) {
  console.error('Error querying database:', err.message);
}
