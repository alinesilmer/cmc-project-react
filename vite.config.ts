import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    // port: 5173,
    proxy: {
      "/auth": { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/api": { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/uploads": { target: "http://127.0.0.1:8000", changeOrigin: true },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});

// curl.exe -i -c jar.txt -H "Content-Type: application/json" `--data '{ "nro_socio": 81520, "password": "81520" }' `http://127.0.0.1:8000/auth/login
