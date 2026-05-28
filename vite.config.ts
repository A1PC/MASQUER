import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: { port: 5173, strictPort: true },
  build: {
    rollupOptions: {
      output: {
        // Phase 15 #15 PR C — vendor chunk splits so the entry stays under the
        // 350 KB gzipped budget once per-game lazy splitting lands. We only
        // split libraries that are (a) stable across releases (good cache
        // hits) and (b) unconditionally pulled into the entry by shell code.
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router'],
          'vendor-framer': ['framer-motion'],
          'vendor-dexie': ['dexie', 'dexie-react-hooks'],
        },
      },
    },
  },
});
