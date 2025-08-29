import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import path from "path"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `
  @use "@/styles/mixins.scss"   as m;
  @use "@/styles/variables.scss" as v;
  @use "@/styles/animations.scss" as a;
`,
      },
    },
  },
})
