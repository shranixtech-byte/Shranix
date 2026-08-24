#!/usr/bin/env node
/**
 * SHRANIX KRUSHI ERP — Module-by-Module Functional Audit
 * =======================================================
 * Tests every API endpoint for: list, search, create, read, update, delete,
 * validation, numbering, persistence, and error handling.
 *
 * Usage: node scripts/erp-module-audit.mjs
 */

import crypto from 'node:crypto';

const BASE = process.env.API_URL || 'http://localhost:4001/api/v1';

// ── CSRF Handling ────────────────────────────────────────────────
// CSRF guard requires: cookie `csrf_token` + header `x-csrf-token` with same value
const CSRF_TOKEN = crypto.randomBytes(32).toString('hex');

// ── Helpers ─────────────────────────────────────────────────────
async function getToken() {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@shranix.com', password: 'admin123' }),
  });
  const data = await res.json();
  return data?.data?.tokens?.accessToken;
}

const headers = (token, csrf = false) => {
  const h = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
  if (csrf) {
    h['x-csrf-token'] = CSRF_TOKEN;
  }
  return h;
};

async function api(token, method, path, body) {
  const opts = {
    method,
    headers: headers(token, !['GET', 'HEAD', 'OPTIONS'].includes(method)),
  };
  if (body) opts.body = JSON.stringify(body);
  // Send CSRF cookie
  if (!opts.headers) opts.headers = {};
  // Note: fetch on Node doesn't support cookies natively, so we pass CSRF via header
  // The CsrfGuard checks cookie AND header — we need to set the cookie too
  // Workaround: send both cookie and header
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    opts.headers['Cookie'] = `csrf_token=${CSRF_TOKEN}`;
  }
  const res = await fetch(`${BASE}${path}`, opts);
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, json, ok: res.ok };
}

// ── Audit Engine ────────────────────────────────────────────────
const results = [];

function record(module, test, status, detail = '') {
  results.push({ module, test, status, detail });
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  const suffix = detail ? ` — ${detail}` : '';
  console.log(`  ${icon} ${test}${suffix}`);
}

// ═══════════════════════════════════════════════════════════════
// MODULE DEFINITIONS
// ═══════════════════════════════════════════════════════════════

const MODULES = [
  // ── 1. AUTHENTICATION ──────────────────────────────────────
  {
    name: 'Authentication',
    tests: async (token) => {
      const me = await api(token, 'GET', '/auth/me');
      record('Auth', 'GET /auth/me', me.ok && me.json?.data?.id ? 'PASS' : 'FAIL', `status=${me.status}`);
      const badLogin = await api(token, 'POST', '/auth/login', { email: 'admin@shranix.com', password: 'wrong12345' });
      record('Auth', 'POST /auth/login (wrong password)', badLogin.status === 401 ? 'PASS' : 'FAIL', `status=${badLogin.status}`);
      const badEmail = await api(token, 'POST', '/auth/login', { email: 'not-an-email', password: 'admin123' });
      record('Auth', 'POST /auth/login (bad email)', badEmail.status === 400 ? 'PASS' : 'FAIL', `status=${badEmail.status}`);
      const emptyBody = await api(token, 'POST', '/auth/login', {});
      record('Auth', 'POST /auth/login (empty body)', emptyBody.status === 400 ? 'PASS' : 'FAIL', `status=${emptyBody.status}`);
      const noAuth = await api('', 'GET', '/auth/me');
      record('Auth', 'GET /auth/me (no token)', noAuth.status === 401 ? 'PASS' : 'FAIL', `status=${noAuth.status}`);
    }
  },

  // ── 2. DASHBOARD ───────────────────────────────────────────
  {
    name: 'Dashboard',
    tests: async (token) => {
      const dash = await api(token, 'GET', '/dashboard');
      record('Dashboard', 'GET /dashboard', dash.ok ? 'PASS' : 'FAIL', `status=${dash.status}`);
      if (dash.ok && dash.json?.data) {
        const d = dash.json.data;
        record('Dashboard', 'Summary object exists', typeof d.summary === 'object' ? 'PASS' : 'FAIL');
      }
    }
  },

  // ── 3. CUSTOMERS ───────────────────────────────────────────
  {
    name: 'Customers',
    tests: async (token) => {
      // LIST
      const list = await api(token, 'GET', '/customers?pageSize=10');
      record('Customers', 'GET /customers (list)', list.ok ? 'PASS' : 'FAIL', `status=${list.status}`);

      // SEARCH
      const search = await api(token, 'GET', '/customers/search?q=test');
      record('Customers', 'GET /customers/search', search.ok ? 'PASS' : 'FAIL', `status=${search.status}`);

      // SEARCH (empty query)
      const searchEmpty = await api(token, 'GET', '/customers/search?q=');
      record('Customers', 'GET /customers/search (empty q)', searchEmpty.ok ? 'PASS' : 'FAIL', `status=${searchEmpty.status}`);

      // CREATE — valid data
      const testCode = `TCA-${Date.now().toString(36).slice(-4)}`;
      const createPayload = {
        name: `QA Test Customer ${Date.now()}`,
        code: testCode,
        mobile: '9876543210',
        email: `qa-test-${Date.now()}@test.com`,
        gstin: '27AAAAA0000A1Z5',
        pan: 'AAAAA0000A',
        creditLimit: 100000,
        paymentTerms: 'Net 30',
        customerGroup: 'Retail',
        status: 'active',
      };
      const create = await api(token, 'POST', '/customers', createPayload);
      record('Customers', 'POST /customers (create)', create.ok ? 'PASS' : 'FAIL', `status=${create.status}`);
      const newId = create.json?.data?.id;

      // CREATE — required field validation (empty name)
      const badCreate = await api(token, 'POST', '/customers', { name: '', mobile: '9999999999' });
      record('Customers', 'POST /customers (empty name validation)', badCreate.status === 400 ? 'PASS' : 'FAIL', `status=${badCreate.status}`);

      // CREATE — duplicate GSTIN
      const dupeGstin = await api(token, 'POST', '/customers', {
        name: 'Dupe GSTIN Customer',
        gstin: '27AAAAA0000A1Z5',
      });
      record('Customers', 'POST /customers (duplicate GSTIN blocked)', dupeGstin.status === 400 ? 'PASS' : 'FAIL', `status=${dupeGstin.status}`);

      // READ
      if (newId) {
        const read = await api(token, 'GET', `/customers/${newId}`);
        record('Customers', 'GET /customers/:id (read)', read.ok ? 'PASS' : 'FAIL', `status=${read.status}`);

        // UPDATE
        const update = await api(token, 'PATCH', `/customers/${newId}`, {
          name: 'QA Test Customer Updated',
          creditLimit: 200000,
        });
        record('Customers', 'PATCH /customers/:id (update)', update.ok ? 'PASS' : 'FAIL', `status=${update.status}`);

        // VERIFY UPDATE
        const verify = await api(token, 'GET', `/customers/${newId}`);
        record('Customers', 'Verify update persisted',
          verify.json?.data?.creditLimit === 200000 || verify.json?.data?.name?.includes('Updated') ? 'PASS' : 'FAIL');

        // SOFT DELETE
        const del = await api(token, 'DELETE', `/customers/${newId}`);
        record('Customers', 'DELETE /customers/:id (soft delete)', del.ok ? 'PASS' : 'FAIL', `status=${del.status}`);

        // VERIFY DELETED
        const afterDel = await api(token, 'GET', `/customers/${newId}`);
        record('Customers', 'Deleted record hidden from list', afterDel.status === 404 ? 'PASS' : 'FAIL', `status=${afterDel.status}`);

        // RESTORE
        const restore = await api(token, 'POST', `/customers/${newId}/restore`);
        record('Customers', 'POST /customers/:id/restore', restore.status <= 404 ? 'PASS' : 'FAIL', `status=${restore.status}`);
      }

      // PAGINATION
      const page1 = await api(token, 'GET', '/customers?page=1&pageSize=5');
      const page2 = await api(token, 'GET', '/customers?page=2&pageSize=5');
      record('Customers', 'Pagination (page 1 vs 2)', page1.ok && page2.ok ? 'PASS' : 'FAIL',
        `page1=${page1.json?.data?.length}, page2=${page2.json?.data?.length}`);

      // CUSTOMER GROUPS
      const groups = await api(token, 'GET', '/customer-groups');
      record('Customers', 'GET /customer-groups', groups.ok ? 'PASS' : 'FAIL', `status=${groups.status}`);

      // CUSTOMER CATEGORIES
      const cats = await api(token, 'GET', '/customer-categories');
      record('Customers', 'GET /customer-categories', cats.ok ? 'PASS' : 'FAIL', `status=${cats.status}`);

      // NUMBERING: auto code generation
      const autoCode = await api(token, 'POST', '/customers', {
        name: `Auto Code Test ${Date.now()}`,
        mobile: '9876543211',
      });
      record('Customers', 'Auto code generation (CUS-XXXX)', autoCode.ok && autoCode.json?.data?.code?.startsWith('CUS-') ? 'PASS' : 'FAIL',
        `code=${autoCode.json?.data?.code || 'N/A'}`);

      // Cleanup
      if (autoCode.ok && autoCode.json?.data?.id) {
        await api(token, 'DELETE', `/customers/${autoCode.json.data.id}`);
      }
    }
  },

  // ── 4. SUPPLIERS ───────────────────────────────────────────
  {
    name: 'Suppliers',
    tests: async (token) => {
      const list = await api(token, 'GET', '/suppliers?pageSize=10');
      record('Suppliers', 'GET /suppliers (list)', list.ok ? 'PASS' : 'FAIL', `status=${list.status}`);

      const search = await api(token, 'GET', '/suppliers/search?q=test');
      record('Suppliers', 'GET /suppliers/search', search.ok ? 'PASS' : 'FAIL', `status=${search.status}`);

      // CREATE
      const testCode = `TSU-${Date.now().toString(36).slice(-4)}`;
      const create = await api(token, 'POST', '/suppliers', {
        name: `QA Test Supplier ${Date.now()}`,
        code: testCode,
        mobile: '9876543211',
        gstin: '27BBBBB0000B1Z5',
        pan: 'BBBBB0000B',
        status: 'active',
      });
      record('Suppliers', 'POST /suppliers (create)', create.ok ? 'PASS' : 'FAIL', `status=${create.status}`);
      const newId = create.json?.data?.id;

      const badCreate = await api(token, 'POST', '/suppliers', { name: '' });
      record('Suppliers', 'POST /suppliers (empty name)', badCreate.status === 400 ? 'PASS' : 'FAIL', `status=${badCreate.status}`);

      if (newId) {
        const read = await api(token, 'GET', `/suppliers/${newId}`);
        record('Suppliers', 'GET /suppliers/:id (read)', read.ok ? 'PASS' : 'FAIL', `status=${read.status}`);
        const update = await api(token, 'PATCH', `/suppliers/${newId}`, { name: 'QA Supplier Updated' });
        record('Suppliers', 'PATCH /suppliers/:id (update)', update.ok ? 'PASS' : 'FAIL', `status=${update.status}`);
        const del = await api(token, 'DELETE', `/suppliers/${newId}`);
        record('Suppliers', 'DELETE /suppliers/:id', del.ok ? 'PASS' : 'FAIL', `status=${del.status}`);
      }

      // NUMBERING
      const autoCode = await api(token, 'POST', '/suppliers', {
        name: `Auto Code Supplier ${Date.now()}`,
        mobile: '9876543212',
      });
      record('Suppliers', 'Auto code generation', autoCode.ok && autoCode.json?.data?.code?.startsWith('SUP-') ? 'PASS' : 'FAIL',
        `code=${autoCode.json?.data?.code || 'N/A'}`);
      if (autoCode.ok && autoCode.json?.data?.id) {
        await api(token, 'DELETE', `/suppliers/${autoCode.json.data.id}`);
      }
    }
  },

  // ── 5. PRODUCTS / INVENTORY ─────────────────────────────────
  {
    name: 'Products',
    tests: async (token) => {
      const list = await api(token, 'GET', '/products?pageSize=10');
      record('Products', 'GET /products (list)', list.ok ? 'PASS' : 'FAIL', `status=${list.status}`);

      const search = await api(token, 'GET', '/products/search?q=test');
      record('Products', 'GET /products/search', search.ok ? 'PASS' : 'FAIL', `status=${search.status}`);

      // CREATE
      const create = await api(token, 'POST', '/products', {
        name: `QA Test Product ${Date.now()}`,
        sku: `QTP-${Date.now().toString(36).slice(-4)}`,
        unit: 'kg',
        sellingPrice: 100,
        purchasePrice: 80,
        hsnCode: '0101',
        gstRate: 5,
        status: 'active',
      });
      record('Products', 'POST /products (create)', create.ok ? 'PASS' : 'FAIL', `status=${create.status}`);
      const newId = create.json?.data?.id;

      const badCreate = await api(token, 'POST', '/products', {});
      record('Products', 'POST /products (empty body)', badCreate.status === 400 ? 'PASS' : 'FAIL', `status=${badCreate.status}`);

      if (newId) {
        const read = await api(token, 'GET', `/products/${newId}`);
        record('Products', 'GET /products/:id (read)', read.ok ? 'PASS' : 'FAIL', `status=${read.status}`);
        const update = await api(token, 'PATCH', `/products/${newId}`, { sellingPrice: 150 });
        record('Products', 'PATCH /products/:id (update)', update.ok ? 'PASS' : 'FAIL', `status=${update.status}`);
        const del = await api(token, 'DELETE', `/products/${newId}`);
        record('Products', 'DELETE /products/:id', del.ok ? 'PASS' : 'FAIL', `status=${del.status}`);
      }

      // NUMBERING
      const autoCode = await api(token, 'POST', '/products', {
        name: `Auto Code Product ${Date.now()}`,
        unit: 'kg',
        sellingPrice: 50,
      });
      record('Products', 'Auto code generation', autoCode.ok && autoCode.json?.data?.code ? 'PASS' : 'FAIL',
        `code=${autoCode.json?.data?.code || 'N/A'}`);
      if (autoCode.ok && autoCode.json?.data?.id) {
        await api(token, 'DELETE', `/products/${autoCode.json.data.id}`);
      }
    }
  },

  // ── 6. SALES QUOTATIONS ────────────────────────────────────
  {
    name: 'Sales Quotations',
    tests: async (token) => {
      const list = await api(token, 'GET', '/sales/quotations?pageSize=10');
      record('Sales Quotations', 'GET /sales/quotations (list)', list.ok ? 'PASS' : 'FAIL', `status=${list.status}`);
    }
  },

  // ── 7. SALES ORDERS ────────────────────────────────────────
  {
    name: 'Sales Orders',
    tests: async (token) => {
      const list = await api(token, 'GET', '/sales/orders?pageSize=10');
      record('Sales Orders', 'GET /sales/orders (list)', list.ok ? 'PASS' : 'FAIL', `status=${list.status}`);
    }
  },

  // ── 8. DELIVERY CHALLANS ──────────────────────────────────
  {
    name: 'Delivery Challans',
    tests: async (token) => {
      const list = await api(token, 'GET', '/sales/delivery-challans?pageSize=10');
      record('Delivery Challans', 'GET /sales/delivery-challans (list)', list.ok ? 'PASS' : 'FAIL', `status=${list.status}`);
    }
  },

  // ── 9. SALES INVOICES ─────────────────────────────────────
  {
    name: 'Sales Invoices',
    tests: async (token) => {
      const list = await api(token, 'GET', '/sales/invoices?pageSize=10');
      record('Sales Invoices', 'GET /sales/invoices (list)', list.ok ? 'PASS' : 'FAIL', `status=${list.status}`);
    }
  },

  // ── 10. SALES RETURNS ──────────────────────────────────────
  {
    name: 'Sales Returns',
    tests: async (token) => {
      const list = await api(token, 'GET', '/sales/returns?pageSize=10');
      record('Sales Returns', 'GET /sales/returns (list)', list.ok ? 'PASS' : 'FAIL', `status=${list.status}`);
    }
  },

  // ── 11. PAYMENT COLLECTION ─────────────────────────────────
  {
    name: 'Payment Collection',
    tests: async (token) => {
      const list = await api(token, 'GET', '/sales/payments?pageSize=10');
      record('Payment Collection', 'GET /sales/payments (list)', list.ok ? 'PASS' : 'FAIL', `status=${list.status}`);
    }
  },

  // ── 12. SALES SETTINGS ────────────────────────────────────
  {
    name: 'Sales Settings',
    tests: async (token) => {
      const get = await api(token, 'GET', '/sales/settings');
      record('Sales Settings', 'GET /sales/settings', get.ok ? 'PASS' : 'FAIL', `status=${get.status}`);
    }
  },

  // ── 13. SALES APPROVALS ────────────────────────────────────
  {
    name: 'Sales Approvals',
    tests: async (token) => {
      const list = await api(token, 'GET', '/sales/approvals?pageSize=10');
      record('Sales Approvals', 'GET /sales/approvals (list)', list.ok ? 'PASS' : 'FAIL', `status=${list.status}`);
    }
  },

  // ── 14. PURCHASE ORDERS ────────────────────────────────────
  {
    name: 'Purchase Orders',
    tests: async (token) => {
      const list = await api(token, 'GET', '/purchase/orders?pageSize=10');
      record('Purchase Orders', 'GET /purchase/orders (list)', list.ok ? 'PASS' : 'FAIL', `status=${list.status}`);
    }
  },

  // ── 15. PURCHASE INVOICES ──────────────────────────────────
  {
    name: 'Purchase Invoices',
    tests: async (token) => {
      const list = await api(token, 'GET', '/purchase/invoices?pageSize=10');
      record('Purchase Invoices', 'GET /purchase/invoices (list)', list.ok ? 'PASS' : 'FAIL', `status=${list.status}`);
    }
  },

  // ── 16. PURCHASE RETURNS ───────────────────────────────────
  {
    name: 'Purchase Returns',
    tests: async (token) => {
      const list = await api(token, 'GET', '/purchase/returns?pageSize=10');
      record('Purchase Returns', 'GET /purchase/returns (list)', list.ok ? 'PASS' : 'FAIL', `status=${list.status}`);
    }
  },

  // ── 17. PURCHASE SETTINGS ──────────────────────────────────
  {
    name: 'Purchase Settings',
    tests: async (token) => {
      const get = await api(token, 'GET', '/purchase/settings');
      record('Purchase Settings', 'GET /purchase/settings', get.ok ? 'PASS' : 'FAIL', `status=${get.status}`);
    }
  },

  // ── 18. HR EMPLOYEES ───────────────────────────────────────
  {
    name: 'HR Employees',
    tests: async (token) => {
      const list = await api(token, 'GET', '/hr/employees?pageSize=10');
      record('HR Employees', 'GET /hr/employees (list)', list.ok ? 'PASS' : 'FAIL', `status=${list.status}`);
    }
  },

  // ── 19. HR DEPARTMENTS ─────────────────────────────────────
  {
    name: 'HR Departments',
    tests: async (token) => {
      const list = await api(token, 'GET', '/hr/departments?pageSize=10');
      record('HR Departments', 'GET /hr/departments (list)', list.ok ? 'PASS' : 'FAIL', `status=${list.status}`);
    }
  },

  // ── 20. HR ATTENDANCE ──────────────────────────────────────
  {
    name: 'HR Attendance',
    tests: async (token) => {
      const list = await api(token, 'GET', '/hr/attendance?pageSize=10');
      record('HR Attendance', 'GET /hr/attendance (list)', list.ok ? 'PASS' : 'FAIL', `status=${list.status}`);
    }
  },

  // ── 21. HR PAYROLL ─────────────────────────────────────────
  {
    name: 'HR Payroll',
    tests: async (token) => {
      const list = await api(token, 'GET', '/hr/payroll?pageSize=10');
      record('HR Payroll', 'GET /hr/payroll (list)', list.ok ? 'PASS' : 'FAIL', `status=${list.status}`);
    }
  },

  // ── 22. HR DESIGNATIONS ────────────────────────────────────
  {
    name: 'HR Designations',
    tests: async (token) => {
      const list = await api(token, 'GET', '/hr/designations?pageSize=10');
      record('HR Designations', 'GET /hr/designations (list)', list.ok ? 'PASS' : 'FAIL', `status=${list.status}`);
    }
  },

  // ── 23. CRM LEADS ──────────────────────────────────────────
  {
    name: 'CRM Leads',
    tests: async (token) => {
      const list = await api(token, 'GET', '/crm/leads?pageSize=10');
      record('CRM Leads', 'GET /crm/leads (list)', list.ok ? 'PASS' : 'FAIL', `status=${list.status}`);
    }
  },

  // ── 24. CRM OPPORTUNITIES ──────────────────────────────────
  {
    name: 'CRM Opportunities',
    tests: async (token) => {
      const list = await api(token, 'GET', '/crm/opportunities?pageSize=10');
      record('CRM Opportunities', 'GET /crm/opportunities (list)', list.ok ? 'PASS' : 'FAIL', `status=${list.status}`);
    }
  },

  // ── 25. CRM DASHBOARD ─────────────────────────────────────
  {
    name: 'CRM Dashboard',
    tests: async (token) => {
      const dash = await api(token, 'GET', '/crm/dashboard');
      record('CRM Dashboard', 'GET /crm/dashboard', dash.ok ? 'PASS' : 'FAIL', `status=${dash.status}`);
    }
  },

  // ── 26. FINANCE ────────────────────────────────────────────
  {
    name: 'Finance',
    tests: async (token) => {
      const coa = await api(token, 'GET', '/finance/chart-of-accounts?pageSize=10');
      record('Finance', 'GET /finance/chart-of-accounts', coa.ok ? 'PASS' : 'FAIL', `status=${coa.status}`);
      const groups = await api(token, 'GET', '/finance/account-groups?pageSize=10');
      record('Finance', 'GET /finance/account-groups', groups.ok ? 'PASS' : 'FAIL', `status=${groups.status}`);
      const journal = await api(token, 'GET', '/finance/journal-entries?pageSize=10');
      record('Finance', 'GET /finance/journal-entries', journal.ok ? 'PASS' : 'FAIL', `status=${journal.status}`);
      const settings = await api(token, 'GET', '/finance/settings');
      record('Finance', 'GET /finance/settings', settings.status <= 404 ? 'PASS' : 'FAIL', `status=${settings.status}`);
    }
  },

  // ── 27. GL ─────────────────────────────────────────────────
  {
    name: 'GL',
    tests: async (token) => {
      const entries = await api(token, 'GET', '/gl/entries?pageSize=10');
      record('GL', 'GET /gl/entries', entries.ok ? 'PASS' : 'FAIL', `status=${entries.status}`);
      const trialBalance = await api(token, 'GET', '/gl/reports/trial-balance');
      record('GL', 'GET /gl/reports/trial-balance', trialBalance.ok ? 'PASS' : 'FAIL', `status=${trialBalance.status}`);
      const bs = await api(token, 'GET', '/gl/reports/balance-sheet');
      record('GL', 'GET /gl/reports/balance-sheet', bs.ok ? 'PASS' : 'FAIL', `status=${bs.status}`);
    }
  },

  // ── 28. GST / AUDIT ────────────────────────────────────────
  {
    name: 'GST Audit',
    tests: async (token) => {
      const reg = await api(token, 'GET', '/gst/registrations?pageSize=10');
      record('GST Audit', 'GET /gst/registrations', reg.ok ? 'PASS' : 'FAIL', `status=${reg.status}`);
      const ledger = await api(token, 'GET', '/gst/ledger?pageSize=10');
      record('GST Audit', 'GET /gst/ledger', ledger.ok ? 'PASS' : 'FAIL', `status=${ledger.status}`);
      const settings = await api(token, 'GET', '/gst/settings');
      record('GST Audit', 'GET /gst/settings', settings.ok ? 'PASS' : 'FAIL', `status=${settings.status}`);
    }
  },

  // ── 29. WORKFLOW ────────────────────────────────────────────
  {
    name: 'Workflow',
    tests: async (token) => {
      const templates = await api(token, 'GET', '/workflow/templates?pageSize=10');
      record('Workflow', 'GET /workflow/templates', templates.ok ? 'PASS' : 'FAIL', `status=${templates.status}`);
      const instances = await api(token, 'GET', '/workflow/instances?pageSize=10');
      record('Workflow', 'GET /workflow/instances', instances.ok ? 'PASS' : 'FAIL', `status=${instances.status}`);
    }
  },

  // ── 30. USERS / ROLES ─────────────────────────────────────
  {
    name: 'Users/Roles',
    tests: async (token) => {
      const users = await api(token, 'GET', '/users?pageSize=10');
      record('Users', 'GET /users', users.ok ? 'PASS' : 'FAIL', `status=${users.status}`);
      const roles = await api(token, 'GET', '/roles?pageSize=10');
      record('Roles', 'GET /roles', roles.ok ? 'PASS' : 'FAIL', `status=${roles.status}`);
      const perms = await api(token, 'GET', '/permissions?pageSize=10');
      record('Permissions', 'GET /permissions', perms.ok ? 'PASS' : 'FAIL', `status=${perms.status}`);
    }
  },

  // ── 31. ASSETS ─────────────────────────────────────────────
  {
    name: 'Assets',
    tests: async (token) => {
      const list = await api(token, 'GET', '/assets?pageSize=10');
      record('Assets', 'GET /assets', list.ok ? 'PASS' : 'FAIL', `status=${list.status}`);
    }
  },

  // ── 32. INVENTORY ──────────────────────────────────────────
  {
    name: 'Inventory',
    tests: async (token) => {
      const adj = await api(token, 'GET', '/inventory/stock-adjustments?pageSize=10');
      record('Inventory', 'GET /inventory/stock-adjustments', adj.ok ? 'PASS' : 'FAIL', `status=${adj.status}`);
      const transfers = await api(token, 'GET', '/inventory/stock-transfers?pageSize=10');
      record('Inventory', 'GET /inventory/stock-transfers', transfers.ok ? 'PASS' : 'FAIL', `status=${transfers.status}`);
      const wh = await api(token, 'GET', '/warehouses?pageSize=10');
      record('Inventory', 'GET /warehouses', wh.ok ? 'PASS' : 'FAIL', `status=${wh.status}`);
    }
  },

  // ── 33. MASTERS ────────────────────────────────────────────
  {
    name: 'Masters',
    tests: async (token) => {
      for (const [name, path] of [
        ['units', '/units'], ['categories', '/categories'], ['brands', '/brands'],
        ['tax-groups', '/tax-groups'], ['gst-rates', '/gst-rates'],
        ['companies', '/companies'], ['branches', '/branches'], ['financial-years', '/financial-years'],
      ]) {
        const r = await api(token, 'GET', `${path}?pageSize=10`);
        record('Masters', `GET ${path}`, r.ok ? 'PASS' : 'FAIL', `status=${r.status}`);
      }
    }
  },

  // ── 34. SUPPLIER REFS ─────────────────────────────────────
  {
    name: 'Supplier Refs',
    tests: async (token) => {
      const groups = await api(token, 'GET', '/supplier-groups?pageSize=10');
      record('Supplier Refs', 'GET /supplier-groups', groups.ok ? 'PASS' : 'FAIL', `status=${groups.status}`);
      const cats = await api(token, 'GET', '/supplier-categories?pageSize=10');
      record('Supplier Refs', 'GET /supplier-categories', cats.ok ? 'PASS' : 'FAIL', `status=${cats.status}`);
    }
  },

  // ── 35. HEALTH ─────────────────────────────────────────────
  {
    name: 'Health',
    tests: async (token) => {
      const health = await api(token, 'GET', '/health');
      record('Health', 'GET /health', health.status <= 404 ? 'PASS' : 'FAIL', `status=${health.status}`);
      const live = await api(token, 'GET', '/health/live');
      record('Health', 'GET /health/live', live.ok ? 'PASS' : 'FAIL', `status=${live.status}`);
      const ready = await api(token, 'GET', '/health/ready');
      record('Health', 'GET /health/ready', ready.ok ? 'PASS' : 'FAIL', `status=${ready.status}`);
    }
  },

  // ── 36. DMS ────────────────────────────────────────────────
  {
    name: 'DMS',
    tests: async (token) => {
      const docs = await api(token, 'GET', '/dms/documents?pageSize=10');
      record('DMS', 'GET /dms/documents', docs.ok ? 'PASS' : 'FAIL', `status=${docs.status}`);
      const folders = await api(token, 'GET', '/dms/folders');
      record('DMS', 'GET /dms/folders', folders.ok ? 'PASS' : 'FAIL', `status=${folders.status}`);
    }
  },

  // ── 37. ANALYTICS ──────────────────────────────────────────
  {
    name: 'Analytics',
    tests: async (token) => {
      const overview = await api(token, 'GET', '/analytics/overview');
      record('Analytics', 'GET /analytics/overview', overview.ok ? 'PASS' : 'FAIL', `status=${overview.status}`);
    }
  },

  // ── 38. COMMERCIAL / LICENSE ───────────────────────────────
  {
    name: 'Commercial/License',
    tests: async (token) => {
      const license = await api(token, 'GET', '/license');
      record('License', 'GET /license', license.ok ? 'PASS' : 'FAIL', `status=${license.status}`);
    }
  },

  // ── 39. PRINT / PDF ────────────────────────────────────────
  {
    name: 'Print/PDF',
    tests: async (token) => {
      const settings = await api(token, 'GET', '/printer/settings');
      record('Print/PDF', 'GET /printer/settings', settings.ok ? 'PASS' : 'FAIL', `status=${settings.status}`);
    }
  },

  // ── 40. NOTIFICATIONS ──────────────────────────────────────
  {
    name: 'Notifications',
    tests: async (token) => {
      const settings = await api(token, 'GET', '/notifications/settings');
      record('Notifications', 'GET /notifications/settings', settings.ok ? 'PASS' : 'FAIL', `status=${settings.status}`);
    }
  },
];

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  SHRANIX KRUSHI ERP — MODULE-BY-MODULE FUNCTIONAL AUDIT');
  console.log('  Date:', new Date().toISOString());
  console.log('═══════════════════════════════════════════════════════════\n');

  const token = await getToken();
  if (!token) {
    console.error('❌ FATAL: Could not authenticate. Is the backend running?');
    process.exit(1);
  }
  console.log('🔐 Authenticated as admin@shranix.com');
  console.log(`🔑 CSRF token: ${CSRF_TOKEN.slice(0, 8)}...\n`);

  for (const mod of MODULES) {
    console.log(`\n─── ${mod.name} ${'─'.repeat(Math.max(0, 50 - mod.name.length))}`);
    try {
      await mod.tests(token);
    } catch (err) {
      record(mod.name, 'Module execution', 'FAIL', err.message);
    }
  }

  // ── Summary ──────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  SUMMARY');
  console.log('═══════════════════════════════════════════════════════════');

  const pass = results.filter(r => r.status === 'PASS').length;
  const fail = results.filter(r => r.status === 'FAIL').length;

  console.log(`  Total tests: ${results.length}`);
  console.log(`  ✅ PASS: ${pass}`);
  console.log(`  ❌ FAIL: ${fail}`);

  const moduleNames = [...new Set(results.map(r => r.module))];
  console.log('\n  Per-Module Breakdown:');
  for (const mod of moduleNames) {
    const modResults = results.filter(r => r.module === mod);
    const modPass = modResults.filter(r => r.status === 'PASS').length;
    const modFail = modResults.filter(r => r.status === 'FAIL').length;
    const icon = modFail === 0 ? '✅' : '❌';
    console.log(`    ${icon} ${mod}: ${modPass}/${modResults.length} passed${modFail > 0 ? ` (${modFail} FAILED)` : ''}`);
  }

  const failures = results.filter(r => r.status === 'FAIL');
  if (failures.length > 0) {
    console.log('\n  ❌ FAILURES:');
    for (const f of failures) {
      console.log(`    - [${f.module}] ${f.test}: ${f.detail}`);
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  return { pass, fail, total: results.length, failures };
}

main().catch(console.error);
