#!/usr/bin/env tsx
/**
 * Fixes backlog suspicion #2 ("Destruição de terreno dessincronizada", docs/BACKLOG.md) for the maps
 * tools/assets/check-maps.ts flags as structurally broken (not the cosmetic back-vs-DB-size-only findings,
 * which are a harmless parallax backdrop scaled by MapView — vendor/DDTank41/Source Flash/src/game/view/map/
 * MapView.as:548-557 — and out of scope here):
 *
 *  - `dead` (indestructible rock layer) or `back` (sky) image missing entirely from both the uploads overlay
 *    and vendor/_assets/merged -> the client gets a 1x1 transparent placeholder (apps/api/src/lib/resources.ts
 *    `placeholder()`). Map.ts's render order is sky -> middle -> stone(dead) -> ground(fore)
 *    (vendor/.../phy/maps/Map.as:65-108): when fore gets dug (Map.Dig erases `_ground`'s bitmapData,
 *    BlendMode.ERASE, Tile.as:22-43), the hole is supposed to reveal the `dead` rock texture underneath; with
 *    `dead` a 1x1 transparent placeholder there is nothing there, so the hole shows straight through to `back`
 *    (or to nothing, if `back` is ALSO a placeholder) -- this is backlog symptom (a), "explosion destrói o
 *    background + a estrutura".
 *  - `fore`'s PNG dimensions don't match the server's authoritative fore Tile at all (no candidate of the right
 *    size exists in ANY downloaded pack — research/assets/00-assets.md §5 "10 layers had no size-matching
 *    candidate"; map 1033 and 1490 here) -> every dig lands at the wrong relative spot on the art (desync).
 *
 * Fix: for a flagged map, synthesize the missing/mismatched layer directly from the server's own Tile bits
 * (`packages/fight/data/maps/{id}.ddtm`, decoded the same way @ddt/fight's GameMap digs it) — alpha=255 where
 * solid, 0 elsewhere for fore/dead (exactly what Tile.cs's own rule says a terrain PNG means, `A > 100 -> solid`,
 * Tile.cs:66-87 == packages/fight/src/phy/tile.ts fromRgba), or a flat opaque fill at BackroundWidht/Height for a
 * missing `back` (sky is always a plain rectangular backdrop, never dug). This guarantees pixel-identical
 * visual/collision shape — plain-colored, not pretty, but correct — using data already in the repo, no scraping
 * (forbidden by research/assets/00-assets.md §2 "don't scrape third-party CDNs"). Written to the uploads overlay
 * (wins over vendor/_assets/merged, never touches read-only vendor/).
 *
 * Usage: pnpm tsx tools/assets/fix-maps.ts [--dry] [--ids=1033,1490]
 */
import { gunzipSync, inflateRawSync } from "node:zlib";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeMapPack } from "../../packages/fight/src/data/assets.js";
import type { Tile } from "../../packages/fight/src/phy/tile.js";
import { decodePng, encodePng } from "./png.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..", "..");
const UPLOAD_DIR = resolve(REPO_ROOT, "apps", "api", ".data", "uploads");
const RESOURCE_DIR = resolve(REPO_ROOT, "vendor", "_assets", "merged");
const MAPS_DATA_DIR = resolve(REPO_ROOT, "packages", "fight", "data", "maps");

interface GameMapRow {
  ID: number;
  ForegroundWidth: number;
  ForegroundHeight: number;
  BackroundWidht: number;
  BackroundHeight: number;
  DeadWidth: number;
  DeadHeight: number;
  ForePic: string | null;
  BackPic: string | null;
  DeadPic: string | null;
}

function loadRows(): GameMapRow[] {
  const gz = resolve(REPO_ROOT, "packages", "db", "seed", "game", "Game_Map.json.gz");
  return JSON.parse(gunzipSync(readFileSync(gz)).toString("utf8"));
}
function resolveResource(rel: string): string | null {
  for (const root of [UPLOAD_DIR, RESOURCE_DIR]) {
    const p = join(root, rel);
    if (existsSync(p)) return p;
  }
  return null;
}
function tileToRgba(tile: Tile): Uint8Array {
  const rgba = new Uint8Array(tile.width * tile.height * 4);
  for (let y = 0; y < tile.height; y++)
    for (let x = 0; x < tile.width; x++) {
      const o = (y * tile.width + x) * 4;
      if (!tile.isEmpty(x, y)) {
        rgba[o] = 46;
        rgba[o + 1] = 38;
        rgba[o + 2] = 30; // dark earth fallback color (fore/dead silhouette, art-less but shape-correct)
        rgba[o + 3] = 255;
      }
    }
  return rgba;
}
function flatOpaque(w: number, h: number, rgb: [number, number, number]): Uint8Array {
  const rgba = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    rgba[i * 4] = rgb[0];
    rgba[i * 4 + 1] = rgb[1];
    rgba[i * 4 + 2] = rgb[2];
    rgba[i * 4 + 3] = 255;
  }
  return rgba;
}

async function main() {
  const dry = process.argv.includes("--dry");
  const idsArg = process.argv.find((a) => a.startsWith("--ids="))?.slice("--ids=".length);
  const onlyIds = idsArg ? new Set(idsArg.split(",").map(Number)) : null;
  const rows = loadRows().filter((r) => !onlyIds || onlyIds.has(r.ID));

  let foreFixed = 0,
    deadFixed = 0,
    backFixed = 0,
    clean = 0;
  const report: string[] = [];

  for (const row of rows) {
    const ddtmPath = join(MAPS_DATA_DIR, `${row.ID}.ddtm`);
    if (!existsSync(ddtmPath)) continue;
    const { fore: foreTile, dead: deadTile } = decodeMapPack(inflateRawSync(readFileSync(ddtmPath)));
    const wantFore = !!(row.ForePic && row.ForePic.trim());
    const wantDead = !!(row.DeadPic && row.DeadPic.trim());
    const wantBack = !!(row.BackPic && row.BackPic.trim());
    let touched = false;

    if (wantFore && foreTile) {
      const forePath = resolveResource(`image/map/${row.ID}/${row.ForePic}.png`);
      let bad = !forePath;
      if (forePath && !bad) {
        try {
          const png = decodePng(readFileSync(forePath));
          bad = png.width !== foreTile.width || png.height !== foreTile.height;
        } catch {
          bad = true;
        }
      }
      if (bad) {
        if (!dry) {
          const dir = join(UPLOAD_DIR, "image", "map", String(row.ID));
          mkdirSync(dir, { recursive: true });
          writeFileSync(join(dir, `${row.ForePic}.png`), encodePng(foreTile.width, foreTile.height, tileToRgba(foreTile)));
        }
        report.push(`map ${row.ID}: fore -> synthesized ${foreTile.width}x${foreTile.height} from server fore Tile (${forePath ? "wrong size" : "missing"})`);
        foreFixed++;
        touched = true;
      }
    }

    if (wantDead && deadTile) {
      const deadPath = resolveResource(`image/map/${row.ID}/${row.DeadPic}.png`);
      let bad = !deadPath;
      if (deadPath && !bad) {
        try {
          const png = decodePng(readFileSync(deadPath));
          bad = png.width !== deadTile.width || png.height !== deadTile.height;
        } catch {
          bad = true;
        }
      }
      if (bad) {
        if (!dry) {
          const dir = join(UPLOAD_DIR, "image", "map", String(row.ID));
          mkdirSync(dir, { recursive: true });
          writeFileSync(join(dir, `${row.DeadPic}.png`), encodePng(deadTile.width, deadTile.height, tileToRgba(deadTile)));
        }
        report.push(`map ${row.ID}: dead -> synthesized ${deadTile.width}x${deadTile.height} from server dead Tile (${deadPath ? "wrong size" : "missing"}) [fixes "hole shows through to background"]`);
        deadFixed++;
        touched = true;
      }
    }

    if (wantBack) {
      const backPath = resolveResource(`image/map/${row.ID}/${row.BackPic}.jpg`) ?? resolveResource(`image/map/${row.ID}/${row.BackPic}.png`);
      if (!backPath) {
        const w = row.BackroundWidht || row.ForegroundWidth;
        const h = row.BackroundHeight || row.ForegroundHeight;
        if (!dry) {
          const dir = join(UPLOAD_DIR, "image", "map", String(row.ID));
          mkdirSync(dir, { recursive: true });
          writeFileSync(join(dir, `${row.BackPic}.png`), encodePng(w, h, flatOpaque(w, h, [20, 24, 32])));
        }
        report.push(`map ${row.ID}: back -> synthesized flat ${w}x${h} placeholder (missing) [fixes "background invisible / void behind holes"]`);
        backFixed++;
        touched = true;
      }
    }

    if (!touched) clean++;
  }

  console.log(report.join("\n"));
  console.log(`\nmaps checked: ${rows.filter((r) => existsSync(join(MAPS_DATA_DIR, `${r.ID}.ddtm`))).length}; fore fixed: ${foreFixed}; dead fixed: ${deadFixed}; back fixed: ${backFixed}; untouched: ${clean}${dry ? " [dry run]" : ""}`);
}

main();
