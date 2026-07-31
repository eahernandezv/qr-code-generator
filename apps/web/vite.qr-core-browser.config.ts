import { defineConfig } from 'vite'
import { resolve } from 'node:path'

export default defineConfig({
  root: resolve(__dirname, 'browser-export-fixture'),
  build: {
    outDir: resolve(__dirname, 'dist-qr-core-browser'),
    emptyOutDir: true,
    sourcemap: true,
  },
})