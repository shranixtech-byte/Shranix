import { createClient } from '@libsql/client';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const dbs = {
  'root data/dev.db': path.resolve(rootDir, 'data', 'dev.db'),
  'database/data/dev.db': path.resolve(rootDir, 'database', 'data', 'dev.db'),
};

for (const [label, dbPath] of Object.entries(dbs)) {
  console.log(`\n===== ${label} =====`);
  const c = createClient({ url: 'file:' + dbPath });
  try {
    const tables = await c.execute(
      "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'shranix_%' ORDER BY name",
    );
    const names = tables.rows.map((r) => r.name);
    console.log(`tables (${names.length}):`);
    console.log(names.join(', '));
    for (const t of [
      'shranix_users',
      'shranix_items',
      'shranix_customers',
      'shranix_warehouses',
      'shranix_warehouse_stock',
      'shranix_gst_rates',
      'shranix_units',
      'shranix_sales_invoices',
    ]) {
      try {
        const r = await c.execute(`SELECT COUNT(*) AS cnt FROM ${t}`);
        console.log(`  ${t}: ${r.rows[0].cnt}`);
      } catch (e) {
        console.log(`  ${t}: MISSING (${e.message.split(':').pop().trim()})`);
      }
    }
  } catch (e) {
    console.log('ERR:', e.message);
  } finally {
    c.close();
  }
}
