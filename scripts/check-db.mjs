import { createClient } from '@libsql/client';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, '..', 'database', 'data', 'dev.db');
const client = createClient({ url: 'file:' + dbPath });

async function check() {
  // Check tables
  const tables = await client.execute({
    sql: 'SELECT name FROM sqlite_master WHERE type = ? ORDER BY name',
    args: ['table']
  });
  console.log('=== TABLES ===');
  console.log(tables.rows.map(r => r.name).join(', '));

  // Check users
  const userTable = tables.rows.find(r => r.name === 'shranix_users');
  if (userTable) {
    const users = await client.execute({
      sql: 'SELECT id, email, is_active, is_email_verified, failed_login_attempts, locked_until, refresh_token_version, last_login_at, substr(password_hash, 1, 40) as hash_prefix FROM shranix_users',
      args: []
    });
    console.log('\n=== USERS (' + users.rows.length + ') ===');
    users.rows.forEach(u => console.log(JSON.stringify(u, null, 2)));
  } else {
    console.log('\nshranix_users table does NOT exist');
  }

  // Check roles
  const rolesTable = tables.rows.find(r => r.name === 'shranix_roles');
  if (rolesTable) {
    const roles = await client.execute({
      sql: 'SELECT * FROM shranix_roles',
      args: []
    });
    console.log('\n=== ROLES ===');
    roles.rows.forEach(r => console.log(JSON.stringify(r)));
  }

  client.close();
}

check().catch(e => { console.error('Error:', e.message); process.exit(1); });
