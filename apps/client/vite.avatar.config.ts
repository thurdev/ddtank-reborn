import { resolve } from "node:path";
import { defineConfig } from "vite";

/**
 * perf-cliente: dedicated build config for JUST the avatar carousel entry (`avatar.html`/`src/avatar.ts`).
 *
 * Why this exists: `src/avatar.ts` does `import "./game/all"` — the same ~2600-module static import
 * `src/main.ts` needs (the AS3 class registry has to see every class before boot, see `game/all.ts`'s own
 * header comment). Under the normal dev server (`vite.config.ts`) that's served as ~2800 individual native
 * ESM module requests — `server.warmup` (see that file) makes sure each one is already *transformed* by the
 * time a real request arrives, but it can't collapse the *request count* itself: even with a fully warm
 * HTTP cache the browser still pays ~2800 round trips (measured: ~2.6-3.7s wall time just for that, see
 * `docs/client-pixi/STATUS.md` "perf-cliente"). The character carousel (`apps/web`'s Play page) hits this
 * on every visit, so it's the dominant cost of "how long until I see my character" — far more than any
 * asset/XML fetch inside `avatar.ts` itself.
 *
 * Fix: bundle `avatar.html` for real (Rollup, same as `vite build` would for the main entry) into a handful
 * of chunk files, and run it in `--watch` mode as a SEPARATE process alongside the normal dev server — so
 * day-to-day game development (`vite.config.ts`, HMR, per-module requests) is completely untouched, but the
 * carousel preview is served as a real bundle. `apps/client/vite.config.ts` has a small dev-middleware
 * plugin that serves `/avatar.html` and its built chunks straight from `dist-avatar/` (falling back to the
 * normal per-module path if the watch build hasn't produced output yet, e.g. right after a fresh checkout).
 *
 * `copyPublicDir: false` is the other half of this: the default `vite build` copies the WHOLE `public/`
 * dir (including `public/assets`, a junction to tens of thousands of exported SWF-derived files) into
 * `outDir` — that's what made a full `vite build` take 9+ minutes in the 2026-10-27 pixi-load session.
 * `avatar.ts` never reads assets from its own origin's `/assets/` path anyway (`setAssetBase` +
 * `setUrlRewriter` point it at the API origin's `/flash/...`, see that file's `boot()`), so skipping the
 * copy here is both correct and the thing that makes this build fast enough to watch.
 *
 * Run: `pnpm --filter @ddt/client dev:avatar` (alongside `pnpm --filter @ddt/client dev`).
 */
export default defineConfig({
  build: {
    outDir: "dist-avatar",
    // own sub-path, NOT the default "assets" — `public/assets` (the exported-art junction) is already
    // served at `/assets/...` by the main dev server; sharing the name would collide with the static-file
    // middleware `vite.config.ts` adds to serve this build's chunks from `dist-avatar/` by path.
    assetsDir: "avatar-chunks",
    emptyOutDir: true,
    copyPublicDir: false,
    target: "es2022",
    chunkSizeWarningLimit: 20000,
    sourcemap: false,
    rollupOptions: { input: { avatar: resolve(__dirname, "avatar.html") } },
    watch: {},
  },
  esbuild: {
    keepNames: true,
  },
});
