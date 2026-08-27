import { createClient } from '@libsql/client';
import * as fs from 'fs';

const paths = ['data/dev.db', 'backend/data/dev.db', 'database/data/dev.db'];
for (const p of paths) {
  if (fs.existsSync(p)) {
    console.log('\n=== DB:', p);
    const client = createClient({ url: 'file:' + p });
    try {
      const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table'");
      console.log('Tables count:', tables.rows.length);
      for (const t of [
        'shranix_customers',
        'shranix_items',
        'shranix_sales_invoices',
        'shranix_purchase_invoices',
        'shranix_suppliers',
        'shranix_batch_master',
        'shranix_sales_orders',
        'shranix_purchase_orders',
        'shranix_cash_book',
        'shranix_stock_transfers',
      ]) {
        try {
          const r = await client.execute('SELECT count(*) as c FROM ' + t);
          console.log('  ', t, ':', r.rows[0].c);
        } catch (e) {
          console.log('  ', t, ': ERROR', e.message);
        }
      }
    } finally {
      client.close();
    }
  }
}
