import { defineConfig } from "vite";

/**
 * Cliente PixiJS. Em dev, `/Request` e `/resource` vão pro apps/api (porta
 * 8080 por padrão; mude com DDT_API=http://host:porta).
 */
const api = process.env.DDT_API ?? "http://127.0.0.1:8080";

export default defineConfig({
  server: {
    port: 5180,
    // dezenas de milhares de PNG exportados: não vigia (o exportador reescreve tudo e travava o dev server)
    watch: { ignored: ["**/public/assets/**"] },
    // `main.ts` faz `import "./game/all"` — import estático de ~2600 módulos TS (todo o jogo: o registro
    // global de classes AS3 exige que estejam todos presentes antes do boot, igual ApplicationDomain do
    // Flash). Sem isto, o PRIMEIRO acesso de cada sessão paga a transformação esbuild de cada um desses
    // módulos (medido: ~31s a frio vs. ~3-4s com o cache de transformação já quente — ver docs/client-pixi/
    // STATUS.md). `server.warmup` manda o Vite pré-transformar esse grafo inteiro assim que o dev server
    // sobe, em vez de no primeiro load de um jogador — não reduz o nº de requisições do navegador, mas tira
    // o custo de transformação do caminho crítico da primeira visita.
    warmup: { clientFiles: ["./src/main.ts", "./src/game/all.ts"] },
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
