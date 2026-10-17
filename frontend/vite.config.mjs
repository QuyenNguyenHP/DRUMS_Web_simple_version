import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  cacheDir:
    process.platform === "linux" && process.cwd().startsWith("/mnt/")
      ? "/tmp/drums-vite-cache"
      : "node_modules/.vite",
  server: {
    host: "0.0.0.0",
    proxy: {
      "/api": "http://127.0.0.1:8001",
    },
  },
});
