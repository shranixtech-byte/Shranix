import { matchRoutes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { routes } from './index';

// Regression test: "Accounting Settings 404" bug — header ka Settings link /settings
// par jaata tha, jiska koi route nahi tha → catch-all (*) → NotFoundPage.
// Fix: header → /finance/settings + /settings redirect. Ye test confirm karta hai
// ki dono paths ab real route match karte hain, catch-all par nahi girte.
describe('routes — Accounting Settings (regression)', () => {
  it('/finance/settings AccountingSettingsPage match karta hai, 404 catch-all nahi', () => {
    const matches = matchRoutes(routes, '/finance/settings');
    expect(matches).not.toBeNull();
    const matchedPaths = (matches ?? []).map((m) => m.route.path);
    expect(matchedPaths).toContain('finance/settings');
    expect(matchedPaths).not.toContain('*');
  });

  it('purana /settings redirect route par match karta hai (404 nahi)', () => {
    const matches = matchRoutes(routes, '/settings');
    expect(matches).not.toBeNull();
    const matchedPaths = (matches ?? []).map((m) => m.route.path);
    expect(matchedPaths).toContain('settings');
    expect(matchedPaths).not.toContain('*');
  });

  it('unknown path ab bhi catch-all (*) → NotFoundPage par jaata hai', () => {
    const matches = matchRoutes(routes, '/no-such-page-xyz-123');
    expect(matches).not.toBeNull();
    const matchedPaths = (matches ?? []).map((m) => m.route.path);
    expect(matchedPaths).toContain('*');
  });

  it('header/sidebar Settings links /finance/settings par point karte hain', () => {
    const matches = matchRoutes(routes, '/finance/settings');
    // Root ('/') layout chain ke andar finance/settings ho — matlab page AppLayout
    // ke andar render hota hai, na ki isolated 404.
    const rootMatch = (matches ?? []).find((m) => m.route.path === '/');
    expect(rootMatch).toBeTruthy();
  });

  // Regression: MasterDataPage ka '+ Create' button `/{path}/create` par navigate
  // karta hai. Pehle settings modules ke create routes missing the → 404.
  it.each([
    ['/finance/settings/create'],
    ['/finance/settings/abc-123/edit'],
    ['/purchase/settings/create'],
    ['/purchase/settings/abc-123/edit'],
    ['/sales/settings/create'],
    ['/sales/settings/abc-123/edit'],
    ['/gst/settings/create'],
    ['/gst/settings/abc-123/edit'],
  ])('settings create/edit route %s real route hai (404 nahi)', (path) => {
    const matches = matchRoutes(routes, path);
    expect(matches).not.toBeNull();
    const matchedPaths = (matches ?? []).map((m) => m.route.path);
    expect(matchedPaths).not.toContain('*');
  });
});
