import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/games/**/logic.ts', 'src/games/blackjack/**/*.ts', 'src/systems/**/*.ts'],
      exclude: ['**/*.test.ts', '**/*.test.tsx'],
      thresholds: {
        'src/games/**/logic.ts': { lines: 90, functions: 90, branches: 85, statements: 90 },
        'src/games/blackjack/**/*.ts': { lines: 90, functions: 90, branches: 85, statements: 90 },
        'src/systems/**/*.ts': { lines: 80, functions: 80, branches: 75, statements: 80 },
      },
    },
  },
});
