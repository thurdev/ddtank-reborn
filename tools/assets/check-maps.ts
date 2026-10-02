#!/usr/bin/env tsx
/**
 * Per-map terrain/art audit for the "destruição de terreno dessincronizada" ticket
 * (docs/BACKLOG.md "[ALTA PRIORIDADE — próximo lote]"). For every row of game."Game_Map" (seed:
 * packages/db/seed/game/Game_Map.json.gz — same rows the server loads) this:
 *
 *   1. Loads the server's authoritative collision mask: packages/fight/data/maps/{id}.ddtm (fore + dead Tile,
 *      the exact bytes @ddt/fight's PvpGame/PveGame dig against — see packages/fight/src/data/tile.ts).
 *   2. Resolves the fore/back/dead images through the SAME lookup order apps/api/src/app.ts uses for
 *      GET /resource/image/map/{id}/{Pic}.{png,jpg}: UPLOAD_DIR overlay first, then vendor/_assets/merged
 *      (apps/api/src/lib/resources.ts ResourceIndex; Windows NTFS is already case-insensitive so a plain
 *      existsSync reproduces CiTree's case folding here).
 *   3. Compares: PNG/JPG dimensions vs the Game_Map ForegroundWidth/Height, BackroundWidht/Height,
 *      DeadWidth/Height columns; fore-alpha-as-solid-mask (Tile.cs's own rule, `A > 100 → solid`,
 *      ../../packages/fight/src/phy/tile.ts fromRgba) vs the server's fore Tile bits (IoU); back vs fore
 *      byte-identical (wrong layer picked up twice); missing files when the DB row names a layer.
 *
 * Output: research/assets/map-check.md (one row per map + a flagged-maps summary tools/assets/fix-maps.ts reads).
 *
 * Usage: pnpm tsx tools/assets/check-maps.ts [--ids=1001,1002] [--json=path]
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync, inflateRawSync } from "node:zlib";
import { decodeMapPack } from "../../packages/fight/src/data/assets.js";
import { Tile } from "../../packages/fight/src/phy/tile.js";
import { decodePng, jpegSize } from "./png.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..", "..");
const UPLOAD_DIR = resolve(REPO_ROOT, "apps", "api", ".data", "uploads");
const RESOURCE_DIR = resolve(REPO_ROOT, "vendor", "_assets", "merged");
const MAPS_DATA_DIR = resolve(REPO_ROOT, "packages", "fight", "data", "maps");

interface GameMapRow {
  ID: number;
  Name: string | null;
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

function loadGameMapRows(): GameMapRow[] {
  const gz = resolve(REPO_ROOT, "packages", "db", "seed", "game", "Game_Map.json.gz");
  return JSON.parse(gunzipSync(readFileSync(gz)).toString("utf8"));
}

/** Resolves a resource-relative path the way apps/api/src/app.ts does: uploads overlay, then merged pack. */
function resolveResource(rel: string): string | null {
  for (const root of [UPLOAD_DIR, RESOURCE_DIR]) {
    const p = join(root, rel);
    if (existsSync(p)) return p;
  }
  return null;
}

function sha256(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

/** IoU between the server Tile's solid bits and a decoded PNG's alpha>100 mask (Tile.cs rule), over the
 *  intersection of both extents (reported separately when the extents differ — that mismatch is itself a finding). */
function tileVsAlphaIoU(tile: Tile, png: { width: number; height: number; rgba: Uint8Array }): { iou: number; wTile: number; hTile: number; wPng: number; hPng: number } {
  const w = Math.min(tile.width, png.width);
  const h = Math.min(tile.height, png.height);
  let inter = 0,
    union = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const tSolid = !tile.isEmpty(x, y);
      const pSolid = png.rgba[(y * png.width + x) * 4 + 3]! > 100;
      if (tSolid && pSolid) inter++;
      if (tSolid || pSolid) union++;
    }
  }
  return { iou: union === 0 ? 1 : inter / union, wTile: tile.width, hTile: tile.height, wPng: png.width, hPng: png.height };
}

interface MapFinding {
  id: number;
  name: string;
  hasFore: boolean;
  hasDead: boolean;
  issues: string[];
  foreIoU: number | null;
  deadIoU: number | null;
  forePath: string | null;
  backPath: string | null;
  deadPath: string | null;
}

async function main() {
  const args = process.argv.slice(2);
  const idsArg = args.find((a) => a.startsWith("--ids="))?.slice("--ids=".length);
  const jsonOut = args.find((a) => a.startsWith("--json="))?.slice("--json=".length);
  const onlyIds = idsArg ? new Set(idsArg.split(",").map(Number)) : null;

  const rows = loadGameMapRows().filter((r) => !onlyIds || onlyIds.has(r.ID));
  const findings: MapFinding[] = [];
  let okCount = 0;

  for (const row of rows) {
    const ddtmPath = join(MAPS_DATA_DIR, `${row.ID}.ddtm`);
    if (!existsSync(ddtmPath)) continue; // no packed terrain for this map id — not a map-art finding, skip
    const { fore: foreTile, dead: deadTile } = decodeMapPack(inflateRawSync(readFileSync(ddtmPath)));
    const issues: string[] = [];
    const wantFore = !!(row.ForePic && row.ForePic.trim());
    const wantDead = !!(row.DeadPic && row.DeadPic.trim());
    const wantBack = !!(row.BackPic && row.BackPic.trim());

    const forePath = wantFore ? resolveResource(`image/map/${row.ID}/${row.ForePic}.png`) : null;
    const deadPath = wantDead ? resolveResource(`image/map/${row.ID}/${row.DeadPic}.png`) : null;
    const backPath =
      wantBack ? resolveResource(`image/map/${row.ID}/${row.BackPic}.jpg`) ?? resolveResource(`image/map/${row.ID}/${row.BackPic}.png`) : null;

    if (wantFore && !forePath) issues.push("fore: missing (404 -> 1x1 placeholder; server mask has real geometry)");
    if (wantDead && !deadPath) issues.push("dead: missing (404 -> 1x1 placeholder; indestructible rock layer invisible, holes show through to background)");
    if (wantBack && !backPath) issues.push("back: missing (404 -> 1x1 placeholder; whole sky/background invisible)");

    let foreIoU: number | null = null;
    let deadIoU: number | null = null;
    let foreBuf: Buffer | null = null;
    let backBuf: Buffer | null = null;

    if (forePath && foreTile) {
      try {
        foreBuf = readFileSync(forePath);
        const png = decodePng(foreBuf);
        if (png.width !== row.ForegroundWidth || png.height !== row.ForegroundHeight)
          issues.push(`fore: PNG ${png.width}x${png.height} != Game_Map.ForegroundWidth/Height ${row.ForegroundWidth}x${row.ForegroundHeight}`);
        if (png.width !== foreTile.width || png.height !== foreTile.height)
          issues.push(`fore: PNG ${png.width}x${png.height} != server fore Tile ${foreTile.width}x${foreTile.height} (positions will desync)`);
        const r = tileVsAlphaIoU(foreTile, png);
        foreIoU = r.iou;
        if (r.iou < 0.6) issues.push(`fore: alpha-vs-mask IoU ${r.iou.toFixed(2)} (wrong art / wrong layer picked for this map)`);
      } catch (e) {
        issues.push(`fore: decode failed (${(e as Error).message})`);
      }
    } else if (forePath && !foreTile) {
      issues.push("fore: image present but server has no fore Tile for this map (digging will no-op server-side; art looks diggable but isn't)");
    }

    if (deadPath && deadTile) {
      try {
        const png = decodePng(readFileSync(deadPath));
        if (png.width !== row.DeadWidth || png.height !== row.DeadHeight)
          issues.push(`dead: PNG ${png.width}x${png.height} != Game_Map.DeadWidth/Height ${row.DeadWidth}x${row.DeadHeight}`);
        if (png.width !== deadTile.width || png.height !== deadTile.height)
          issues.push(`dead: PNG ${png.width}x${png.height} != server dead Tile ${deadTile.width}x${deadTile.height}`);
        const r = tileVsAlphaIoU(deadTile, png);
        deadIoU = r.iou;
        if (r.iou < 0.6) issues.push(`dead: alpha-vs-mask IoU ${r.iou.toFixed(2)} (wrong art for this map's rock layer)`);
      } catch (e) {
        issues.push(`dead: decode failed (${(e as Error).message})`);
      }
    }

    if (backPath) {
      try {
        backBuf = readFileSync(backPath);
        const isJpg = backPath.toLowerCase().endsWith(".jpg");
        const dims = isJpg ? jpegSize(backBuf) : decodePng(backBuf);
        if (dims && (dims.width !== row.BackroundWidht || dims.height !== row.BackroundHeight))
          issues.push(`back: image ${dims.width}x${dims.height} != Game_Map.BackroundWidht/Height ${row.BackroundWidht}x${row.BackroundHeight}`);
      } catch (e) {
        issues.push(`back: decode failed (${(e as Error).message})`);
      }
    }

    if (foreBuf && backBuf && sha256(foreBuf) === sha256(backBuf))
      issues.push("back: byte-identical to fore (same file picked for both layers — build-pack.mjs chose the wrong candidate for one of them)");

    if (issues.length === 0) okCount++;
    findings.push({
      id: row.ID,
      name: row.Name ?? "",
      hasFore: !!foreTile,
      hasDead: !!deadTile,
      issues,
      foreIoU,
      deadIoU,
      forePath,
      backPath,
      deadPath,
    });
  }

  const flagged = findings.filter((f) => f.issues.length > 0);
  const lines: string[] = [];
  lines.push("# Map art/terrain check (auto-generated by tools/assets/check-maps.ts)");
  lines.push("");
  lines.push(`Checked ${findings.length} maps (have a packed \`.ddtm\`). ${okCount} clean, **${flagged.length} flagged**.`);
  lines.push("");
  lines.push("Thresholds: fore/dead alpha-vs-mask IoU < 0.60 is flagged (wrong art for this map); any dimension");
  lines.push("mismatch against the Game_Map row or the server Tile is flagged regardless of IoU (position desync");
  lines.push("even if the art is otherwise correct); a missing file means the API 404s to a 1x1 placeholder PNG.");
  lines.push("");
  lines.push("| Map ID | Name | fore IoU | dead IoU | Issues |");
  lines.push("|---|---|---|---|---|");
  for (const f of flagged.sort((a, b) => a.id - b.id)) {
    lines.push(
      `| ${f.id} | ${f.name.replace(/\|/g, "\\|")} | ${f.foreIoU === null ? "-" : f.foreIoU.toFixed(2)} | ${f.deadIoU === null ? "-" : f.deadIoU.toFixed(2)} | ${f.issues.join("; ")} |`,
    );
  }
  lines.push("");
  lines.push("## Clean maps (no finding)");
  lines.push("");
  lines.push(findings.filter((f) => f.issues.length === 0).map((f) => f.id).join(", "));
  lines.push("");

  const outPath = resolve(REPO_ROOT, "research", "assets", "map-check.md");
  writeFileSync(outPath, lines.join("\n"));
  console.log(`wrote ${outPath}`);
  console.log(`${findings.length} maps checked, ${okCount} clean, ${flagged.length} flagged`);

  if (jsonOut) writeFileSync(resolve(jsonOut), JSON.stringify(findings, null, 1));
}

main();
