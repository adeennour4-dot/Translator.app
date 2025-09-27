import path from "path"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

export default defineConfig({
  server: {
    host: true,
  },
  preview: {
    host: true,
    port: 4173,
    strictPort: true,
    allowedHosts: [
      "4173-itjeazdo7vamo1545fdbb-8d47f400.manus.computer"
    ]
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      external: ["pdf-lib", "jspdf"],
    },
  },
})
