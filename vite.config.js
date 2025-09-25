import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // This section fixes the CSS build issue you had in Termux
  css: {
    transformer: 'postcss'
  },
  // This section fixes the "@" path shortcut error
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    }
  }
})
