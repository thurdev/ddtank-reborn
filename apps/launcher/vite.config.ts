import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Renderer only. Main/preload are compiled by tsc (tsconfig.node.json).
export default defineConfig({
  root: "src/renderer",
  base: "./",
  plugins: [react(), tailwindcss()],
  build: { outDir: "../../dist/renderer", emptyOutDir: true, target: "chrome140" },
  server: { port: 5180, strictPort: true },
});
