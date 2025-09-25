import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  // This section fixes the "lightningcss" error by telling Vite
  // to use a more compatible CSS processor.
  css: {
    transformer: 'postcss'
  },

  // This section fixes the "@" path shortcut error so Vite
  // can find your components.
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    }
  }
})
