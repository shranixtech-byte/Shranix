#!/usr/bin/env node
/**
 * Fix missing tables in backend/data/dev.db
 * Directly creates tables that the schema defines but the dev DB is missing.
 */
import { createClient } from '@libsql/client';

const client = createClient({ url: 'file:../backend/data/dev.db' });

async function tableExists(name) {
  const r = await client.execute(`SELECT 1 FROM sqlite_master WHERE type='table' AND name='${name}'`);
  return r.rows.length > 0;
}

async function createTableIfMissing(name, ddl) {
  if (await tableExists(name)) {
    console.log(`  ✅ ${name} — already exists`);
    return;
  }
  await client.execute(ddl);
  console.log(`  🔧 ${name} — CREATED`);
}

async function main() {
  console.log('Fixing missing tables in backend/data/dev.db\n');

  // Common base columns
  const baseCols = `
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT,
    is_deleted INTEGER NOT NULL DEFAULT 0
  `;

  // 1. shranix_customers (enterprise master)
  await createTableIfMissing('shranix_customers', `
    CREATE TABLE shranix_customers (
      ${baseCols},
      customer_code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      firm_name TEXT,
      customer_type TEXT NOT NULL DEFAULT 'retail',
      group_id TEXT,
      category_id TEXT,
      gstin TEXT,
      pan TEXT,
      mobile TEXT,
      alt_mobile TEXT,
      whatsapp TEXT,
      email TEXT,
      website TEXT,
      village TEXT,
      taluka TEXT,
      district TEXT,
      state TEXT,
      pin TEXT,
      country TEXT,
      credit_limit REAL NOT NULL DEFAULT 0,
      credit_days INTEGER NOT NULL DEFAULT 0,
      opening_balance REAL NOT NULL DEFAULT 0,
      current_balance REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      remarks TEXT,
      created_by TEXT,
      updated_by TEXT
    )
  `);

  // 2. shranix_customer_groups
  await createTableIfMissing('shranix_customer_groups', `
    CREATE TABLE shranix_customer_groups (
      ${baseCols},
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      is_system INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_by TEXT,
      updated_by TEXT
    )
  `);

  // 3. shranix_customer_categories
  await createTableIfMissing('shranix_customer_categories', `
    CREATE TABLE shranix_customer_categories (
      ${baseCols},
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      priority INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_by TEXT,
      updated_by TEXT
    )
  `);

  // 4. shranix_customer_addresses
  await createTableIfMissing('shranix_customer_addresses', `
    CREATE TABLE shranix_customer_addresses (
      ${baseCols},
      customer_id TEXT NOT NULL,
      label TEXT NOT NULL DEFAULT 'primary',
      address_line1 TEXT,
      address_line2 TEXT,
      city TEXT,
      district TEXT,
      state TEXT,
      pin TEXT,
      country TEXT,
      is_default INTEGER NOT NULL DEFAULT 0,
      created_by TEXT,
      updated_by TEXT
    )
  `);

  // 5. shranix_customer_contacts
  await createTableIfMissing('shranix_customer_contacts', `
    CREATE TABLE shranix_customer_contacts (
      ${baseCols},
      customer_id TEXT NOT NULL,
      name TEXT NOT NULL,
      designation TEXT,
      mobile TEXT,
      email TEXT,
      is_primary INTEGER NOT NULL DEFAULT 0,
      created_by TEXT,
      updated_by TEXT
    )
  `);

  // 6. shranix_customer_documents
  await createTableIfMissing('shranix_customer_documents', `
    CREATE TABLE shranix_customer_documents (
      ${baseCols},
      customer_id TEXT NOT NULL,
      document_type TEXT NOT NULL,
      document_number TEXT,
      file_name TEXT,
      file_path TEXT,
      notes TEXT,
      created_by TEXT,
      updated_by TEXT
    )
  `);

  // 7. shranix_sales_payments
  await createTableIfMissing('shranix_sales_payments', `
    CREATE TABLE shranix_sales_payments (
      ${baseCols},
      payment_number TEXT NOT NULL,
      invoice_id TEXT,
      customer_id TEXT NOT NULL,
      payment_date TEXT NOT NULL,
      mode TEXT NOT NULL DEFAULT 'cash',
      amount REAL NOT NULL DEFAULT 0,
      reference_no TEXT,
      bank_name TEXT,
      cheque_no TEXT,
      cheque_date TEXT,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'completed',
      is_advance INTEGER NOT NULL DEFAULT 0,
      created_by TEXT,
      updated_by TEXT
    )
  `);

  // 8. Create indexes for the new tables
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_customers_code ON shranix_customers(customer_code)',
    'CREATE INDEX IF NOT EXISTS idx_customers_status ON shranix_customers(status)',
    'CREATE INDEX IF NOT EXISTS idx_cust_addr_customer ON shranix_customer_addresses(customer_id)',
    'CREATE INDEX IF NOT EXISTS idx_cust_contact_customer ON shranix_customer_contacts(customer_id)',
    'CREATE INDEX IF NOT EXISTS idx_cust_doc_customer ON shranix_customer_documents(customer_id)',
    'CREATE INDEX IF NOT EXISTS idx_sales_payments_customer ON shranix_sales_payments(customer_id)',
    'CREATE INDEX IF NOT EXISTS idx_sales_payments_invoice ON shranix_sales_payments(invoice_id)',
  ];

  for (const idx of indexes) {
    try {
      await client.execute(idx);
    } catch (e) {
      // Index may already exist or table name mismatch — ignore
    }
  }

  // Verify
  console.log('\nVerification:');
  const needed = ['shranix_customers', 'shranix_customer_groups', 'shranix_customer_categories',
    'shranix_customer_addresses', 'shranix_customer_contacts', 'shranix_customer_documents',
    'shranix_sales_payments'];
  for (const t of needed) {
    console.log(`  ${await tableExists(t) ? '✅' : '❌'} ${t}`);
  }
}

main().catch(console.error);
