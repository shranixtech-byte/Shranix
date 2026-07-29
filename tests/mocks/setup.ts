import { vi } from 'vitest';

// ── Global Mocks ────────────────────────────────────────
vi.stubGlobal('crypto', {
  randomUUID: () => '00000000-0000-0000-0000-000000000000',
});

// ── Environment ─────────────────────────────────────────
process.env.NODE_ENV = 'test';
process.env.DATABASE_PROVIDER = 'sqlite';
process.env.DATABASE_URL = ':memory:';
process.env.LOG_LEVEL = 'silent';

// ── Console Mocks ───────────────────────────────────────
vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'debug').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});
