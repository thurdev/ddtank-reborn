import { type Point, type Rect, intersect, rect as mkRect } from "./rect.js";

/**
 * 1-bit terrain bitmap — port of `Game.Logic/Phy/Maps/Tile.cs`.
 *
 * File format (`.map` / `.bomb`, `Tile(string file)` Tile.cs:89-104): `i32 LE width, i32 LE height`, then
 * `(width/8 + 1) * height` bytes, row-major, MSB-first (`bit = 7 - x%8`), 1 = solid.
 */
export class Tile {
  readonly data: Uint8Array;
  readonly width: number;
  readonly height: number;
  readonly digable: boolean;
  readonly bound: Rect;
  /** bytes per row */
  readonly bw: number;

  constructor(data: Uint8Array, width: number, height: number, digable: boolean) {
    this.data = data;
    this.width = width;
    this.height = height;
    this.digable = digable;
    this.bw = ((width / 8) | 0) + 1;
    this.bound = mkRect(0, 0, width, height);
  }

  /** Parses the raw `.map`/`.bomb` file bytes (Tile.cs:89). */
  static fromFile(bytes: Uint8Array, digable: boolean): Tile {
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const width = dv.getInt32(0, true);
    const height = dv.getInt32(4, true);
    const len = (((width / 8) | 0) + 1) * height;
    const data = new Uint8Array(len);
    data.set(bytes.subarray(8, Math.min(bytes.length, 8 + len)));
    return new Tile(data, width, height, digable);
  }

  /** Builds a tile from RGBA pixels, `A > 100 → solid` (Tile.cs:66-87). */
  static fromRgba(rgba: Uint8Array | Uint8ClampedArray, width: number, height: number, digable: boolean): Tile {
    const bw = ((width / 8) | 0) + 1;
    const data = new Uint8Array(bw * height);
    for (let j = 0; j < height; j++)
      for (let i = 0; i < width; i++) if (rgba[(j * width + i) * 4 + 3] > 100) data[j * bw + ((i / 8) | 0)] |= 1 << (7 - (i % 8));
    return new Tile(data, width, height, digable);
  }

  /** Serializes back to the original file format. */
  toFile(): Uint8Array {
    const out = new Uint8Array(8 + this.data.length);
    const dv = new DataView(out.buffer);
    dv.setInt32(0, this.width, true);
    dv.setInt32(4, this.height, true);
    out.set(this.data, 8);
    return out;
  }

  clone(): Tile {
    return new Tile(this.data.slice(), this.width, this.height, this.digable);
  }

  /** Tile.cs:108-125. `border` is accepted for parity but, as in C#, `Add` is a no-op: craters only remove. */
  dig(cx: number, cy: number, surface: Tile | null, _border?: Tile | null): void {
    if (this.digable && surface) {
      const x1 = cx - ((surface.width / 2) | 0);
      const y1 = cy - ((surface.height / 2) | 0);
      this.remove(x1, y1, surface);
    }
  }

  /** Verbatim port of the byte-aligned shifted-mask clear (Tile.cs:181-287), including its edge behaviour. */
  protected remove(x: number, y: number, tile: Tile): void {
    const addData = tile.data;
    const d = this.data;
    let r = intersect({ x: tile.bound.x + x, y: tile.bound.y + y, width: tile.bound.width, height: tile.bound.height }, this.bound);
    if (r.width === 0 || r.height === 0) return;
    r = { x: r.x - x, y: r.y - y, width: r.width, height: r.height };
    const cx = (r.x / 8) | 0;
    const cx2 = ((r.x + x) / 8) | 0;
    const cy = r.y;
    let cw = ((r.width / 8) | 0) + 1;
    const ch = r.height;
    const at = (i: number) => addData[i] ?? 0;
    if (r.x === 0) {
      if (cw + cx2 < this.bw) {
        cw++;
        cw = cw > tile.bw ? tile.bw : cw;
      }
      const bOff = (r.x + x) % 8;
      for (let j = 0; j < ch; j++) {
        let lBits = 0;
        for (let i = 0; i < cw; i++) {
          const self = (j + y + cy) * this.bw + i + cx2;
          const src = at((j + cy) * tile.bw + i + cx);
          const rBits = src >> bOff;
          let target = d[self] ?? 0;
          target &= ~(target & rBits);
          if (lBits !== 0) target &= ~(target & lBits);
          if (self < d.length) d[self] = target & 0xff;
          lBits = src << (8 - bOff);
        }
      }
    } else {
      const bOff = r.x % 8;
      for (let j = 0; j < ch; j++) {
        for (let i = 0; i < cw; i++) {
          const self = (j + y + cy) * this.bw + i + cx2;
          const tOff = (j + cy) * tile.bw + i + cx;
          const lBits = at(tOff) << bOff;
          const rBits = i < cw - 1 ? at(tOff + 1) >> (8 - bOff) : 0;
          let target = d[self] ?? 0;
          target &= ~(target & lBits);
          if (rBits !== 0) target &= ~(target & rBits);
          if (self < d.length) d[self] = target & 0xff;
        }
      }
    }
  }

  isEmpty(x: number, y: number): boolean {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      return (this.data[y * this.bw + ((x / 8) | 0)] & (1 << (7 - (x % 8)))) === 0;
    }
    return true;
  }

  isYLineEmpty(x: number, y: number, h: number): boolean {
    if (x >= 0 && x < this.width) {
      y = y < 0 ? 0 : y;
      h = y + h > this.height ? this.height - y : h;
      for (let i = 0; i < h; i++) if (!this.isEmpty(x, y + i)) return false;
    }
    return true;
  }

  /** Only the four corners (incl. the exclusive Right/Bottom pixel) are tested, after clipping (Tile.cs:322). */
  isRectangleEmptyQuick(r: Rect): boolean {
    const c = intersect(r, this.bound);
    const right = c.x + c.width;
    const bottom = c.y + c.height;
    return this.isEmpty(right, bottom) && this.isEmpty(c.x, bottom) && this.isEmpty(right, c.y) && this.isEmpty(c.x, c.y);
  }

  findNotEmptyPoint(x: number, y: number, h: number): Point {
    if (x >= 0 && x < this.width) {
      y = y < 0 ? 0 : y;
      h = y + h > this.height ? this.height - y : h;
      for (let i = 0; i < h; i++) if (!this.isEmpty(x, y + i)) return { x, y: y + i };
    }
    return { x: -1, y: -1 };
  }

  /** Number of solid pixels (handy for tests/diagnostics). */
  countSolid(): number {
    let n = 0;
    for (let y = 0; y < this.height; y++) for (let x = 0; x < this.width; x++) if (!this.isEmpty(x, y)) n++;
    return n;
  }
}
