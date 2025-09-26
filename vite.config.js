import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite' // <-- Import the official v4 plugin

export default defineConfig({
  plugins: [
    react(), 
    tailwindcss(), // <-- Use the plugin here
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    }
  }
})
