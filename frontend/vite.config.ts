// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  nitro: {
    preset: process.env.VERCEL ? "vercel" : (process.env.NITRO_PRESET ?? "node-server"),
    // @ts-expect-error: routeRules is supported by Nitro but not exposed in @lovable.dev/vite-tanstack-config types
    routeRules: {
      "/api/**": {
        proxy: "http://edith-api:4000/api/**",
      },
    },
  },
  vite: {
    server: {
      proxy: {
        // Proxy /api requests to the backend in development
        // This eliminates CORS issues entirely in dev mode
        '/api': {
          target: process.env.VITE_API_BASE_URL ?? 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
        },
      },
    },
    preview: {
      proxy: {
        '/api': {
          target: process.env.VITE_API_BASE_URL ?? 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
        },
      },
    },
  },
});
