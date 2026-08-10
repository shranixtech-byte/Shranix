import { createRequire } from 'node:module';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const require = createRequire(path.join(repoRoot, 'database', 'package.json'));
const { createClient } = require('@libsql/client');

const c = createClient({ url: 'file:data/dev.db' });

const tables = [
  'shranix_customers',
  'shranix_customer_addresses',
  'shranix_customer_contacts',
  'shranix_customer_documents',
  'shranix_customer_groups',
  'shranix_customer_categories',
];

for (const t of tables) {
  const r = await c.execute(`SELECT COUNT(*) AS c FROM ${t}`);
  console.log(t, 'rows:', r.rows[0].c);
}
const g = await c.execute('SELECT name FROM shranix_customer_groups ORDER BY sort_order');
console.log('groups:', g.rows.map((r) => r.name).join(', '));
const cat = await c.execute('SELECT name FROM shranix_customer_categories ORDER BY priority');
console.log('categories:', cat.rows.map((r) => r.name).join(', '));
c.close();
