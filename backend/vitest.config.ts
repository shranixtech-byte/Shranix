import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    root: path.resolve(__dirname),
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'test/**/*.{test,spec}.{ts,tsx}'],
    // E2E specs boot the full NestJS app against a live DB — they are run
    // exclusively via `pnpm test:e2e` (see vitest.config.e2e.ts), never here.
    exclude: ['node_modules', 'dist', '.turbo', 'test/**/*.e2e.spec.ts'],
    setupFiles: ['../tests/mocks/setup.ts'],
  },
});
