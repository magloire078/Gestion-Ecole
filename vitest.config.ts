import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    testTimeout: 20000,
    hookTimeout: 20000,
    globals: false,
    environment: 'node',
    // Rules tests share a single Firestore emulator instance. Running files
    // in parallel races on doc seeds (clearFirestore() from one file wipes
    // the other file's beforeEach state mid-run).
    fileParallelism: false,
  },
});
