/**
 * 🔧 Idempotent dev.db patch — backend/data/dev.db (live), data/dev.db (root),
 * database/data/dev.db (package) teeno copies par missing columns add karta hai.
 *
 * Kya fix karta hai:
 *   • shranix_users.allowed_modules  → login 500 ("no such column") fix
 *   • shranix_companies license cols → Company & License section save 500 fix
 *
 * Usage: node scripts/patch-dev-db.mjs
 */
import { createRequire } from 'node:module';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

// @libsql/client ko database package ke through resolve karo (pnpm workspace)
const require = createRequire(new URL('../database/package.json', import.meta.url));
const { createClient } = require('@libsql/client');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DB_PATHS = [
  path.join(ROOT, 'backend/data/dev.db'),
  path.join(ROOT, 'data/dev.db'),
  path.join(ROOT, 'database/data/dev.db'),
];

const PATCHES = [
  { table: 'shranix_users', column: 'allowed_modules', def: 'text' },
  { table: 'shranix_companies', column: 'license_no', def: 'text' },
  { table: 'shranix_companies', column: 'pesticides_license', def: 'text' },
  { table: 'shranix_companies', column: 'seeds_license', def: 'text' },
  { table: 'shranix_companies', column: 'cotton_license', def: 'text' },
  { table: 'shranix_companies', column: 'fertilizer_license', def: 'text' },
  { table: 'shranix_companies', column: 'retail_license', def: 'text' },
];

async function columnExists(client, table, col) {
  const r = await client.execute(`PRAGMA table_info('${table}')`);
  return r.rows.some((row) => row.name === col);
}

async function patchDb(file) {
  if (!fs.existsSync(file)) {
    console.log(`· skip (no file): ${file}`);
    return;
  }
  const client = createClient({ url: `file:${file.replace(/\\/g, '/')}` });
  let added = 0;
  for (const p of PATCHES) {
    if (await columnExists(client, p.table, p.column)) { continue; }
    await client.execute(`ALTER TABLE ${p.table} ADD COLUMN ${p.column} ${p.def}`);
    added++;
    console.log(`  + ${path.basename(path.dirname(file))}/${path.basename(file)} :: ${p.table}.${p.column}`);
  }
  client.close();
  console.log(added === 0 ? `✓ ${file} — already up to date` : `✓ ${file} — +${added} columns`);
}

for (const f of DB_PATHS) {
  try {
    await patchDb(f);
  } catch (e) {
    console.error(`✗ ${f}: ${e.message}`);
  }
}
console.log('\n✅ PATCH COMPLETE');
