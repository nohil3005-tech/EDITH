/**
 * EDITH Desktop — Vite Config for Desktop Build
 *
 * Key differences from web build:
 *  - base: './'  → relative paths so Electron can load file:// URIs
 *  - No proxy (backend is localhost:3001, CORS handled by Express)
 *  - Injects VITE_API_BASE_URL and VITE_API_KEY at build time
 *  - Outputs to frontend/dist/
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],

  // CRITICAL: relative base so Electron file:// protocol works
  base: './',

  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../frontend/src'),
    },
  },

  define: {
    // Inject desktop mode flag
    'import.meta.env.VITE_API_BASE_URL': JSON.stringify('http://localhost:3001'),
    'import.meta.env.VITE_API_KEY':      JSON.stringify('edith-desktop-key'),
    'import.meta.env.VITE_IS_DESKTOP':   JSON.stringify('true'),
  },

  build: {
    outDir:        path.resolve(__dirname, '../frontend/dist'),
    emptyOutDir:   true,
    sourcemap:     false,
    minify:        'esbuild',
    rollupOptions: {
      output: {
        // Chunk splitting for faster loads
        manualChunks: {
          vendor:    ['react', 'react-dom'],
          router:    ['@tanstack/react-router'],
          ui:        ['@radix-ui/react-dialog', 'lucide-react'],
        },
      },
    },
  },

  // No server needed for desktop build
  // (used only for `npm run dev` during development)
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target:       'http://localhost:3001',
        changeOrigin: true,
        secure:       false,
      },
    },
  },
});
