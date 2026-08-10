/**
 * 🔧 CUSTOMER MASTER MIGRATION (Phase 3) — idempotent apply to the live dev.db
 *
 * Applies database/src/migrations/0008_absent_prism.sql (6 new tables +
 * default group/category seeds) to the root live DB used by the backend
 * (data/dev.db). Mirrors sync-schema.mjs conventions: CREATE TABLE only if
 * the table does not already exist; INSERT OR IGNORE seeds are idempotent.
 *
 * Usage: node scripts/apply-customer-master-migration.mjs
 */
import { createRequire } from 'node:module';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
// Resolve @libsql/client from the database package (pnpm workspace)
const require = createRequire(path.join(repoRoot, 'database', 'package.json'));
const { createClient } = require('@libsql/client');

const DB_URL = 'file:data/dev.db';
const MIGRATION = path.join(repoRoot, 'database/src/migrations/0008_absent_prism.sql');

const client = createClient({ url: DB_URL });

async function query(sql) {
  const r = await client.execute(sql);
  return r.rows;
}

async function tableExists(name) {
  const rows = await query(`SELECT 1 AS x FROM sqlite_master WHERE type='table' AND name='${name}'`);
  return rows.length > 0;
}

function parseCreateTable(sql) {
  const m = sql.match(/CREATE TABLE\s+[`"']?([\w]+)[`"']?/i);
  return m ? m[1] : null;
}

async function main() {
  console.log('🔧 SHRANIX — Customer Master migration (0008)');
  console.log(`   DB: ${DB_URL}`);
  const sql = fs.readFileSync(MIGRATION, 'utf8');
  const statements = sql
    .split('--> statement-breakpoint')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  let created = 0;
  let seeded = 0;
  let indexOk = 0;
  let indexErr = 0;

  for (const stmt of statements) {
    const createName = parseCreateTable(stmt);
    if (createName) {
      if (await tableExists(createName)) {
        console.log(`• skip (exists): ${createName}`);
        continue;
      }
      try {
        await client.execute(stmt);
        created++;
        console.log(`+ CREATE TABLE ${createName}`);
      } catch (e) {
        console.log(`! CREATE ${createName} failed: ${e.message}`);
      }
      continue;
    }
    if (/^INSERT OR IGNORE/i.test(stmt)) {
      const r = await client.execute(stmt);
      const n = Number(r.rowsAffected ?? 0);
      seeded += n;
      console.log(`+ seed rows: ${n}`);
      continue;
    }
    try {
      await client.execute(stmt);
      indexOk++;
    } catch {
      indexErr++;
    }
  }

  console.log('──────────────────────────────────────────');
  console.log(`CREATE TABLE: ${created}`);
  console.log(`Seed rows:    ${seeded}`);
  console.log(`Indexes OK:   ${indexOk}  (errors: ${indexErr})`);
  console.log('──────────────────────────────────────────');
  console.log('✅ CUSTOMER MASTER MIGRATION COMPLETE');
}

main()
  .catch((e) => {
    console.error('❌ Migration failed:', e);
    process.exit(1);
  })
  .finally(() => client.close());
