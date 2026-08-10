/**
 * 🗄️ Apply supplier master migrations (0009 + 0010) to the live dev DBs.
 *   node scripts/apply-supplier-master-migration.mjs
 *
 * The backend resolves its DB at `backend/data/dev.db` (relative to cwd when
 * started), while database tooling uses `database/data/dev.db`. We patch both.
 */
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const req = createRequire(path.join(process.cwd(), 'database/package.json'));
const { createClient } = req('@libsql/client');

const MIGRATIONS = ['0009_lonely_next_avengers.sql', '0010_tired_forge.sql'];

const GROUPS = ['Retail Supplier', 'Manufacturer', 'Distributor', 'Importer', 'Wholesaler', 'Company', 'Local Vendor'];
const CATEGORIES = ['A', 'B', 'C', 'Premium', 'Preferred'];

async function migrateOne(dbUrl) {
  console.log(`\n── ${dbUrl} ──`);
  const c = createClient({ url: dbUrl });
  for (const file of MIGRATIONS) {
    const table = file.startsWith('0009') ? 'shranix_supplier_addresses' : 'shranix_supplier_groups';
    const existing = await c.execute(`SELECT name FROM sqlite_master WHERE type='table' AND name='${table}'`);
    if (existing.rows.length > 0) {
      console.log(`⏭️  ${file} already applied — skipping.`);
      continue;
    }
    const sql = readFileSync(path.join(process.cwd(), `database/src/migrations/${file}`), 'utf8');
    const statements = sql.split('--> statement-breakpoint').map((s) => s.trim()).filter(Boolean);
    for (const stmt of statements) {
      try {
        await c.execute(stmt);
      } catch (e) {
        if (!String(e.message).includes('duplicate column')) {
          throw e;
        }
      }
    }
    console.log(`✅ Applied ${statements.length} statements from ${file}.`);
  }
  // Verify columns
  const cols = await c.execute('PRAGMA table_info(shranix_suppliers)');
  console.log('  shranix_suppliers cols:', cols.rows.map((x) => x.name).join(','));

  // Seed reference data
  const now = new Date().toISOString();
  const gRes = await c.execute('SELECT COUNT(*) AS c FROM shranix_supplier_groups');
  if (Number(gRes.rows[0].c) === 0) {
    for (const [i, name] of GROUPS.entries()) {
      await c.execute({
        sql: 'INSERT INTO shranix_supplier_groups (id, created_at, updated_at, name, is_system, sort_order, is_active, is_deleted) VALUES (?, ?, ?, ?, 1, ?, 1, 0)',
        args: [randomUUID(), now, now, name, i + 1],
      });
    }
    console.log(`  Seeded ${GROUPS.length} supplier groups.`);
  } else {
    console.log('  Supplier groups already seeded.');
  }
  const cRes = await c.execute('SELECT COUNT(*) AS c FROM shranix_supplier_categories');
  if (Number(cRes.rows[0].c) === 0) {
    for (const [i, name] of CATEGORIES.entries()) {
      await c.execute({
        sql: 'INSERT INTO shranix_supplier_categories (id, created_at, updated_at, name, priority, is_active, is_deleted) VALUES (?, ?, ?, ?, ?, 1, 0)',
        args: [randomUUID(), now, now, name, i + 1],
      });
    }
    console.log(`  Seeded ${CATEGORIES.length} supplier categories.`);
  } else {
    console.log('  Supplier categories already seeded.');
  }
  c.close();
}

const targets = [
  `file:${path.join(process.cwd(), 'database/data/dev.db')}`,
  `file:${path.join(process.cwd(), 'backend/data/dev.db')}`,
];

for (const t of targets) {
  try {
    await migrateOne(t);
  } catch (e) {
    console.error(`❌ ${t} failed:`, e.message);
  }
}
console.log('\n✅ Migration pass complete.');
