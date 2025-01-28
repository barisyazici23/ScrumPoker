import { defineConfig } from 'vite'

export default defineConfig({
  // Temel Vite yapılandırması
  server: {
    port: 3000
  },
  build: {
    outDir: 'dist'
  }
}) 