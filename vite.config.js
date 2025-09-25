import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // This section directly configures PostCSS within Vite
  // It ensures tailwindcss runs first, which fixes the error.
  css: {
    postcss: {
      plugins: [
        tailwindcss,
        autoprefixer,
      ],
    },
  },
  
  // This section fixes the "@" path shortcut error
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
