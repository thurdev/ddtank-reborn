#!/usr/bin/env tsx
/**
 * Fixes backlog suspicion #1 ("Destruição de terreno dessincronizada", docs/BACKLOG.md): the client draws a
 * *different* crater shape than the server digs whenever `image/bomb/crater/{Crater}/crater.png` is missing or
 * corrupt — apps/api/src/routes/static.ts then 404s to a 1x1 transparent placeholder (apps/api/src/lib/resources.ts
 * `placeholder()`), or serves a PNG with bad chunk CRCs that Ruffle's decoder rejects outright
 * (static.ts `badPngCrc`, e.g. image/bomb/crater/870/*.png). Either way `Tile.Dig(point, crater, brink)`
 * (vendor/DDTank41/Source Flash/src/phy/maps/Tile.as:22-43) erases nothing or a 1x1 dot while the SERVER'S own
 * Tile — `BallMgr.FindTile(ballId)` loading `bomb/{ballId}.bomb` (vendor/DDTank41/Game.Logic/BallMgr.cs:36,115-136,
 * same `packages/fight/data/bombs.ddtb` this script reads) — removes the real, much bigger shape from the
 * collision mask. Net effect: "collision disappears but texture stays" (invisible hole).
 *
 * The client's crater image folder id is `Ball.Crater` (vendor/DDTank41/SqlDataProvider/Data/BallInfo.cs:15,
 * `ddt/data/analyze/BallInfoAnalyzer.as:34`), which is usually a DIFFERENT number than the ball id the server
 * keys its dig shape on (confirmed against the game.Ball seed: of 1550 balls with HasTunnel=true, 1385 have
 * Crater != ID — many balls intentionally share one crater image). This script regenerates crater.png (+ a
 * cheap craterBrink.png) straight from the server's own Tile bits for a REPRESENTATIVE ball of each craterId
 * group (the first member that has a packed shape) wherever the currently-served file is missing or
 * CRC-corrupt, so the visual hole and the collision hole are pixel-identical for that id. Output goes to the
 * uploads overlay (apps/api/src/app.ts: `new ResourceIndex([overlay, merged])`, overlay wins), never touching
 * the gitignored vendor/_assets/merged pack or read-only vendor/.
 *
 * Usage: pnpm tsx tools/assets/gen-craters.ts [--dry]
 */
import { crc32, gunzipSync, inflateRawSync } from "node:zlib";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeBombPack } from "../../packages/fight/src/data/assets.js";
import type { Tile } from "../../packages/fight/src/phy/tile.js";
import { encodePng } from "./png.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..", "..");
const UPLOAD_DIR = resolve(REPO_ROOT, "apps", "api", ".data", "uploads");
const RESOURCE_DIR = resolve(REPO_ROOT, "vendor", "_assets", "merged");
const PNG_1x1 = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");

interface BallRow {
  ID: number;
  Crater: string | null;
  HasTunnel: boolean;
}

function loadBallRows(): BallRow[] {
  const gz = resolve(REPO_ROOT, "packages", "db", "seed", "game", "Ball.json.gz");
  return JSON.parse(gunzipSync(readFileSync(gz)).toString("utf8"));
}

function badPngCrc(b: Buffer): boolean {
  let o = 8;
  while (o + 12 <= b.length) {
    const len = b.readUInt32BE(o);
    if (o + 12 + len > b.length) return true;
    if ((crc32(b.subarray(o + 4, o + 8 + len)) >>> 0) !== b.readUInt32BE(o + 8 + len)) return true;
    o += 12 + len;
  }
  return false;
}

/** Current served state of image/bomb/crater/{craterId}/crater.png: overlay wins, then merged (ResourceIndex order). */
function craterNeedsFix(craterId: string): { needsFix: boolean; reason: string } {
  const up = join(UPLOAD_DIR, "image", "bomb", "crater", craterId, "crater.png");
  const mp = join(RESOURCE_DIR, "image", "bomb", "crater", craterId, "crater.png");
  const f = existsSync(up) ? up : existsSync(mp) ? mp : null;
  if (!f) return { needsFix: true, reason: "missing (404 -> 1x1 transparent placeholder, erases nothing)" };
  const b = readFileSync(f);
  if (b.equals(PNG_1x1)) return { needsFix: true, reason: "placeholder PNG already served" };
  if (b[0] === 0x89 && b[1] === 0x50 && badPngCrc(b)) return { needsFix: true, reason: "bad chunk CRC (Ruffle rejects it)" };
  return { needsFix: false, reason: "" };
}

/** Tile bits -> RGBA8 (opaque black where solid, transparent elsewhere) — Tile.Dig only reads source alpha
 *  (BlendMode.ERASE subtracts destination alpha by source alpha; color is irrelevant). */
function tileToRgba(tile: Tile): Uint8Array {
  const rgba = new Uint8Array(tile.width * tile.height * 4);
  for (let y = 0; y < tile.height; y++) {
    for (let x = 0; x < tile.width; x++) {
      const o = (y * tile.width + x) * 4;
      if (!tile.isEmpty(x, y)) rgba[o + 3] = 255; // rgb stays 0 (black); alpha 255 = fully erase
    }
  }
  return rgba;
}

/** Cheap craterBrink: same silhouette, lower alpha, 2px dilated ring look (good enough — Tile.Dig's `border` is a
 *  documented no-op for the actual terrain erase on both client and ported engine; craterBrink only paints a
 *  cosmetic rim, see Tile.as:32-42 vs Tile.cs's commented-out Add). */
function tileToBrinkRgba(tile: Tile): Uint8Array {
  const rgba = new Uint8Array(tile.width * tile.height * 4);
  for (let y = 0; y < tile.height; y++) {
    for (let x = 0; x < tile.width; x++) {
      const o = (y * tile.width + x) * 4;
      if (!tile.isEmpty(x, y)) {
        rgba[o] = 90;
        rgba[o + 1] = 60;
        rgba[o + 2] = 30;
        rgba[o + 3] = 140;
      }
    }
  }
  return rgba;
}

async function main() {
  const dry = process.argv.includes("--dry");
  const balls = loadBallRows().filter((b) => b.HasTunnel);
  const groups = new Map<string, number[]>();
  for (const b of balls) {
    const cid = b.Crater && b.Crater.trim() !== "" ? b.Crater.trim() : "0";
    (groups.get(cid) ?? groups.set(cid, []).get(cid)!).push(b.ID);
  }

  const bombsPath = resolve(REPO_ROOT, "packages", "fight", "data", "bombs.ddtb");
  const shapes = decodeBombPack(inflateRawSync(readFileSync(bombsPath)));

  let fixed = 0,
    skippedNoShape = 0,
    alreadyOk = 0;
  const report: string[] = [];
  for (const [craterId, ballIds] of [...groups].sort((a, b) => Number(a[0]) - Number(b[0]))) {
    const { needsFix, reason } = craterNeedsFix(craterId);
    if (!needsFix) {
      alreadyOk++;
      continue;
    }
    const repBallId = ballIds.find((id) => shapes.has(id));
    if (repBallId === undefined) {
      skippedNoShape++;
      report.push(`craterId ${craterId} (balls ${ballIds.join(",")}): ${reason}, but no member ball has a packed .bomb shape -- SKIPPED`);
      continue;
    }
    const tile = shapes.get(repBallId)!;
    report.push(`craterId ${craterId} (balls ${ballIds.join(",")}): ${reason} -- generated from ball ${repBallId}'s bomb/${repBallId}.bomb (${tile.width}x${tile.height})`);
    if (!dry) {
      const dir = join(UPLOAD_DIR, "image", "bomb", "crater", craterId);
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, "crater.png"), encodePng(tile.width, tile.height, tileToRgba(tile)));
      writeFileSync(join(dir, "craterBrink.png"), encodePng(tile.width, tile.height, tileToBrinkRgba(tile)));
    }
    fixed++;
  }

  console.log(report.join("\n"));
  console.log(`\n${groups.size} crater groups (${balls.length} balls with HasTunnel). already ok: ${alreadyOk}, fixed: ${fixed}, skipped (no shape): ${skippedNoShape}${dry ? " [dry run, nothing written]" : ""}`);
}

main();
