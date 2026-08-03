import type { UserData } from '@/services/auth.service';

// ═══════════════════════════════════════════════════════════
// USER MODULE ACCESS — tick-based module restriction
//
// Admin user creation par modules ke ticks lagte hain. Jin modules
// ke ticks honge, wahi modules user ko login ke baad dikhenge —
// baaki sidebar sections, header links sab hidden ho jaate hain.
// ═══════════════════════════════════════════════════════════

export interface ModuleDef {
  key: string;
  label: string;
  emoji: string;
  landingPath: string;
}

export const USER_MODULES: ModuleDef[] = [
  { key: 'dashboard', label: 'Dashboard', emoji: '📊', landingPath: '/' },
  { key: 'sales', label: 'Sales', emoji: '🧾', landingPath: '/sales/invoices/create' },
  { key: 'purchase', label: 'Purchase', emoji: '🛒', landingPath: '/purchase/invoices' },
  { key: 'stock', label: 'Stock', emoji: '📦', landingPath: '/inventory/products' },
  { key: 'customers', label: 'Customers', emoji: '👥', landingPath: '/customers' },
  { key: 'suppliers', label: 'Suppliers', emoji: '🚚', landingPath: '/suppliers' },
  { key: 'products', label: 'Products', emoji: '🏷️', landingPath: '/inventory/products' },
  { key: 'payments', label: 'Payments', emoji: '💰', landingPath: '/sales/customer-prices' },
  { key: 'reports', label: 'Reports', emoji: '📈', landingPath: '/sales/reports/dashboard' },
  { key: 'accounts', label: 'Accounts', emoji: '📒', landingPath: '/finance/chart-of-accounts' },
  { key: 'communication', label: 'SMS / Email', emoji: '✉️', landingPath: '/sms' },
  { key: 'offers', label: 'Offers', emoji: '🎁', landingPath: '/offers' },
  { key: 'settings', label: 'Settings', emoji: '⚙️', landingPath: '/finance/settings' },
];

export const MODULE_LABELS: Record<string, string> = Object.fromEntries(
  USER_MODULES.map((m) => [m.key, m.label]),
);

// Har module ke URL prefixes — isPathAllowed in prefix-match karta hai taaki
// module ke saare pages (detail/edit routes samet) allowed rahen.
const MODULE_PATH_PREFIXES: Record<string, string[]> = {
  dashboard: ['/'],
  sales: ['/sales'],
  purchase: ['/purchase'],
  stock: ['/inventory', '/warehouses'],
  customers: ['/customers'],
  suppliers: ['/suppliers'],
  products: ['/inventory/products', '/categories'],
  payments: ['/sales/customer-prices', '/sales/credit'],
  reports: ['/sales/reports', '/purchase/reports', '/inventory/reports', '/gl'],
  accounts: ['/finance', '/gl', '/gst'],
  communication: ['/sms'],
  offers: ['/offers'],
  settings: ['/finance/settings', '/settings', '/executive', '/gst/settings'],
};

/**
 * User ke allowedModules ko parse karo.
 * Backend JSON string (["sales"]) ya array dono form mein de sakta hai.
 * Returns:
 *   - `null`  → koi restriction nahi (full access — admin / purane users)
 *   - `string[]` → sirf ye modules allowed
 */
export function parseAllowedModules(
  user: { allowedModules?: unknown } | null | undefined,
): string[] | null {
  if (!user) {
    return null;
  }
  const raw = user.allowedModules;
  if (raw === null || raw === undefined || raw === '') {
    return null;
  }
  let modules: string[] = [];
  if (Array.isArray(raw)) {
    modules = raw.filter((m): m is string => typeof m === 'string' && m.length > 0);
  } else if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        modules = parsed.filter((m): m is string => typeof m === 'string' && m.length > 0);
      }
    } catch {
      // Not JSON — ignore, treat as no restriction
      return null;
    }
  }
  // Empty list = koi restriction nahi (full access) — [] aur null same behave karo
  return modules.length > 0 ? modules : null;
}

/** Kya user restricted hai (tick-based module restriction active)? */
export function isRestrictedUser(user: UserData | null | undefined): boolean {
  const allowed = parseAllowedModules(user);
  return allowed !== null && allowed.length > 0;
}

/** Kya user ko ye module dikhna chahiye? */
export function hasModuleAccess(user: UserData | null | undefined, moduleKey: string): boolean {
  const allowed = parseAllowedModules(user);
  if (allowed === null) {
    return true;
  } // no restriction → full access
  return allowed.includes(moduleKey);
}

/** Restricted user ka pehla allowed module landing path (redirect ke liye). */
export function getUserLandingPath(user: UserData | null | undefined): string {
  const allowed = parseAllowedModules(user);
  if (allowed === null || allowed.length === 0) {
    return '/';
  }
  for (const m of USER_MODULES) {
    if (allowed.includes(m.key)) {
      return m.landingPath;
    }
  }
  return '/';
}

/**
 * Kya current pathname restricted user ko dikhna chahiye?
 * Module prefixes se match — detail pages (/sales/invoices/123) bhi allowed
 * module ke andar aa jaate hain.
 */
export function isPathAllowed(pathname: string, user: UserData | null | undefined): boolean {
  if (!isRestrictedUser(user)) {
    return true;
  }
  const allowed = parseAllowedModules(user);
  if (!allowed || allowed.length === 0) {
    return true;
  }
  for (const key of allowed) {
    const prefixes = MODULE_PATH_PREFIXES[key] ?? [];
    for (const p of prefixes) {
      if (p === '/') {
        return true;
      } // dashboard allowed → kuch bhi browse kar sakta hai
      if (pathname === p || pathname.startsWith(`${p}/`)) {
        return true;
      }
    }
  }
  return false;
}
