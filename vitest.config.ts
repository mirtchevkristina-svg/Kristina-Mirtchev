import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['lib/**/*.test.ts', 'db/**/*.test.ts', 'tests/**/*.test.ts'],
    environment: 'node',
sequence: { concurrent: false },
  },
});
