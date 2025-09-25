import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

// __dirname replacement for ESM
const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  base: './', // required for Capacitor offline bundle
  build: {
    outDir: 'dist',
  },
=======

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  css: {
    transformer: 'postcss'
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    }
  }
})

