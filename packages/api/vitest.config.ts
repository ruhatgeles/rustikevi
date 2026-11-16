import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    // Entegrasyon testleri Docker ister: pnpm test:integration
    exclude: ['src/__tests__/integration/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/services/**', 'src/lib/**', 'src/middleware/**'],
    },
    testTimeout: 10000,
  },
})
