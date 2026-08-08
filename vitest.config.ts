import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

/**
 * Unit tests for pure `src/lib` modules.
 *
 * The repo had no test framework at all, which is how the mover-selection page
 * came to quote a rate off a field that does not exist, a third above what the
 * backend charges, undetected. Pricing logic here is now pinned by fixtures
 * shared with the mobile client (`src/lib/__tests__/fixtures/`).
 *
 * Deliberately node-environment and scoped to `src/lib` — this is not a
 * component-testing setup, and adding one is a separate decision.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts'],
  },
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
})
