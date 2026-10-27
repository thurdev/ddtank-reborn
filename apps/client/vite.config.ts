import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";

/**
 * Cliente PixiJS. Em dev, `/Request` e `/resource` vão pro apps/api (porta
 * 8080 por padrão; mude com DDT_API=http://host:porta).
 */
const api = process.env.DDT_API ?? "http://127.0.0.1:8080";

/**
 * perf-cliente: serve `/avatar.html` + `/avatar-chunks/*` straight from `dist-avatar/` (a real Rollup
 * bundle, built+watched separately by `vite.avatar.config.ts` — run `pnpm --filter @ddt/client dev:avatar`
 * alongside the normal dev server) instead of letting Vite's usual per-module dev pipeline handle them.
 *
 * Why: `avatar.html` boots `src/avatar.ts`, which does `import "./game/all"` — same ~2600-module static
 * import `main.ts` needs (the AS3 class registry has to see every class before boot). Under the NORMAL dev
 * server that's ~2800 individual native-ESM requests; `server.warmup` below makes sure each one is already
 * *transformed* (no first-touch esbuild cost), but it can't collapse the *request count* — measured
 * 2.6-3.7s wall time for JUST that round-trip volume even with a fully warm HTTP cache (see
 * docs/client-pixi/STATUS.md "perf-cliente"), on every single carousel load (`apps/web`'s Play page). A
 * real bundle collapses that to ~1 big JS request (+ a couple of PixiJS renderer-backend chunks it
 * dynamically imports at runtime) — same code, same behavior, just not re-fetched module-by-module.
 *
 * Falls back to the normal (slower) per-module path whenever `dist-avatar/` doesn't have the file yet
 * (fresh checkout, `dev:avatar` not running, or mid-rebuild) — never a hard dependency, never breaks
 * `avatar.html` if the watch build isn't up.
 */
function serveAvatarBundle(): Plugin {
  const distDir = resolve(__dirname, "dist-avatar");
  const mime: Record<string, string> = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript",
    ".css": "text/css",
    ".map": "application/json",
  };
  return {
    name: "ddt-serve-avatar-bundle",
    configureServer(server) {
      // Registered directly in the hook body (not the post-internal-middlewares return function) so this
      // runs BEFORE Vite's own html/transform middleware would otherwise try to serve `/avatar.html` from
      // source and re-walk its import graph.
      server.middlewares.use((req, res, next) => {
        const url = (req.url ?? "").split("?")[0]!;
        if (url !== "/avatar.html" && !url.startsWith("/avatar-chunks/")) return next();
        const file = join(distDir, url === "/avatar.html" ? "avatar.html" : url.slice(1));
        if (!existsSync(file) || statSync(file).isDirectory()) return next();
        res.setHeader("Content-Type", mime[extname(file)] ?? "application/octet-stream");
        // dev: the watch build can replace this file at any time (source edit) — never let the browser
        // cache it past a reload.
        res.setHeader("Cache-Control", "no-cache");
        res.end(readFileSync(file));
      });
    },
  };
}

export default defineConfig({
  plugins: [serveAvatarBundle()],
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
