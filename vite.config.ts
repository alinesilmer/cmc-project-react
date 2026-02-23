import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => {
  const isSite = mode === "site";
  const root = path.resolve(__dirname, isSite ? "src/website" : "src/app");

  return {
    plugins: [react()],
    base: "/", // se sirve en raíz del dominio/subdominio
    assetsInclude: ["**/*.xlsx", "**/*.pdf"],
    build: {
      outDir: path.resolve(__dirname, "dist"), // <<--- siempre "dist"
      emptyOutDir: true,
    },
    server: {
      host: "127.0.0.1",
      proxy: {
        "/auth": { target: "http://127.0.0.1:8000", changeOrigin: true },
        "/api": { target: "http://127.0.0.1:8000", changeOrigin: true },
        "/uploads": { target: "http://127.0.0.1:8000", changeOrigin: true },
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "next/image": path.resolve(
          __dirname,
          "src/website/shims/next-image.tsx"
        ),
      },
    },
    optimizeDeps: { include: ["react-quill"] },
  };
});
