#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════
// MODULE-BY-MODULE FUNCTIONAL AUDIT — SHRANIX KRUSHI ERP
// ═══════════════════════════════════════════════════════════════

const BASE = 'http://127.0.0.1:4001/api/v1';
let TOKEN, CSRF, H;

async function init() {
  const loginRes = await fetch(BASE + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@shranix.com', password: 'admin123' }),
  });
  const loginData = await loginRes.json();
  TOKEN = loginData.data.tokens.accessToken;
  const setCookies = loginRes.headers.getSetCookie?.() || [];
  const csrfMatch = setCookies.join('; ').match(/csrf_token=([^;]+)/);
  CSRF = csrfMatch ? csrfMatch[1] : '';
  H = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + TOKEN,
    'x-csrf-token': CSRF,
    'Cookie': 'csrf_token=' + CSRF,
  };
}

async function api(method, path, body) {
  const opts = { method, headers: H };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(BASE + path, opts);
  const d = await r.json().catch(() => ({}));
  return { status: r.status, ok: r.ok, data: d };
}

let passed = 0, failed = 0, bugs = [];
function check(name, ok, msg) {
  if (ok) { console.log('  ✓', name); passed++; }
  else { console.log('  ✗', name + ':', msg || 'FAIL'); failed++; bugs.push(name + ': ' + (msg || 'FAIL')); }
}

async function auditModule(name, tests) {
  console.log('\n━━━ ' + name + ' ━━━');
  for (const t of tests) {
    try { await t(); } catch(e) { check(t.name || 'unknown', false, e.message); }
  }
}

async function crudCycle(name, createPath, createBody, listPath, detailPath, updateBody) {
  const c = await api('POST', createPath, createBody);
  check(name + ' create', c.ok && c.data?.success, 'HTTP ' + c.status + ' ' + JSON.stringify(c.data).substring(0, 120));
  const id = c.data?.data?.id;
  if (!id) return;
  const d = await api('GET', detailPath.replace(':id', id));
  check(name + ' detail', d.ok && d.data?.success, 'HTTP ' + d.status);
  const l = await api('GET', listPath + '?page=1&pageSize=50');
  const found = (l.data?.data?.data || l.data?.data || []).some(r => r.id === id);
  check(name + ' in list', l.ok && found, 'not found in list');
  if (updateBody) {
    const u = await api('PUT', detailPath.replace(':id', id), updateBody);
    check(name + ' update', u.ok && u.data?.success, 'HTTP ' + u.status);
  }
  const del = await api('DELETE', detailPath.replace(':id', id));
  check(name + ' delete', del.ok && del.data?.success, 'HTTP ' + del.status);
  const v = await api('GET', detailPath.replace(':id', id));
  check(name + ' soft-deleted', !v.ok || !v.data?.data, 'still accessible after delete');
}

async function run() {
  await init();

  // ═══ MODULE 1: DASHBOARD ═══
  await auditModule('DASHBOARD', [
    async () => { const r = await api('GET', '/dashboard'); check('Dashboard loads', r.ok && r.data?.success, 'HTTP ' + r.status); },
  ]);

  // ═══ MODULE 2: CUSTOMERS ═══
  await auditModule('CUSTOMERS', [
    async () => { const l = await api('GET', '/customers?page=1&pageSize=5'); check('List loads', l.ok && l.data?.success, 'HTTP ' + l.status); check('Has pagination', l.data?.data?.total !== undefined, 'no total'); },
    async () => { const s = await api('GET', '/customers?search=test&page=1&pageSize=5'); check('Search works', s.ok, 'HTTP ' + s.status); },
    async () => { await crudCycle('Customer', '/customers', { name: 'QA Audit Customer', mobile: '9112223330', status: 'active' }, '/customers', '/customers/:id', { name: 'QA Audit Customer Updated' }); },
    async () => { const r = await api('POST', '/customers', { mobile: '999' }); check('Validates required name', !r.ok || !r.data?.success, 'should reject'); },
    async () => {
      const c1 = await api('POST', '/customers', { name: 'Dup GSTIN 1', gstin: '27AABCU9603R1ZM' });
      if (c1.ok && c1.data?.success) {
        const c2 = await api('POST', '/customers', { name: 'Dup GSTIN 2', gstin: '27AABCU9603R1ZM' });
        check('Duplicate GSTIN rejected', !c2.ok || !c2.data?.success, 'should reject');
        await api('DELETE', '/customers/' + c1.data.data.id);
      }
    },
  ]);

  // ═══ MODULE 3-6: SALES ═══
  await auditModule('SALES QUOTATIONS', [
    async () => { const l = await api('GET', '/sales/quotations?page=1&pageSize=5'); check('List loads', l.ok && l.data?.success, 'HTTP ' + l.status); },
    async () => { const n = await api('GET', '/sales/quotations/next-number'); check('Next number', n.ok && n.data?.success, 'HTTP ' + n.status); },
    async () => {
      const cust = await api('POST', '/customers', { name: 'QA Quot Cust', mobile: '9888000001', status: 'active' });
      if (cust.ok && cust.data?.success) {
        const q = await api('POST', '/sales/quotations', {
          customerId: cust.data.data.id, quotationDate: '2026-08-24',
          items: [{ itemId: 'test-item', description: 'Test', quantity: 1, unitPrice: 100 }],
        });
        check('Create', q.ok && q.data?.success, 'HTTP ' + q.status + ' ' + JSON.stringify(q.data).substring(0, 200));
        if (q.ok && q.data?.success) {
          const d = await api('GET', '/sales/quotations/' + q.data.data.id);
          check('Detail', d.ok && d.data?.success, 'HTTP ' + d.status);
          await api('DELETE', '/sales/quotations/' + q.data.data.id);
        }
        await api('DELETE', '/customers/' + cust.data.data.id);
      }
    },
  ]);

  await auditModule('SALES ORDERS', [
    async () => { const l = await api('GET', '/sales/orders?page=1&pageSize=5'); check('List loads', l.ok && l.data?.success, 'HTTP ' + l.status); },
    async () => { const n = await api('GET', '/sales/orders/next-number'); check('Next number', n.ok && n.data?.success, 'HTTP ' + n.status); },
  ]);

  await auditModule('INVOICES', [
    async () => { const l = await api('GET', '/sales/invoices?page=1&pageSize=5'); check('List loads', l.ok && l.data?.success, 'HTTP ' + l.status); },
    async () => { const n = await api('GET', '/sales/invoices/next-number'); check('Next number', n.ok && n.data?.success, 'HTTP ' + n.status); },
  ]);

  await auditModule('DELIVERY CHALLANS', [
    async () => { const l = await api('GET', '/sales/delivery-challans?page=1&pageSize=5'); check('List loads', l.ok && l.data?.success, 'HTTP ' + l.status); },
  ]);

  await auditModule('SALES RETURNS', [
    async () => { const l = await api('GET', '/sales/returns?page=1&pageSize=5'); check('List loads', l.ok && l.data?.success, 'HTTP ' + l.status); },
  ]);

  await auditModule('SALES REPORTS', [
    async () => { const r = await api('GET', '/sales/reports/summary'); check('Summary report', r.ok, 'HTTP ' + r.status); },
    async () => { const r = await api('GET', '/sales/reports/outstanding'); check('Outstanding report', r.ok, 'HTTP ' + r.status); },
  ]);

  await auditModule('SALES PAYMENTS', [
    async () => { const l = await api('GET', '/sales/payments?page=1&pageSize=5'); check('List loads', l.ok, 'HTTP ' + l.status); },
  ]);

  // ═══ MODULE 8: PRODUCTS ═══
  await auditModule('PRODUCTS', [
    async () => { const l = await api('GET', '/products?page=1&pageSize=5'); check('List loads', l.ok && l.data?.success, 'HTTP ' + l.status); },
    async () => { const d = await api('GET', '/products/dashboard'); check('Dashboard loads', d.ok && d.data?.success, 'HTTP ' + d.status); },
    async () => { const s = await api('GET', '/products/search?q=test'); check('Search works', s.ok, 'HTTP ' + s.status); },
    async () => {
      const c = await api('POST', '/products', { name: 'QA Audit Product', sku: 'QA-PROD-001', productCode: 'PRD-9999', type: 'product', status: 'active', mrp: 500, purchaseRate: 400, salesRate: 450 });
      check('Create', c.ok && c.data?.success, 'HTTP ' + c.status + ' ' + JSON.stringify(c.data).substring(0, 150));
      const id = c.data?.data?.id;
      if (id) {
        const det = await api('GET', '/products/' + id); check('Detail', det.ok && det.data?.success, 'HTTP ' + det.status);
        const u = await api('PUT', '/products/' + id, { name: 'QA Audit Product Updated', salesRate: 475 }); check('Update', u.ok && u.data?.success, 'HTTP ' + u.status);
        const del = await api('DELETE', '/products/' + id); check('Delete', del.ok && del.data?.success, 'HTTP ' + del.status);
      }
    },
    async () => {
      const c1 = await api('POST', '/products', { name: 'Dup SKU 1', sku: 'DUP-SKU-TEST' });
      if (c1.ok && c1.data?.success) {
        const c2 = await api('POST', '/products', { name: 'Dup SKU 2', sku: 'DUP-SKU-TEST' });
        check('Duplicate SKU rejected', !c2.ok || !c2.data?.success, 'should reject');
        await api('DELETE', '/products/' + c1.data.data.id);
      }
    },
  ]);

  // ═══ MODULE 9: INVENTORY ═══
  await auditModule('INVENTORY', [
    async () => { const l = await api('GET', '/inventory/stock-ledger?page=1&pageSize=5'); check('Stock ledger', l.ok, 'HTTP ' + l.status); },
    async () => { const l = await api('GET', '/inventory/stock-adjustments?page=1&pageSize=5'); check('Stock adjustments', l.ok, 'HTTP ' + l.status); },
    async () => { const l = await api('GET', '/inventory/stock-transfers?page=1&pageSize=5'); check('Stock transfers', l.ok, 'HTTP ' + l.status); },
    async () => { const l = await api('GET', '/inventory/stock-movements?page=1&pageSize=5'); check('Stock movements', l.ok, 'HTTP ' + l.status); },
  ]);

  // ═══ MODULE 10-11: SUPPLIERS + PURCHASE ═══
  await auditModule('SUPPLIERS', [
    async () => { const l = await api('GET', '/suppliers?page=1&pageSize=5'); check('List loads', l.ok && l.data?.success, 'HTTP ' + l.status); },
    async () => { await crudCycle('Supplier', '/suppliers', { name: 'QA Audit Supplier', mobile: '9777000001', status: 'active' }, '/suppliers', '/suppliers/:id', { name: 'QA Audit Supplier Updated' }); },
  ]);

  await auditModule('PURCHASE ORDERS', [
    async () => { const l = await api('GET', '/purchase/orders?page=1&pageSize=5'); check('List loads', l.ok && l.data?.success, 'HTTP ' + l.status); },
    async () => { const n = await api('GET', '/purchase/orders/next-number'); check('Next number', n.ok && n.data?.success, 'HTTP ' + n.status); },
  ]);

  await auditModule('PURCHASE INVOICES', [
    async () => { const l = await api('GET', '/purchase/invoices?page=1&pageSize=5'); check('List loads', l.ok && l.data?.success, 'HTTP ' + l.status); },
    async () => { const n = await api('GET', '/purchase/invoices/next-number'); check('Next number', n.ok && n.data?.success, 'HTTP ' + n.status); },
  ]);

  await auditModule('PURCHASE RETURNS', [
    async () => { const l = await api('GET', '/purchase/returns?page=1&pageSize=5'); check('List loads', l.ok && l.data?.success, 'HTTP ' + l.status); },
  ]);

  await auditModule('PURCHASE PAYMENTS', [
    async () => { const l = await api('GET', '/purchase/payments?page=1&pageSize=5'); check('List loads', l.ok, 'HTTP ' + l.status); },
  ]);

  // ═══ MODULE 13: FINANCE ═══
  await auditModule('FINANCE', [
    async () => { for (const e of ['chart-of-accounts', 'account-groups', 'ledgers', 'journal-entries', 'cash-book', 'bank-book', 'cost-centers', 'settings']) { const l = await api('GET', '/finance/' + e + '?page=1&pageSize=5'); check('finance/' + e, l.ok, 'HTTP ' + l.status); } },
  ]);

  await auditModule('GL', [
    async () => { const l = await api('GET', '/gl/entries?page=1&pageSize=5'); check('GL entries', l.ok, 'HTTP ' + l.status); },
    async () => { const l = await api('GET', '/gl/reports/trial-balance'); check('Trial balance', l.ok, 'HTTP ' + l.status); },
    async () => { const l = await api('GET', '/gl/reports/profit-and-loss'); check('P&L report', l.ok, 'HTTP ' + l.status); },
    async () => { const l = await api('GET', '/gl/reports/balance-sheet'); check('Balance sheet', l.ok, 'HTTP ' + l.status); },
  ]);

  // ═══ MODULE 14: CRM ═══
  await auditModule('CRM LEADS', [
    async () => { const l = await api('GET', '/crm/leads?page=1&pageSize=5'); check('List loads', l.ok && l.data?.success, 'HTTP ' + l.status); },
    async () => { await crudCycle('Lead', '/crm/leads', { name: 'QA Lead', source: 'website', status: 'new', expectedValue: 50000 }, '/crm/leads', '/crm/leads/:id', { name: 'QA Lead Updated' }); },
  ]);

  await auditModule('CRM OPPORTUNITIES', [
    async () => { const l = await api('GET', '/crm/opportunities?page=1&pageSize=5'); check('List loads', l.ok && l.data?.success, 'HTTP ' + l.status); },
    async () => { await crudCycle('Opportunity', '/crm/opportunities', { name: 'QA Opp', stage: 'prospecting', estimatedValue: 100000 }, '/crm/opportunities', '/crm/opportunities/:id', { name: 'QA Opp Updated' }); },
  ]);

  await auditModule('CRM FOLLOW-UPS & TASKS', [
    async () => { const l = await api('GET', '/crm/follow-ups?page=1&pageSize=5'); check('Follow-ups', l.ok, 'HTTP ' + l.status); },
    async () => { const l = await api('GET', '/crm/tasks?page=1&pageSize=5'); check('Tasks', l.ok, 'HTTP ' + l.status); },
    async () => { const l = await api('GET', '/crm/calls?page=1&pageSize=5'); check('Calls', l.ok, 'HTTP ' + l.status); },
    async () => { const l = await api('GET', '/crm/meetings?page=1&pageSize=5'); check('Meetings', l.ok, 'HTTP ' + l.status); },
    async () => { const l = await api('GET', '/crm/notes?page=1&pageSize=5'); check('Notes', l.ok, 'HTTP ' + l.status); },
  ]);

  // ═══ MODULE 15: HR ═══
  await auditModule('HR EMPLOYEES', [
    async () => { const l = await api('GET', '/hr/employees?page=1&pageSize=5'); check('List loads', l.ok && l.data?.success, 'HTTP ' + l.status); },
    async () => { const n = await api('GET', '/hr/employees/next-code'); check('Next code', n.ok && n.data?.success && /^EMP-/.test(n.data.data?.nextCode), 'bad format'); },
    async () => { await crudCycle('Employee', '/hr/employees', { firstName: 'QA', lastName: 'TestEmp', employeeCode: 'EMP-QA-001', status: 'active' }, '/hr/employees', '/hr/employees/:id', { firstName: 'QA Updated' }); },
  ]);

  await auditModule('HR OTHER', [
    async () => { for (const e of ['departments', 'designations', 'shifts', 'holidays', 'attendance', 'leave', 'payroll', 'advances', 'expenses', 'performance']) { const l = await api('GET', '/hr/' + e + '?page=1&pageSize=5'); check('hr/' + e, l.ok, 'HTTP ' + l.status); } },
  ]);

  // ═══ MODULE 16: ASSETS ═══
  await auditModule('ASSETS', [
    async () => { const l = await api('GET', '/assets?page=1&pageSize=5'); check('List loads', l.ok && l.data?.success, 'HTTP ' + l.status); },
    async () => { const n = await api('GET', '/assets/next-code'); check('Next code', n.ok && n.data?.success && /^AST-/.test(n.data.data?.nextCode), 'bad format'); },
    async () => { await crudCycle('Asset', '/assets', { assetName: 'QA Test Asset', assetCode: 'AST-QA-001', assetType: 'fixed_asset', status: 'available' }, '/assets', '/assets/:id', { assetName: 'QA Test Asset Updated' }); },
  ]);

  await auditModule('EXPENSES', [
    async () => { const l = await api('GET', '/expenses?page=1&pageSize=5'); check('List loads', l.ok, 'HTTP ' + l.status); },
  ]);

  // ═══ MODULE 17: GST ═══
  await auditModule('GST', [
    async () => { for (const e of ['registrations', 'ledger', 'returns', 'tax-postings', 'settings', 'config', 'reports']) { const l = await api('GET', '/gst/' + e + '?page=1&pageSize=5'); check('gst/' + e, l.ok, 'HTTP ' + l.status); } },
  ]);

  // ═══ MODULE 18: MASTERS ═══
  await auditModule('MASTERS', [
    async () => { for (const e of ['companies', 'financial-years', 'branches', 'warehouses', 'units', 'categories', 'brands', 'tax-groups', 'gst-rates']) { const l = await api('GET', '/' + e + '?page=1&pageSize=5'); check('Master: ' + e, l.ok, 'HTTP ' + l.status); } },
  ]);

  await auditModule('USERS & ROLES', [
    async () => { const l = await api('GET', '/users?page=1&pageSize=5'); check('Users', l.ok, 'HTTP ' + l.status); },
    async () => { const l = await api('GET', '/roles?page=1&pageSize=5'); check('Roles', l.ok, 'HTTP ' + l.status); },
    async () => { const l = await api('GET', '/permissions?page=1&pageSize=5'); check('Permissions', l.ok, 'HTTP ' + l.status); },
  ]);

  // ═══ MODULE 19: WORKFLOW + DMS ═══
  await auditModule('WORKFLOW', [
    async () => { const l = await api('GET', '/workflow/instances?page=1&pageSize=5'); check('Instances', l.ok, 'HTTP ' + l.status); },
    async () => { const l = await api('GET', '/workflow/templates?page=1&pageSize=5'); check('Templates', l.ok, 'HTTP ' + l.status); },
  ]);

  await auditModule('DMS', [
    async () => { const l = await api('GET', '/dms?page=1&pageSize=5'); check('Documents', l.ok, 'HTTP ' + l.status); },
  ]);

  // ═══ MODULE 20: NOTIFICATIONS + AI ═══
  await auditModule('NOTIFICATIONS', [
    async () => { const l = await api('GET', '/notifications/settings'); check('Settings', l.ok, 'HTTP ' + l.status); },
  ]);

  await auditModule('AI', [
    async () => { const l = await api('GET', '/ai/health'); check('Health', l.ok, 'HTTP ' + l.status); },
  ]);

  // ═══ MODULE 21: REMAINING ═══
  await auditModule('BACKUP + AUDIT + HEALTH', [
    async () => { const l = await api('GET', '/backup'); check('Backup', l.ok, 'HTTP ' + l.status); },
    async () => { const l = await api('GET', '/audit-trail?page=1&pageSize=5'); check('Audit trail', l.ok, 'HTTP ' + l.status); },
    async () => { const r = await fetch('http://127.0.0.1:4001/v1/health'); const d = await r.json(); check('Health', d.success && d.data?.status === 'ok', JSON.stringify(d)); },
  ]);

  // ═══ SUMMARY ═══
  console.log('\n' + '═'.repeat(50));
  console.log('MODULE-BY-MODULE AUDIT COMPLETE');
  console.log('═'.repeat(50));
  console.log('Total checks:', passed + failed);
  console.log('PASSED:', passed);
  console.log('FAILED:', failed);
  if (bugs.length > 0) {
    console.log('\nBugs found:');
    bugs.forEach((b, i) => console.log('  ' + (i + 1) + '.', b));
  }
}

run().catch(e => { console.error('FATAL:', e); process.exit(1); });
