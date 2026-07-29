import { describe, expect, it } from 'vitest';

import { grantsPermission } from '../../src/common/guards/permissions.guard';

describe('grantsPermission', () => {
  it('matches an exact grant', () => {
    expect(grantsPermission('companies.read', 'companies.read')).toBe(true);
  });

  it('matches a module wildcard to a nested permission', () => {
    expect(grantsPermission('finance.*', 'finance.budget.read')).toBe(true);
  });

  it('matches seeded master and inventory module grants to their protected resources', () => {
    expect(grantsPermission('masters.*', 'companies.read')).toBe(true);
    expect(grantsPermission('inventory.*', 'items.update')).toBe(true);
  });

  it('does not grant an unrelated resource', () => {
    expect(grantsPermission('masters.*', 'finance.read')).toBe(false);
  });
});
