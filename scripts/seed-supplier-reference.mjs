/**
 * 🏷️ Seed supplier groups + categories reference data into the live dev DB.
 *   node scripts/seed-supplier-reference.mjs
 */
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { createRequire } from 'node:module';

const req = createRequire(path.join(process.cwd(), 'database/package.json'));
const { createClient } = req('@libsql/client');

const c = createClient({ url: 'file:data/dev.db' });
const now = new Date().toISOString();

const GROUPS = ['Retail Supplier', 'Manufacturer', 'Distributor', 'Importer', 'Wholesaler', 'Company', 'Local Vendor'];
const CATEGORIES = ['A', 'B', 'C', 'Premium', 'Preferred'];

async function main() {
  const gRes = await c.execute('SELECT COUNT(*) AS c FROM shranix_supplier_groups');
  if (Number(gRes.rows[0].c) === 0) {
    for (const [i, name] of GROUPS.entries()) {
      await c.execute({
        sql: 'INSERT INTO shranix_supplier_groups (id, created_at, updated_at, name, is_system, sort_order, is_active, is_deleted) VALUES (?, ?, ?, ?, 1, ?, 1, 0)',
        args: [randomUUID(), now, now, name, i + 1],
      });
    }
    console.log(`✅ Seeded ${GROUPS.length} supplier groups.`);
  } else {
    console.log('⏭️  Supplier groups already seeded.');
  }

  const cRes = await c.execute('SELECT COUNT(*) AS c FROM shranix_supplier_categories');
  if (Number(cRes.rows[0].c) === 0) {
    for (const [i, name] of CATEGORIES.entries()) {
      await c.execute({
        sql: 'INSERT INTO shranix_supplier_categories (id, created_at, updated_at, name, priority, is_active, is_deleted) VALUES (?, ?, ?, ?, ?, 1, 0)',
        args: [randomUUID(), now, now, name, i + 1],
      });
    }
    console.log(`✅ Seeded ${CATEGORIES.length} supplier categories.`);
  } else {
    console.log('⏭️  Supplier categories already seeded.');
  }

  const g = await c.execute('SELECT id, name FROM shranix_supplier_groups');
  console.log('groups:', g.rows.map((r) => r.name).join(', '));
  const cats = await c.execute('SELECT id, name FROM shranix_supplier_categories');
  console.log('categories:', cats.rows.map((r) => r.name).join(', '));
}

main().catch((e) => {
  console.error('❌ seed failed:', e.message);
  process.exit(1);
});
