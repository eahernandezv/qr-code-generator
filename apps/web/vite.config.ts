import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      // Core's root API includes Node-only PNG support. Studio preview is SVG-only,
      // so keep that unreachable implementation out of the browser bundle.
      pngjs: resolve(__dirname, 'src/lib/pngjsBrowserStub.ts'),
    },
  },
  server: {
    port: 3000,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
