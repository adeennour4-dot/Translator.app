import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      external: [
        // Mark Capacitor plugins as external so Rollup doesn't try to bundle them
        '@capacitor/app',
        '@capacitor/haptics',
        '@capacitor/keyboard',
        '@capacitor/status-bar',
        '@capacitor/filesystem', // <-- Add this line
        // Add any other Capacitor plugins you might be using here
      ],
    },
  },
})
