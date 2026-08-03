import { createClient } from '@libsql/client';
import { resolve } from 'node:path';

const targets = [
  resolve('backend/data/dev.db'),
  resolve('data/dev.db'),
  resolve('database/data/dev.db'),
];

for (const url of targets) {
  const c = createClient({ url: `file:${url}` });
  const r = c.execute(`SELECT name FROM sqlite_master WHERE type='table' AND name='shranix_accounting_settings'`);
  if (r.rows.length === 0) {
    console.log(`--- ${url}: table NOT found`);
    continue;
  }
  const cols = c.execute(`PRAGMA table_info(shranix_accounting_settings)`).rows.map((x) => x.name);
  console.log(`--- ${url}`);
  console.log(cols.join('\n'));
}
