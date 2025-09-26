import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite' // <-- Import the new official plugin

export default defineConfig({
  // Add the tailwindcss() plugin here
  plugins: [react(), tailwindcss()],
  
  // Keep the path alias for your components
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    }
  }
})
