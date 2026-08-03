import path from 'path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    root: path.resolve(__dirname),
    include: ['test/**/*.e2e.spec.ts'],
    exclude: ['node_modules', 'dist', '.turbo'],
    // E2E tests boot the full NestJS app against a real database,
    // so they must NOT use the shared mock setup (which forces :memory:).
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
