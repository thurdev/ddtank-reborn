// Converts the original fight assets into the compact files under packages/fight/data/ (committed, ~3 MB):
//   data/balls.json, ballconfig.json, items.json (weapons cat 7, deputy cat 17, fight props 10001-10025), maps.json
//   data/maps/{id}.ddtm   — fore+dead layers, deflate-raw (see src/data/assets.ts)
//   data/bombs.ddtb       — all crater shapes, deflate-raw
// Sources: template rows from packages/db/seed/game/*.json.gz; binaries from DDT_FIGHT_ASSETS (default
// vendor/DDTank41/Fighting.Service/bin/Debug/net48, which contains map/{id}/{fore,dead}.map and bomb/{id}.bomb).
// Usage: pnpm --filter @ddt/fight pack-assets [--maps=1001,1002] [--assets=<dir>]
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateRawSync, gunzipSync } from "node:zlib";
import { encodeBombPack, encodeMapPack } from "../src/data/assets.js";

const pkg = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const arg = (k: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split("=")[1];
const assets = resolve(arg("assets") ?? process.env.DDT_FIGHT_ASSETS ?? join(pkg, "../../vendor/DDTank41/Fighting.Service/bin/Debug/net48"));
const seed = join(pkg, "../db/seed/game");
const out = join(pkg, "data");
mkdirSync(join(out, "maps"), { recursive: true });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rows = (t: string): any[] => JSON.parse(gunzipSync(readFileSync(join(seed, `${t}.json.gz`))).toString("utf8"));
const json = (f: string, v: unknown) => writeFileSync(join(out, f), JSON.stringify(v));

const balls = rows("Ball").map((b) => ({
  id: b.ID, name: b.Name, power: b.Power, radii: b.Radii, mass: b.Mass, weight: b.Weight, wind: b.Wind, dragIndex: b.DragIndex,
  amount: b.Amount, delay: b.Delay, hasTunnel: !!b.HasTunnel, flyingPartical: b.FlyingPartical ?? "",
}));
json("balls.json", balls);
json("ballconfig.json", rows("BallConfig").map((c) => ({ templateId: c.TemplateID, common: c.Common, special: c.Special, commonAddWound: c.CommonAddWound, commonMultiBall: c.CommonMultiBall })));
json(
  "items.json",
  rows("Shop_Goods")
    .filter((r) => r.CategoryID === 7 || r.CategoryID === 17 || (r.TemplateID >= 10001 && r.TemplateID <= 10025))
    .map((r) => ({
      templateId: r.TemplateID, name: r.Name, categoryId: r.CategoryID,
      property1: r.Property1, property2: r.Property2, property3: r.Property3, property4: r.Property4,
      property5: r.Property5, property6: r.Property6, property7: r.Property7, property8: r.Property8,
    })),
);
const only = arg("maps")?.split(",").map(Number);
const mapRows = rows("Game_Map").filter((m) => existsSync(join(assets, "map", String(m.ID))) && (!only || only.includes(m.ID)));
json(
  "maps.json",
  mapRows.map((m) => ({
    id: m.ID, name: m.Name, weight: m.Weight, dragIndex: m.DragIndex, posX: m.PosX, posX1: m.PosX1, type: m.Type,
    foregroundWidth: m.ForegroundWidth, foregroundHeight: m.ForegroundHeight,
  })),
);
let total = 0;
for (const m of mapRows) {
  const f = (n: string) => (existsSync(join(assets, "map", String(m.ID), n)) ? new Uint8Array(readFileSync(join(assets, "map", String(m.ID), n))) : null);
  const packed = deflateRawSync(encodeMapPack(f("fore.map"), f("dead.map")), { level: 9 });
  writeFileSync(join(out, "maps", `${m.ID}.ddtm`), packed);
  total += packed.length;
}
const shapes: [number, Uint8Array][] = [];
for (const f of readdirSync(join(assets, "bomb"))) {
  const m = /^(\d+)\.bomb$/.exec(f);
  if (m) shapes.push([Number(m[1]), new Uint8Array(readFileSync(join(assets, "bomb", f)))]);
}
shapes.sort((a, b) => a[0] - b[0]);
const bombs = deflateRawSync(encodeBombPack(shapes), { level: 9 });
writeFileSync(join(out, "bombs.ddtb"), bombs);
console.log(`${mapRows.length} maps (${(total / 1024).toFixed(0)} KiB), ${shapes.length} shapes (${(bombs.length / 1024).toFixed(0)} KiB), ${balls.length} balls -> ${out}`);
