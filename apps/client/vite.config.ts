import { defineConfig } from "vite";

/**
 * Cliente PixiJS. Em dev, `/Request` e `/resource` vão pro apps/api (porta
 * 8080 por padrão; mude com DDT_API=http://host:porta).
 */
const api = process.env.DDT_API ?? "http://127.0.0.1:8080";

export default defineConfig({
  server: {
    port: 5180,
    proxy: {
      "/request": { target: api, changeOrigin: true },
      "/Request": { target: api, changeOrigin: true },
      "/api": { target: api, changeOrigin: true },
      "/resource": { target: api, changeOrigin: true },
      "/flash/config.xml": { target: api, changeOrigin: true },
    },
  },
  build: {
    target: "es2022",
    chunkSizeWarningLimit: 20000,
    sourcemap: true,
  },
  esbuild: {
    // código do jogo usa `declare` em campos e decorators não; mantém nomes de classe (debug e getQualifiedClassName)
    keepNames: true,
  },
});
