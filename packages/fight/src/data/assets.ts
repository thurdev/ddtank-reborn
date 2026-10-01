import type { MapInfo } from "../phy/map.js";
import { GameMap } from "../phy/map.js";
import { Tile } from "../phy/tile.js";
import type { BallConfigInfo, BallInfo, ItemTemplate } from "./types.js";

/**
 * Compact asset containers (I/O-free codecs; callers inflate/deflate with zlib or `DecompressionStream("deflate-raw")`).
 *
 * `.ddtm` (one map, deflate-raw):  "DDTM" u8 version=1, u8 flags (bit0 fore, bit1 dead), then per present layer
 *                                   u32 LE byteLength + the original `.map` file bytes (Tile format, see tile.ts).
 * `.ddtb` (all crater shapes):      "DDTB" u8 version=1, u32 LE count, then per shape i32 LE ballId, u32 LE byteLength,
 *                                   original `.bomb` bytes.
 */
const MAGIC_MAP = [0x44, 0x44, 0x54, 0x4d];
const MAGIC_BOMB = [0x44, 0x44, 0x54, 0x42];

function writer() {
  const parts: Uint8Array[] = [];
  let len = 0;
  return {
    bytes(b: Uint8Array | number[]) {
      const u = b instanceof Uint8Array ? b : Uint8Array.from(b);
      parts.push(u);
      len += u.length;
    },
    u32(v: number) {
      const b = new Uint8Array(4);
      new DataView(b.buffer).setUint32(0, v >>> 0, true);
      this.bytes(b);
    },
    i32(v: number) {
      const b = new Uint8Array(4);
      new DataView(b.buffer).setInt32(0, v, true);
      this.bytes(b);
    },
    done(): Uint8Array {
      const out = new Uint8Array(len);
      let o = 0;
      for (const p of parts) {
        out.set(p, o);
        o += p.length;
      }
      return out;
    },
  };
}

export function encodeMapPack(fore: Uint8Array | null, dead: Uint8Array | null): Uint8Array {
  const w = writer();
  w.bytes(MAGIC_MAP);
  w.bytes([1, (fore ? 1 : 0) | (dead ? 2 : 0)]);
  for (const l of [fore, dead]) {
    if (!l) continue;
    w.u32(l.length);
    w.bytes(l);
  }
  return w.done();
}

export function decodeMapPack(bytes: Uint8Array): { fore: Tile | null; dead: Tile | null } {
  for (let i = 0; i < 4; i++) if (bytes[i] !== MAGIC_MAP[i]) throw new Error("not a DDTM map pack");
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const flags = bytes[5];
  let o = 6;
  const read = (digable: boolean) => {
    const n = dv.getUint32(o, true);
    o += 4;
    const t = Tile.fromFile(bytes.subarray(o, o + n), digable);
    o += n;
    return t;
  };
  const fore = flags & 1 ? read(true) : null;
  const dead = flags & 2 ? read(false) : null;
  return { fore, dead };
}

export function encodeBombPack(shapes: Iterable<[number, Uint8Array]>): Uint8Array {
  const list = [...shapes];
  const w = writer();
  w.bytes(MAGIC_BOMB);
  w.bytes([1]);
  w.u32(list.length);
  for (const [id, b] of list) {
    w.i32(id);
    w.u32(b.length);
    w.bytes(b);
  }
  return w.done();
}

export function decodeBombPack(bytes: Uint8Array): Map<number, Tile> {
  for (let i = 0; i < 4; i++) if (bytes[i] !== MAGIC_BOMB[i]) throw new Error("not a DDTB bomb pack");
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const count = dv.getUint32(5, true);
  let o = 9;
  const out = new Map<number, Tile>();
  for (let i = 0; i < count; i++) {
    const id = dv.getInt32(o, true);
    const n = dv.getUint32(o + 4, true);
    o += 8;
    out.set(id, Tile.fromFile(bytes.subarray(o, o + n), false));
    o += n;
  }
  return out;
}

/** Terrain source: returns the two raw layers of a map (already parsed). */
export type MapTerrainProvider = (mapId: number) => { fore: Tile | null; dead: Tile | null } | null;

/** All template data the engine needs. Build it from `data/` (see node.ts) or from your own DB rows. */
export class FightAssets {
  readonly balls = new Map<number, BallInfo>();
  readonly ballConfigs = new Map<number, BallConfigInfo>();
  readonly items = new Map<number, ItemTemplate>();
  readonly maps = new Map<number, MapInfo>();
  /** crater shapes by ball id (`BallMgr.FindTile`): only balls with `hasTunnel` get one */
  readonly shapes = new Map<number, Tile>();
  private terrainCache = new Map<number, { fore: Tile | null; dead: Tile | null }>();

  constructor(
    init: { balls?: BallInfo[]; ballConfigs?: BallConfigInfo[]; items?: ItemTemplate[]; maps?: MapInfo[]; shapes?: Map<number, Tile> },
    private readonly terrain?: MapTerrainProvider,
  ) {
    for (const b of init.balls ?? []) if (!this.balls.has(b.id)) this.balls.set(b.id, b);
    for (const c of init.ballConfigs ?? []) this.ballConfigs.set(c.templateId, c);
    for (const i of init.items ?? []) this.items.set(i.templateId, i);
    for (const m of init.maps ?? []) this.maps.set(m.id, m);
    for (const [id, t] of init.shapes ?? []) this.shapes.set(id, t);
  }

  ball(id: number): BallInfo | undefined {
    return this.balls.get(id);
  }

  /** `BallMgr.FindTile` — null when the ball has no tunnel or the file is missing (no dig). */
  shape(ballId: number): Tile | null {
    const b = this.balls.get(ballId);
    if (!b?.hasTunnel) return null;
    return this.shapes.get(ballId) ?? null;
  }

  /** A fresh, per-game copy of the map (`MapMgr.CloneMap`). */
  createMap(mapId: number, info?: MapInfo): GameMap {
    const mi = info ?? this.maps.get(mapId);
    if (!mi) throw new Error(`unknown map ${mapId}`);
    let t = this.terrainCache.get(mapId);
    if (!t) {
      const loaded = this.terrain?.(mapId);
      if (!loaded || (!loaded.fore && !loaded.dead)) throw new Error(`no terrain for map ${mapId}`);
      t = loaded;
      this.terrainCache.set(mapId, t);
    }
    return new GameMap(mi, t.fore?.clone() ?? null, t.dead?.clone() ?? null);
  }

  /** Registers terrain directly (e.g. a browser client that fetched + inflated a `.ddtm`). */
  setTerrain(mapId: number, fore: Tile | null, dead: Tile | null): void {
    this.terrainCache.set(mapId, { fore, dead });
  }
}

/** Browser/Node 18+ helper: inflate deflate-raw bytes with the standard `DecompressionStream`. */
export async function inflateRaw(bytes: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream("deflate-raw");
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(ds);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
