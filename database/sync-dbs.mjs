import { createClient } from '@libsql/client';
import * as path from 'path';

const rootClient = createClient({ url: 'file:' + path.resolve('../data/dev.db') });
const backendClient = createClient({ url: 'file:' + path.resolve('../backend/data/dev.db') });

async function syncTable(tableName) {
  try {
    const bRows = await backendClient.execute(`SELECT * FROM ${tableName} WHERE deleted_at IS NULL`);
    console.log(`Backend ${tableName} active rows:`, bRows.rows.length);
    if (bRows.rows.length > 0) {
      for (const row of bRows.rows) {
        const cols = Object.keys(row);
        const placeholders = cols.map(() => '?').join(', ');
        const colNames = cols.map((c) => `"${c}"`).join(', ');
        const sql = `INSERT OR REPLACE INTO ${tableName} (${colNames}) VALUES (${placeholders})`;
        await rootClient.execute({ sql, args: Object.values(row) });
      }
      console.log(`✓ Synced ${bRows.rows.length} rows to data/dev.db for ${tableName}`);
    }
  } catch (err) {
    console.warn(`! Note on ${tableName}:`, err.message);
  }
}

await syncTable('shranix_customers');
await syncTable('shranix_items');
await syncTable('shranix_suppliers');
await syncTable('shranix_sales_orders');
await syncTable('shranix_purchase_orders');
await syncTable('shranix_cash_book');

rootClient.close();
backendClient.close();
console.log('✓ Sync complete.');
