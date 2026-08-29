import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    // The e2e directory is Playwright's; vitest must not try to run it.
    exclude: ['test/e2e/**', 'node_modules/**'],
    environment: 'node',
  },
})
