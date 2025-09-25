import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
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

