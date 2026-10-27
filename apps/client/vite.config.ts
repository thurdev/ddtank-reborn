import { resolve } from "node:path";
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
    // `public/assets` (this app's exported art: PNG + library.json + MP3, several GB, see
    // docs/client-pixi/ASSETS.md) must NOT be physically copied into `dist` on every build — it inflated
    // build time to 9+ minutes and the artifact size for no benefit (docs/client-pixi/STATUS.md "achado
    // colateral do build"). `copyPublicDir: false` (Vite >=5.1) keeps `public/` served as-is by the DEV
    // server (unaffected — only `vite build`'s copy step is skipped), so local dev is unchanged. A
    // production build instead points at a CDN via VITE_ASSETS_BASE_URL (see .env.example, src/
    // assets-base.ts, scripts/assets-r2-sync.mjs, docs/deploy/README.md) — `dist` alone is a few MB.
    copyPublicDir: false,
    // task multi-char: `avatar.html` (apps/web's character carousel, `${pixiClientUrl}avatar.html?...`) is
    // a second, independent entry — lightweight boot (no socket/login/hall), one `ShowCharacter`. Without
    // this, `vite build` only emits `index.html`.
    rollupOptions: { input: { main: resolve(__dirname, "index.html"), avatar: resolve(__dirname, "avatar.html") } },
  },
  esbuild: {
    // código do jogo usa `declare` em campos e decorators não; mantém nomes de classe (debug e getQualifiedClassName)
    keepNames: true,
  },
});
