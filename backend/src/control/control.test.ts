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

import { BusinessControlService } from './services/business-control.service';
import { BusinessRulesService, evaluateCondition } from './services/business-rules.service';
import { CustomFieldsService } from './services/custom-fields.service';
import { GlobalSearchService } from './services/global-search.service';
import { TagsService } from './services/tags.service';

/**
 * REAL-DB integration tests for the Phase-10 Business Control engine.
 *
 * Verifies: pure condition evaluation (all operators + AND/OR), business
 * rule CRUD + duplicate prevention + document evaluation, custom field
 * definitions + typed validation + value upsert, tags CRUD + assignment,
 * and global search across modules.
 */
describe('Business Control module (real DB)', () => {
  let database: DatabaseService;
  let rules: BusinessRulesService;
  let customFields: CustomFieldsService;
  let tags: TagsService;
  let globalSearch: GlobalSearchService;
  let control: BusinessControlService;

  const userId = 'user-ctrl-1';

  beforeAll(async () => {
    const dbDir = mkdtempSync(join(tmpdir(), 'ctrl-'));
    const client = createClient({ url: `file:${join(dbDir, 'test.db')}` });
    const drizzleDb = drizzle(client as any);

    await migrate(
      drizzleDb as any,
      {
        migrationsFolder: join(process.cwd(), '..', 'database', 'src', 'migrations'),
      } as any,
    );

    database = new DatabaseService(drizzleDb as any);
    const audit = new AuditService(database, {
      getIp: () => null,
      getUserAgent: () => null,
    } as any);
    rules = new BusinessRulesService(database, audit);
    customFields = new CustomFieldsService(database, audit);
    tags = new TagsService(database, audit);
    globalSearch = new GlobalSearchService(database);
    control = new BusinessControlService(database, rules);
  });

  afterAll(async () => {
    await database?.disconnect?.();
  });

  // ── Condition engine (pure) ────────────────────────────
  it('evaluates conditions safely — all operators + AND/OR (no eval)', () => {
    expect(
      evaluateCondition({ field: 'amount', operator: 'gt', value: 100 }, { amount: 150 }),
    ).toBe(true);
    expect(evaluateCondition({ field: 'amount', operator: 'gt', value: 100 }, { amount: 50 })).toBe(
      false,
    );
    expect(
      evaluateCondition({ field: 'amount', operator: 'gte', value: 100 }, { amount: 100 }),
    ).toBe(true);
    expect(
      evaluateCondition({ field: 'discount', operator: 'lte', value: 10 }, { discount: 7 }),
    ).toBe(true);
    expect(
      evaluateCondition(
        { field: 'name', operator: 'contains', value: 'fertil' },
        { name: 'NPK Fertilizer' },
      ),
    ).toBe(true);
    expect(
      evaluateCondition(
        { field: 'amount', operator: 'between', value: [100, 500] },
        { amount: 250 },
      ),
    ).toBe(true);
    expect(
      evaluateCondition(
        { field: 'amount', operator: 'between', value: [100, 500] },
        { amount: 600 },
      ),
    ).toBe(false);
    expect(
      evaluateCondition(
        { field: 'status', operator: 'in', value: ['approved', 'paid'] },
        { status: 'paid' },
      ),
    ).toBe(true);
    expect(
      evaluateCondition(
        { field: 'status', operator: 'in', value: ['approved'] },
        { status: 'paid' },
      ),
    ).toBe(false);
    // AND / OR
    expect(
      evaluateCondition(
        {
          and: [
            { field: 'amount', operator: 'gt', value: 100 },
            { field: 'discount', operator: 'lte', value: 10 },
          ],
        },
        { amount: 150, discount: 5 },
      ),
    ).toBe(true);
    expect(
      evaluateCondition(
        {
          and: [
            { field: 'amount', operator: 'gt', value: 100 },
            { field: 'discount', operator: 'lte', value: 10 },
          ],
        },
        { amount: 150, discount: 15 },
      ),
    ).toBe(false);
    expect(
      evaluateCondition(
        {
          or: [
            { field: 'amount', operator: 'gt', value: 100 },
            { field: 'status', operator: 'eq', value: 'vip' },
          ],
        },
        { amount: 50, status: 'vip' },
      ),
    ).toBe(true);
    // Unknown fields → false (no crash)
    expect(evaluateCondition({ field: 'nope', operator: 'gt', value: 1 }, { amount: 10 })).toBe(
      false,
    );
  });

  // ── Business rules ─────────────────────────────────────
  it('creates rules with duplicate prevention and evaluates documents', async () => {
    const rule = await rules.create(
      {
        ruleCode: 'SALE_APPROVAL_LIMIT',
        ruleName: 'Require approval above 50000',
        module: 'sales',
        documentType: 'sales_invoice',
        action: 'require_approval',
        severity: 'warning',
        message: 'Invoice exceeds approval limit',
        condition: { field: 'amount', operator: 'gt', value: 50000 },
      },
      userId,
    );
    expect(rule.ruleCode).toBe('SALE_APPROVAL_LIMIT');
    await expect(
      rules.create(
        { ruleCode: 'SALE_APPROVAL_LIMIT', ruleName: 'dup', module: 'sales', condition: {} },
        userId,
      ),
    ).rejects.toThrow(/already exists/i);

    // Below threshold → not triggered
    const ok = await rules.evaluate({
      module: 'sales',
      documentType: 'sales_invoice',
      amount: 10000,
      data: { amount: 10000 },
    });
    expect(ok.triggered).toBe(false);
    // Above threshold → triggered with require_approval
    const hit = await rules.evaluate({
      module: 'sales',
      documentType: 'sales_invoice',
      amount: 60000,
      data: { amount: 60000 },
    });
    expect(hit.triggered).toBe(true);
    expect(hit.action).toBe('require_approval');
    expect(hit.rule.ruleCode).toBe('SALE_APPROVAL_LIMIT');
    // Other module unaffected
    const other = await rules.evaluate({
      module: 'purchase',
      documentType: 'purchase_order',
      amount: 999999,
      data: { amount: 999999 },
    });
    expect(other.triggered).toBe(false);
  });

  it('supports block actions and invalid condition rejection', async () => {
    await rules.create(
      {
        ruleCode: 'NEG_QTY_BLOCK',
        ruleName: 'Block negative quantity',
        module: 'inventory',
        action: 'block',
        condition: { field: 'quantity', operator: 'lt', value: 0 },
      },
      userId,
    );
    const hit = await rules.evaluate({ module: 'inventory', data: { quantity: -5 } });
    expect(hit.triggered).toBe(true);
    expect(hit.action).toBe('block');

    await expect(
      rules.create(
        { ruleCode: 'BAD', ruleName: 'Bad condition', module: 'sales', condition: 'not-json{' },
        userId,
      ),
    ).rejects.toThrow(/Invalid condition/i);
    await expect(
      rules.create(
        {
          ruleCode: 'BAD2',
          ruleName: 'Bad action',
          module: 'sales',
          action: 'delete_everything',
          condition: {},
        },
        userId,
      ),
    ).rejects.toThrow(/Invalid action/i);
  });

  // ── Custom fields ──────────────────────────────────────
  it('creates definitions with validation and upserts typed values', async () => {
    const field = await customFields.createDefinition(
      {
        fieldCode: 'village_name',
        fieldName: 'Village',
        module: 'customer',
        documentType: 'customer',
        fieldType: 'text',
        isRequired: true,
      },
      userId,
    );
    expect(field.fieldCode).toBe('village_name');

    await customFields.createDefinition(
      {
        fieldCode: 'acres',
        fieldName: 'Farm acres',
        module: 'customer',
        documentType: 'customer',
        fieldType: 'number',
        minValue: 0,
        maxValue: 1000,
      },
      userId,
    );

    // Required missing → error
    await expect(customFields.saveValues('customer', 'cust-1', {}, userId)).rejects.toThrow(
      /required/i,
    );
    // Min/max violation → error
    await expect(
      customFields.saveValues('customer', 'cust-1', { village_name: 'Kurul', acres: 5000 }, userId),
    ).rejects.toThrow(/<= 1000/);
    // Valid → saved, upsert idempotent
    const saved = await customFields.saveValues(
      'customer',
      'cust-1',
      { village_name: 'Kurul', acres: 25 },
      userId,
    );
    expect(saved.village_name).toBe('Kurul');
    expect(saved.acres).toBe(25);
    await customFields.saveValues(
      'customer',
      'cust-1',
      { village_name: 'Kurul', acres: 30 },
      userId,
    );
    const read = await customFields.getValues('customer', 'cust-1');
    expect(read.village_name).toBe('Kurul');
    expect(read.acres).toBe(30);

    // Partial update — previously-saved required value is merged, so updating
    // only one field must not be blocked by required-field validation.
    const partial = await customFields.saveValues('customer', 'cust-1', { acres: 40 }, userId);
    expect(partial.acres).toBe(40);
    const afterPartial = await customFields.getValues('customer', 'cust-1');
    expect(afterPartial.village_name).toBe('Kurul'); // untouched value preserved
    expect(afterPartial.acres).toBe(40);

    // Deleting a required value (explicit null) still blocks.
    await expect(
      customFields.saveValues('customer', 'cust-1', { village_name: null }, userId),
    ).rejects.toThrow(/required/i);
  });

  // ── Tags ───────────────────────────────────────────────
  it('manages tags with idempotent assignment', async () => {
    const vip = await tags.create({ tagName: 'VIP', tagColor: 'purple' }, userId);
    await expect(tags.create({ tagName: 'VIP', tagColor: 'red' }, userId)).rejects.toThrow(
      /already exists/i,
    );

    const a1 = await tags.assign(vip.id, 'customer', 'cust-1', userId);
    const a2 = await tags.assign(vip.id, 'customer', 'cust-1', userId);
    expect(a2.id).toBe(a1.id); // idempotent — no duplicate

    const list = await tags.getTagsForRecord('customer', 'cust-1');
    expect(list.length).toBe(1);
    expect(list[0].tagName).toBe('VIP');

    const recs = await tags.getRecordsByTag(vip.id);
    expect(recs.length).toBe(1);
    await tags.unassign(vip.id, 'customer', 'cust-1', userId);
    expect((await tags.getTagsForRecord('customer', 'cust-1')).length).toBe(0);
  });

  // ── Global search ──────────────────────────────────────
  it('searches across modules with grouped results', async () => {
    await database.customers.create({
      customerCode: 'CUS-0001',
      name: 'Shivaji Farms',
      firmName: 'Shivaji Krushi Kendra',
      mobile: '9876543210',
    } as any);
    await database.items.create({
      name: 'NPK Fertilizer 12-32-16',
      itemName: 'NPK Fertilizer 12-32-16',
      itemCode: 'NPK-1',
      sku: 'NPK-1',
    } as any);
    await database.expenses.create({
      expenseNumber: 'EXP-000001',
      expenseDate: '2026-08-01',
      amount: 100,
      taxAmount: 0,
      totalAmount: 100,
    } as any);

    const res = await globalSearch.search('shivaji', { limit: 5 });
    expect(res.total).toBeGreaterThanOrEqual(1);
    const customers = res.results.find((r: any) => r.key === 'customers');
    expect(customers.items[0].title).toContain('Shivaji');

    const byProduct = await globalSearch.search('NPK', { limit: 5 });
    const products = byProduct.results.find((r: any) => r.key === 'products');
    expect(products.items[0].title).toContain('NPK');

    const byNumber = await globalSearch.search('EXP-000001', { limit: 5 });
    const exp = byNumber.results.find((r: any) => r.key === 'expenses');
    expect(exp.items.length).toBeGreaterThanOrEqual(1);
  });

  // ── Business control dashboard ─────────────────────────
  it('returns a business control dashboard', async () => {
    const dash = await control.dashboard(userId);
    expect(dash.activeRules).toBeGreaterThanOrEqual(2);
    expect(Array.isArray(dash.pendingApprovals)).toBe(false); // it's a count
    expect(typeof dash.pendingApprovals).toBe('number');
    expect(Array.isArray(dash.ruleViolations)).toBe(true);
  });
});
