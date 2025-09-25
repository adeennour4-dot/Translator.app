import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url' // <-- Add this import

// https://vitejs.dev/config/
export default defineConfig({
  // --- FIX: Set the base to relative paths for Capacitor --- 
  base: './',

  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // --- FIX: Correctly resolve path alias for ESM compatibility --- 
      "@": path.resolve(fileURLToPath(import.meta.url), "../src"),
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
        '@capacitor/filesystem',
      ],
    },
  },
  optimizeDeps: {
    exclude: [
      '@capacitor/app',
      '@capacitor/haptics',
      '@capacitor/keyboard',
      '@capacitor/status-bar',
      '@capacitor/filesystem',
    ],
  },
})
