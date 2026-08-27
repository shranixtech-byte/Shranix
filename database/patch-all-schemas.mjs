import { createClient } from '@libsql/client';
import * as path from 'path';
import * as fs from 'fs';

const root = path.resolve('..');
const paths = [
  path.resolve(root, 'data/dev.db'),
  path.resolve(root, 'backend/data/dev.db'),
  path.resolve(root, 'database/data/dev.db'),
];

for (const p of paths) {
  if (!fs.existsSync(p)) continue;
  console.log('\n=== Checking and patching columns on:', p);
  const client = createClient({ url: 'file:' + p });

  const safeAddColumn = async (table, column, typeDef) => {
    try {
      const info = await client.execute(`PRAGMA table_info(${table})`);
      const exists = info.rows.some((r) => r.name === column);
      if (!exists) {
        console.log(`  + Adding missing column ${column} (${typeDef}) to ${table}`);
        await client.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${typeDef}`);
      }
    } catch (err) {
      console.warn(`  ! Note for ${table}.${column}:`, err.message);
    }
  };

  try {
    // 1. shranix_sales_invoices
    await safeAddColumn('shranix_sales_invoices', 'branch_id', 'TEXT');
    await safeAddColumn('shranix_sales_invoices', 'financial_year_id', 'TEXT');
    await safeAddColumn('shranix_sales_invoices', 'freight', 'REAL DEFAULT 0');
    await safeAddColumn('shranix_sales_invoices', 'payment_terms', 'TEXT DEFAULT "cash"');

    // 2. shranix_purchase_invoices
    await safeAddColumn('shranix_purchase_invoices', 'branch_id', 'TEXT');
    await safeAddColumn('shranix_purchase_invoices', 'financial_year_id', 'TEXT');
    await safeAddColumn('shranix_purchase_invoices', 'freight', 'REAL DEFAULT 0');
    await safeAddColumn('shranix_purchase_invoices', 'payment_terms', 'TEXT DEFAULT "cash"');

    // 3. shranix_sales_orders
    await safeAddColumn('shranix_sales_orders', 'branch_id', 'TEXT');
    await safeAddColumn('shranix_sales_orders', 'warehouse_id', 'TEXT');
    await safeAddColumn('shranix_sales_orders', 'financial_year_id', 'TEXT');

    // 4. shranix_purchase_orders
    await safeAddColumn('shranix_purchase_orders', 'branch_id', 'TEXT');
    await safeAddColumn('shranix_purchase_orders', 'warehouse_id', 'TEXT');
    await safeAddColumn('shranix_purchase_orders', 'financial_year_id', 'TEXT');

    // 5. shranix_customers
    await safeAddColumn('shranix_customers', 'group_id', 'TEXT');
    await safeAddColumn('shranix_customers', 'category_id', 'TEXT');
    await safeAddColumn('shranix_customers', 'credit_limit', 'REAL DEFAULT 0');
    await safeAddColumn('shranix_customers', 'credit_days', 'INTEGER DEFAULT 0');
    await safeAddColumn('shranix_customers', 'current_balance', 'REAL DEFAULT 0');
    await safeAddColumn('shranix_customers', 'opening_balance', 'REAL DEFAULT 0');

    // 6. shranix_items
    await safeAddColumn('shranix_items', 'min_stock', 'REAL DEFAULT 5');
    await safeAddColumn('shranix_items', 'reorder_level', 'REAL DEFAULT 10');
    await safeAddColumn('shranix_items', 'current_stock', 'REAL DEFAULT 0');
    await safeAddColumn('shranix_items', 'opening_stock', 'REAL DEFAULT 0');
    await safeAddColumn('shranix_items', 'purchase_rate', 'REAL DEFAULT 0');
    await safeAddColumn('shranix_items', 'selling_rate', 'REAL DEFAULT 0');

    // 7. shranix_stock_transfers
    await safeAddColumn('shranix_stock_transfers', 'source_warehouse_id', 'TEXT');
    await safeAddColumn('shranix_stock_transfers', 'destination_warehouse_id', 'TEXT');
    await safeAddColumn('shranix_stock_transfers', 'transfer_date', 'TEXT');
    await safeAddColumn('shranix_stock_transfers', 'transfer_number', 'TEXT');

    // 8. shranix_batch_master
    await safeAddColumn('shranix_batch_master', 'item_id', 'TEXT');
    await safeAddColumn('shranix_batch_master', 'batch_no', 'TEXT');
    await safeAddColumn('shranix_batch_master', 'expiry_date', 'TEXT');
    await safeAddColumn('shranix_batch_master', 'exp_date', 'TEXT');
    await safeAddColumn('shranix_batch_master', 'quantity', 'REAL DEFAULT 0');
    await safeAddColumn('shranix_batch_master', 'available_quantity', 'REAL DEFAULT 0');

    console.log('✓ Columns checked and patched successfully.');
  } finally {
    client.close();
  }
}
