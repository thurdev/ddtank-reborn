import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: false,
    include: ["src/**/*.test.{ts,tsx}"],
    // task multi-char: the default 5000ms vitest timeout got marginal when several Play*.test.tsx files
    // share a worker (heavier carousel DOM/MSW traffic since the single-stage rewrite) on a loaded dev
    // machine — a real (if generous) ceiling, not a stuck test.
    testTimeout: 15000,
  },
});
