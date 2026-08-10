import { createRequire } from 'node:module';
import path from 'node:path';

const req = createRequire(path.join(process.cwd(), 'database/package.json'));
const { createClient } = req('@libsql/client');

const c = createClient({ url: 'file:data/dev.db' });

const cols = await c.execute('PRAGMA table_info(shranix_ledger_master)');
console.log('ledger_master cols:', cols.rows.map((x) => x.name).join(','));
