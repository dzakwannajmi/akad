import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    // Circuits run in-process and CPU-bound; property tests take seconds.
    testTimeout: 120_000,
  },
});
