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
  
  const user = db.prepare("SELECT * FROM users WHERE id = '00000000-0000-0000-0000-000000000001'").get();
  console.log('Default user in database:', user);
  
} catch (err) {
  console.error('Error querying database:', err.message);
}
