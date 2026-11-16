import { defineConfig } from 'vitest/config'

// Docker gerektirir: pnpm test:integration
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/__tests__/integration/**/*.test.ts'],
    globalSetup: ['src/__tests__/integration/global-setup.ts'],
    hookTimeout: 120_000,
    testTimeout: 30_000,
    fileParallelism: false,
  },
})
