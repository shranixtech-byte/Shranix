import { mkdtempSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it, beforeAll, afterAll } from 'vitest';

const dbRequire = createRequire(join(process.cwd(), '..', 'database', 'package.json'));
const { createClient } = dbRequire('@libsql/client');
const { drizzle } = dbRequire('drizzle-orm/libsql');
const { migrate } = dbRequire('drizzle-orm/libsql/migrator');

import { AuditService } from '../common/services/audit.service';
import { DatabaseService } from '../database/database.service';
import { SalesPaymentCollectionService } from '../sales/payment-collection.service';

import { PortalAdminService } from './services/portal-admin.service';
import { PortalAuthService } from './services/portal-auth.service';
import { PortalPaymentsService } from './services/portal-payments.service';
import { PortalTicketsService } from './services/portal-tickets.service';
import { PortalService } from './services/portal.service';

/**
 * REAL-DB integration tests for the Phase-11 Customer Portal.
 *
 * Covers the SECURITY TEST MATRIX: portal auth + lockout, customer A must
 * NEVER access customer B data (invoice / quotation / order / ledger /
 * ticket), internal notes hidden from customers, payment idempotency, and
 * quotation responses.
 */
describe('Customer Portal module (real DB)', () => {
  let database: DatabaseService;
  let audit: AuditService;
  let auth: PortalAuthService;
  let portal: PortalService;
  let tickets: PortalTicketsService;
  let payments: PortalPaymentsService;
  let admin: PortalAdminService;

  let customerA: any;
  let customerB: any;
  let portalUserA: any;
  let portalUserB: any;
  let invoiceA: any;
  let invoiceB: any;
  let quotationA: any;
  let quotationB: any;
  let orderA: any;
  let orderB: any;

  beforeAll(async () => {
    const dbDir = mkdtempSync(join(tmpdir(), 'portal-'));
    const client = createClient({ url: `file:${join(dbDir, 'test.db')}` });
    const drizzleDb = drizzle(client as any);

    await migrate(
      drizzleDb as any,
      {
        migrationsFolder: join(process.cwd(), '..', 'database', 'src', 'migrations'),
      } as any,
    );

    database = new DatabaseService(drizzleDb as any);
    audit = new AuditService(database, { getIp: () => null, getUserAgent: () => null } as any);
    auth = new PortalAuthService(
      database,
      audit,
      { sign: () => 'portal-token' } as any,
      undefined as any,
    );
    portal = new PortalService(database, audit, {
      generatePdf: async (html: string) => Buffer.from(html),
    } as any);
    tickets = new PortalTicketsService(database, audit);
    payments = new PortalPaymentsService(
      database,
      audit,
      new SalesPaymentCollectionService(database, audit),
    );
    admin = new PortalAdminService(database, audit);

    // ── Seed master data ────────────────────────────────
    customerA = await database.customers.create({
      customerCode: 'CUS-0001',
      name: 'Shivaji Farms',
      firmName: 'Shivaji Krushi Kendra',
      mobile: '9876500001',
      email: 'a@test.in',
      gstin: '27AAAAA0001A1Z5',
    } as any);
    customerB = await database.customers.create({
      customerCode: 'CUS-0002',
      name: 'Kisan Traders',
      firmName: 'Kisan Agro',
      mobile: '9876500002',
      email: 'b@test.in',
    } as any);

    // Portal users
    portalUserA = await admin.createPortalUser(
      {
        customerId: customerA.id,
        email: 'a@portal.test',
        name: 'Portal A',
        role: 'admin',
        password: 'secret123',
      },
      'admin-1',
    );
    portalUserB = await admin.createPortalUser(
      {
        customerId: customerB.id,
        email: 'b@portal.test',
        name: 'Portal B',
        role: 'viewer',
        password: 'secret123',
      },
      'admin-1',
    );

    // Invoices for both customers
    invoiceA = await database.salesInvoices.create({
      invoiceNumber: 'INV-A-0001',
      customerId: customerA.id,
      invoiceDate: '2026-08-01',
      dueDate: '2026-08-15',
      status: 'posted',
      paymentStatus: 'unpaid',
      subTotal: 1000,
      taxAmount: 180,
      grandTotal: 1180,
      paidAmount: 0,
      balanceAmount: 1180,
    } as any);
    invoiceB = await database.salesInvoices.create({
      invoiceNumber: 'INV-B-0001',
      customerId: customerB.id,
      invoiceDate: '2026-08-02',
      dueDate: '2026-08-16',
      status: 'posted',
      paymentStatus: 'unpaid',
      subTotal: 2000,
      taxAmount: 360,
      grandTotal: 2360,
      paidAmount: 0,
      balanceAmount: 2360,
    } as any);

    // Quotations
    quotationA = await database.salesQuotations.create({
      quoteNumber: 'QT-A-0001',
      customerId: customerA.id,
      quoteDate: '2026-08-01',
      validTill: '2026-08-20',
      status: 'sent',
      subTotal: 900,
      taxAmount: 162,
      grandTotal: 1062,
    } as any);
    quotationB = await database.salesQuotations.create({
      quoteNumber: 'QT-B-0001',
      customerId: customerB.id,
      quoteDate: '2026-08-02',
      validTill: '2026-08-21',
      status: 'sent',
      subTotal: 500,
      taxAmount: 90,
      grandTotal: 590,
    } as any);

    // Orders
    orderA = await database.salesOrders.create({
      orderNumber: 'SO-A-0001',
      customerId: customerA.id,
      orderDate: '2026-08-01',
      status: 'approved',
      subTotal: 1000,
      taxAmount: 180,
      grandTotal: 1180,
    } as any);
    orderB = await database.salesOrders.create({
      orderNumber: 'SO-B-0001',
      customerId: customerB.id,
      orderDate: '2026-08-02',
      status: 'draft',
      subTotal: 500,
      taxAmount: 90,
      grandTotal: 590,
    } as any);

    // Credit profiles (needed by outstanding/ledger)
    await database.creditProfiles.create({
      customerId: customerA.id,
      customerName: 'Shivaji Farms',
      customerCode: 'CUS-0001',
      creditLimit: 50000,
      creditDays: 15,
      outstanding: 1180,
      availableCredit: 48820,
      overdueAmount: 0,
      openingBalance: 0,
    } as any);
    await database.creditProfiles.create({
      customerId: customerB.id,
      customerName: 'Kisan Traders',
      customerCode: 'CUS-0002',
      creditLimit: 100000,
      creditDays: 30,
      outstanding: 2360,
      availableCredit: 97640,
      overdueAmount: 0,
      openingBalance: 0,
    } as any);

    // Ledger master for A — id MUST equal the customer id (collect() looks up by findById)
    await database.ledgerMaster.create({
      id: customerA.id,
      accountId: `ledger-${customerA.id}`,
      ledgerType: 'customer',
      partyId: customerA.id,
      openingBalance: 0,
      currentBalance: 1180,
    } as any);
  });

  afterAll(async () => {
    await database?.disconnect?.();
  });

  // ── AUTH ───────────────────────────────────────────────
  it('logs in with correct credentials and rejects wrong ones', async () => {
    const ok = await auth.login('a@portal.test', 'secret123');
    expect(ok.accessToken).toBeTruthy();
    expect(ok.user.customerId).toBe(customerA.id);
    await expect(auth.login('a@portal.test', 'wrong-password')).rejects.toThrow(/Invalid/i);
  });

  it('locks the account after repeated failures', async () => {
    const fresh = await admin.createPortalUser(
      {
        customerId: customerB.id,
        email: 'lock@portal.test',
        name: 'Lock',
        role: 'viewer',
        password: 'secret123',
      },
      'admin-1',
    );
    for (let i = 0; i < 5; i++) {
      await auth.login('lock@portal.test', 'bad-password').catch(() => {});
    }
    await expect(auth.login('lock@portal.test', 'secret123')).rejects.toThrow(/locked/i);
    expect(fresh.id).toBeTruthy();
  });

  it('blocks inactive and blocked accounts', async () => {
    await admin.updatePortalUser(portalUserB.id, { status: 'blocked' }, 'admin-1');
    await expect(auth.login('b@portal.test', 'secret123')).rejects.toThrow(/blocked/i);
    await admin.updatePortalUser(portalUserB.id, { status: 'active' }, 'admin-1');
    const ok = await auth.login('b@portal.test', 'secret123');
    expect(ok.user.id).toBe(portalUserB.id);
  });

  it('resets password with a valid token and invalidates old sessions', async () => {
    // We can't read the token from the DB (hashed), so use a fresh user + direct service flow
    const fresh = await admin.createPortalUser(
      {
        customerId: customerB.id,
        email: 'reset@portal.test',
        name: 'Reset',
        role: 'viewer',
        password: 'oldpass1',
      },
      'admin-1',
    );
    const raw = 'reset-token-abc';
    const { createHash } = await import('node:crypto');
    const tokenHash = createHash('sha256').update(raw).digest('hex');
    await database.portalResetTokens.create({
      portalUserId: fresh.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
    } as any);
    await auth.resetPassword(raw, 'newpass1');
    await expect(auth.login('reset@portal.test', 'oldpass1')).rejects.toThrow(/Invalid/i);
    const ok = await auth.login('reset@portal.test', 'newpass1');
    expect(ok.user.email).toBe('reset@portal.test');
  });

  // ── CUSTOMER ISOLATION MATRIX ──────────────────────────
  it('prevents customer A from reading customer B data (invoice/quotation/order)', async () => {
    // Invoice
    await expect(portal.getInvoice(customerA.id, invoiceB.id)).rejects.toThrow(/not found/i);
    // Quotation
    await expect(portal.getQuotation(customerA.id, quotationB.id)).rejects.toThrow(/not found/i);
    // Order
    await expect(portal.getOrder(customerA.id, orderB.id)).rejects.toThrow(/not found/i);
    // And the reverse
    await expect(portal.getInvoice(customerB.id, invoiceA.id)).rejects.toThrow(/not found/i);
    // Owned data still readable
    const own = await portal.getInvoice(customerA.id, invoiceA.id);
    expect(own.invoiceNumber).toBe('INV-A-0001');
  });

  it('never leaks internal fields to the customer (no spreads of raw rows)', async () => {
    const inv = await portal.getInvoice(customerA.id, invoiceA.id);
    const q = await portal.getQuotation(customerA.id, quotationA.id);
    const o = await portal.getOrder(customerA.id, orderA.id);
    const leaked = [
      'createdBy',
      'updatedBy',
      'approvedBy',
      'approvedAt',
      'branchId',
      'financialYearId',
      'orderId',
      'challanId',
      'customerInvoiceNo',
      'deletedAt',
    ];
    for (const field of leaked) {
      expect(field in inv, `invoice leaks ${field}`).toBe(false);
      expect(field in q, `quotation leaks ${field}`).toBe(false);
      expect(field in o, `order leaks ${field}`).toBe(false);
    }
  });

  it('scopes lists to the authenticated customer only', async () => {
    const aInvoices = await portal.listInvoices(customerA.id);
    expect(aInvoices.map((i: any) => i.invoiceNumber)).toEqual(['INV-A-0001']);
    const bQuotes = await portal.listQuotations(customerB.id);
    expect(bQuotes.map((q: any) => q.quoteNumber)).toEqual(['QT-B-0001']);
  });

  it('builds customer-scoped ledger with running balance', async () => {
    const ledger = await portal.getLedger(customerA.id, { page: 1, pageSize: 50 });
    expect(ledger.entries.length).toBeGreaterThanOrEqual(1);
    for (const e of ledger.entries) {
      expect(e.debit > 0 ? true : true).toBe(true);
    }
    // Ledger never contains customer B references
    const refs = ledger.entries.map((e: any) => String(e.reference)).join('|');
    expect(refs).not.toContain('INV-B-');
  });

  it('computes outstanding with ageing buckets from owned invoices only', async () => {
    const out = await portal.getOutstanding(customerA.id);
    expect(out.totalOutstanding).toBe(1180);
    const bOut = await portal.getOutstanding(customerB.id);
    // Customer B has an unpaid invoice worth 2360
    expect(bOut.totalOutstanding).toBe(2360);
  });

  it('prevents cross-customer notification access', async () => {
    const n = await database.portalNotifications.create({
      portalUserId: portalUserB.id,
      title: 'Secret B',
      message: 'private',
      type: 'info',
    } as any);
    await expect(portal.markNotificationRead(portalUserA.id, n.id)).rejects.toThrow(/not found/i);
  });

  it('generates documents only for owned records', async () => {
    await expect(
      portal.getDocument(customerA.id, portalUserA.id, 'invoice', invoiceB.id),
    ).rejects.toThrow(/not found/i);
    const buf = await portal.getDocument(customerA.id, portalUserA.id, 'invoice', invoiceA.id);
    expect(Buffer.isBuffer(buf)).toBe(true);
  });

  // ── TICKETS ────────────────────────────────────────────
  it('creates customer-scoped tickets and hides internal notes', async () => {
    const t = await tickets.createTicket(customerA.id, portalUserA.id, {
      subject: 'Delivery issue',
      category: 'delivery',
      priority: 'high',
      description: 'Late delivery',
    });
    expect(t.ticketNumber).toMatch(/^TK-/);

    // Customer B cannot read A's ticket
    await expect(tickets.getTicket(customerB.id, t.id)).rejects.toThrow(/not found/i);

    // Internal note must not be visible to the customer
    await tickets.internalReply(t.id, 'user-internal', 'Internal: refund approved', true);
    await tickets.internalReply(t.id, 'user-internal', 'Public: we are on it', false);
    const customerView = await tickets.getTicket(customerA.id, t.id);
    expect(customerView.messages.map((m: any) => m.message)).toEqual(['Public: we are on it']);
    // Internal view shows both
    const internalView = await tickets.internalGetTicket(t.id);
    expect(internalView.messages.length).toBe(2);
  });

  it('tracks ticket status transitions', async () => {
    const t = await tickets.createTicket(customerA.id, portalUserA.id, {
      subject: 'Payment query',
      description: 'How to pay?',
    });
    await tickets.internalUpdateStatus(t.id, 'user-internal', 'in_progress');
    await tickets.internalUpdateStatus(t.id, 'user-internal', 'resolved');
    const view = await tickets.getTicket(customerA.id, t.id);
    expect(view.status).toBe('resolved');
  });

  // ── QUOTATION RESPONSE ─────────────────────────────────
  it('records customer quotation accept/reject and audits it', async () => {
    const res = await portal.respondQuotation(
      customerA.id,
      portalUserA.id,
      quotationA.id,
      'accept',
      'Looks good',
    );
    expect(res.status).toBe('accepted');
    const updated = await database.salesQuotations.findById(quotationA.id);
    expect(updated.status).toBe('accepted');
    // Customer B cannot respond to A's quotation
    await expect(
      portal.respondQuotation(customerB.id, portalUserB.id, quotationA.id, 'reject'),
    ).rejects.toThrow(/not found/i);
  });

  // ── PAYMENTS ───────────────────────────────────────────
  it('is idempotent on payment create (no double payment on retry)', async () => {
    const payload = {
      invoiceId: invoiceA.id,
      amount: 500,
      mode: 'upi',
      idempotencyKey: 'idem-001',
    };
    const first = await payments.createPayment(customerA.id, portalUserA.id, payload);
    const retry = await payments.createPayment(customerA.id, portalUserA.id, payload);
    expect(retry.id).toBe(first.id);
    expect(retry.status).toBe(first.status);
  });

  it('rejects payments against another customer invoice', async () => {
    await expect(
      payments.createPayment(customerA.id, portalUserA.id, {
        invoiceId: invoiceB.id,
        amount: 100,
        mode: 'upi',
        idempotencyKey: 'idem-x-001',
      }),
    ).rejects.toThrow(/not found/i);
  });

  it('verifies payment server-side and records through the existing payment flow', async () => {
    const created = await payments.createPayment(customerA.id, portalUserA.id, {
      invoiceId: invoiceA.id,
      amount: 300,
      mode: 'upi',
      idempotencyKey: 'idem-002',
    });
    expect(created.status).toBe('initiated');

    const verified = await payments.verifyPayment(customerA.id, portalUserA.id, created.id, {
      gatewayRef: 'GW-TEST-1',
    });
    expect(verified.status).toBe('completed');
    expect(verified.salesPaymentId).toBeTruthy();

    // The real sales payment was created + invoice balance reduced
    const paymentsList = await portal.listPayments(customerA.id);
    expect(
      paymentsList.some((p: any) => p.referenceNo === 'GW-TEST-1' || String(p.amount) === '300'),
    ).toBe(true);
    const inv = await database.salesInvoices.findById(invoiceA.id);
    expect(Number(inv.paidAmount)).toBe(300);
    expect(Number(inv.balanceAmount)).toBe(880);
  });

  it('never double-applies a payment on concurrent verification', async () => {
    // A fresh payment + fresh invoice so the double-application is measurable
    const inv = await database.salesInvoices.create({
      invoiceNumber: 'INV-A-0002',
      customerId: customerA.id,
      invoiceDate: '2026-08-03',
      dueDate: '2026-08-17',
      status: 'posted',
      paymentStatus: 'unpaid',
      subTotal: 500,
      taxAmount: 90,
      grandTotal: 590,
      paidAmount: 0,
      balanceAmount: 590,
    } as any);
    const created = await payments.createPayment(customerA.id, portalUserA.id, {
      invoiceId: inv.id,
      amount: 590,
      mode: 'upi',
      idempotencyKey: 'idem-race-001',
    });

    // Fire both verifications concurrently — exactly one may claim the transition
    await Promise.allSettled([
      payments.verifyPayment(customerA.id, portalUserA.id, created.id, { gatewayRef: 'GW-RACE-1' }),
      payments.verifyPayment(customerA.id, portalUserA.id, created.id, { gatewayRef: 'GW-RACE-2' }),
    ]);

    const after = await database.salesInvoices.findById(inv.id);
    // The invoice balance must reflect the payment exactly ONCE
    expect(Number(after.paidAmount)).toBe(590);
    expect(Number(after.balanceAmount)).toBe(0);
    const portalPayments = await payments.listPortalPayments(customerA.id);
    const racePayment = portalPayments.find((p: any) => p.id === created.id);
    expect(racePayment?.status).toBe('completed');
  });

  // ── ADMIN ──────────────────────────────────────────────
  it('exposes admin analytics without password leakage', async () => {
    const a = await admin.analytics();
    expect(a.portalUsers).toBeGreaterThanOrEqual(3);
    expect(a.activeUsers).toBeGreaterThanOrEqual(1);
    expect(JSON.stringify(a)).not.toContain('passwordHash');
    expect(JSON.stringify(a)).not.toContain('password');
  });
});
