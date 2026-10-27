/**
 * Base URL for the exported client assets (PNG + library.json + MP3 under `apps/client/public/assets`,
 * see docs/client-pixi/ASSETS.md). Default: this app's own origin (`${BASE_URL}assets/` — served from
 * `public/` by Vite in dev, or wherever the built `dist` is deployed in prod).
 *
 * Production can point this at a CDN instead (docs/deploy/README.md "assets no CDN", `scripts/
 * assets-r2-sync.mjs`) by setting `VITE_ASSETS_BASE_URL` at BUILD time (`apps/client/.env`, see
 * `.env.example` in this directory) — Vite inlines it into the bundle at `vite build` time, same
 * mechanism as `BASE_URL`. Needed because `apps/client/vite.config.ts` sets `build.copyPublicDir:
 * false` (the exported asset tree is several GB; it must not be copied into every Docker/`dist` build —
 * see docs/client-pixi/STATUS.md), so a production build has nowhere to serve `/assets/` from unless
 * this points somewhere that does.
 */
export const ASSETS_BASE = normalize(import.meta.env.VITE_ASSETS_BASE_URL || `${import.meta.env.BASE_URL}assets/`);

function normalize(url: string): string {
  return url.endsWith("/") ? url : `${url}/`;
}
