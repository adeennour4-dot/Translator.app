import path from "path"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

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
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(new URL("./src", import.meta.url).pathname),
    },
  },
})
