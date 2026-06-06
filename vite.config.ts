import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      // The searoute-ts library and its heavy deps (the Eurostat
      // maritime network, @turf/*, geojson-path-finder) total
      // ~1.2 MB raw / 165 KB gzip. AGENTS.md requires it to stay
      // out of the initial bundle — the dynamic-import boundary
      // in src/lib/searoute.ts is the intended mechanism, but
      // Vite/Rollup's default is to inline small dynamic imports.
      // manualChunks forces a separate lazy chunk named "searoute".
      output: {
        manualChunks(id) {
          if (
            id.includes('node_modules/searoute-ts') ||
            id.includes('node_modules/@turf') ||
            id.includes('node_modules/geojson-path-finder')
          ) {
            return 'searoute'
          }
        },
      },
    },
  },
})
