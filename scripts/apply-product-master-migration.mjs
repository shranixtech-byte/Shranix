/**
 * 🗄️ Apply product master migration (0012) to the live dev DBs.
 *   node scripts/apply-product-master-migration.mjs
 *
 * 0012 is purely additive — new tables (product_documents, product_price_history)
 * + new columns on shranix_items + new indexes. Safe to re-run (idempotent).
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const req = createRequire(path.join(process.cwd(), 'database/package.json'));
const { createClient } = req('@libsql/client');

const MIGRATIONS = ['0012_eminent_the_santerians.sql', '0013_good_cerise.sql'];

async function migrateOne(dbUrl) {
  console.log(`\n── ${dbUrl} ──`);
  const c = createClient({ url: dbUrl });
  for (const file of MIGRATIONS) {
    const sql = readFileSync(path.join(process.cwd(), `database/src/migrations/${file}`), 'utf8');
    const statements = sql.split('--> statement-breakpoint').map((s) => s.trim()).filter(Boolean);
    let applied = 0;
    for (const stmt of statements) {
      try {
        await c.execute(stmt);
        applied += 1;
      } catch (e) {
        const msg = String(e.message);
        if (msg.includes('duplicate column') || msg.includes('already exists')) {
          console.log(`⏭️  skip (already applied): ${stmt.slice(0, 60)}…`);
        } else {
          throw e;
        }
      }
    }
    console.log(`✅ ${file}: ${applied}/${statements.length} statements applied.`);
  }
  // Verify
  const cols = await c.execute('PRAGMA table_info(shranix_items)');
  const hasProductCode = cols.rows.some((x) => x.name === 'product_code');
  const tabs = await c.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('shranix_product_documents','shranix_product_price_history')",
  );
  console.log(
    `  shranix_items cols: ${cols.rows.length} | product_code: ${hasProductCode} | new tables: ${tabs.rows.map((x) => x.name).join(',') || 'none'}`,
  );
  c.close();
}

const targets = [
  `file:${path.join(process.cwd(), 'database/data/dev.db')}`,
  `file:${path.join(process.cwd(), 'backend/data/dev.db')}`,
  `file:${path.join(process.cwd(), 'data/dev.db')}`,
];

for (const t of targets) {
  try {
    await migrateOne(t);
  } catch (e) {
    console.error(`❌ ${t} failed:`, e.message);
  }
}
console.log('\n✅ Product master migration pass complete.');
