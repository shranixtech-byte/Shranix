import { createRequire } from 'node:module';
import path from 'node:path';
const req = createRequire(path.join(process.cwd(), 'database/package.json'));
const { createClient } = req('@libsql/client');

const c = createClient({ url: 'file:data/dev.db' });

async function run() {
  // Master table ids
  const master = await c.execute("SELECT id FROM shranix_customers WHERE name LIKE 'QA %' OR name LIKE 'QA Customer %'");
  const masterIds = master.rows.map((r) => r.id);

  // Ledger ids
  const ledger = await c.execute("SELECT id FROM shranix_ledger_master WHERE party_id LIKE 'QA %' OR party_id LIKE 'QA Customer %'");
  const ledgerIds = ledger.rows.map((r) => r.id);

  const allIds = [...new Set([...masterIds, ...ledgerIds])];
  console.log('QA customer ids to purge:', allIds.length, JSON.stringify(allIds.slice(0, 5)));

  if (allIds.length === 0) {
    console.log('Nothing to clean.');
    return;
  }

  const placeholders = allIds.map(() => '?').join(',');
  for (const t of ['shranix_customer_addresses', 'shranix_customer_contacts', 'shranix_customer_documents']) {
    try {
      const r = await c.execute(`DELETE FROM ${t} WHERE customer_id IN (${placeholders})`, allIds);
      console.log(`${t}: removed ${r.rowsAffected}`);
    } catch (e) {
      console.log(`${t}: skipped (${e.message})`);
    }
  }

  for (const t of ['shranix_customers', 'shranix_ledger_master']) {
    try {
      const r = await c.execute(`DELETE FROM ${t} WHERE id IN (${placeholders})`, allIds);
      console.log(`${t}: removed ${r.rowsAffected}`);
    } catch (e) {
      console.log(`${t}: skipped (${e.message})`);
    }
  }

  // Any orphaned children (customer row deleted earlier by QA runs)
  for (const t of ['shranix_customer_addresses', 'shranix_customer_contacts', 'shranix_customer_documents']) {
    try {
      const r = await c.execute(
        `DELETE FROM ${t} WHERE customer_id NOT IN (SELECT id FROM shranix_customers WHERE is_deleted = 0)`,
      );
      if (r.rowsAffected > 0) console.log(`${t}: orphan cleanup ${r.rowsAffected}`);
    } catch (e) {
      /* ignore */
    }
  }

  const check = await c.execute("SELECT COUNT(*) AS c FROM shranix_customers WHERE name LIKE 'QA %'");
  console.log('Remaining QA customers:', check.rows[0].c);
}

run().catch((e) => {
  console.error('cleanup failed:', e.message);
  process.exit(1);
});
