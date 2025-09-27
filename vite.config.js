// vite.config.js
import { defineConfig } from 'vite'

export default defineConfig({
  // ... your other config
  build: {
    rollupOptions: {
      external: ['@radix-ui/react-progress']
    }
  }
})
