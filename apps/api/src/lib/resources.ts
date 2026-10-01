/**
 * Case-insensitive static trees (IIS semantics; the client lowercases every URL, LoaderManager.as:97).
 * A lowercase index is built at boot; overlays (admin uploads) are checked first. Missing resource files get a
 * typed placeholder and are counted (GET /api/admin/assets/misses).
 */
import { existsSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

export class CiTree {
  private index = new Map<string, string>();
  constructor(readonly root: string) {
    this.reindex();
  }
  reindex(): void {
    this.index.clear();
    if (!this.root || !existsSync(this.root)) return;
    const walk = (dir: string) => {
      let names: string[];
      try {
        names = readdirSync(dir);
      } catch {
        return;
      }
      for (const n of names) {
        const abs = join(dir, n);
        let st;
        try {
          st = statSync(abs);
        } catch {
          continue;
        }
        if (st.isDirectory()) walk(abs);
        else this.index.set(relative(this.root, abs).split(sep).join("/").toLowerCase(), abs);
      }
    };
    walk(this.root);
  }
  /** rel = URL path below the mount ("image/arm/x/1/0/show.png"). Rejects traversal. */
  resolve(rel: string): string | undefined {
    const clean = rel.replace(/\\/g, "/").replace(/^\/+/, "");
    if (clean.split("/").some((s) => s === "..")) return undefined;
    return this.index.get(clean.replace(/\/{2,}/g, "/").toLowerCase()) ?? this.index.get(clean.toLowerCase());
  }
  add(rel: string, abs: string): void {
    this.index.set(rel.toLowerCase(), abs);
  }
  remove(rel: string): void {
    this.index.delete(rel.toLowerCase());
  }
  get size(): number {
    return this.index.size;
  }
}

export class ResourceIndex {
  readonly misses = new Map<string, number>();
  constructor(
    readonly trees: CiTree[],
    private maxMisses = 5000,
  ) {}
  resolve(rel: string): string | undefined {
    for (const t of this.trees) {
      const f = t.resolve(rel);
      if (f) return f;
    }
    return undefined;
  }
  miss(rel: string): void {
    const k = rel.toLowerCase();
    if (this.misses.size >= this.maxMisses && !this.misses.has(k)) return;
    this.misses.set(k, (this.misses.get(k) ?? 0) + 1);
  }
}

const PNG_1x1 = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
/** Minimal valid SWF (FWS v10, empty stage, 1 frame). */
const EMPTY_SWF = Buffer.from([0x46, 0x57, 0x53, 0x0a, 0x11, 0, 0, 0, 0x00, 0x00, 0x18, 0x01, 0x00, 0x40, 0x00, 0x00, 0x00]);

export function placeholder(path: string): { body: Buffer; type: string } | undefined {
  const ext = path.toLowerCase().split(".").pop();
  if (ext === "png" || ext === "jpg" || ext === "jpeg" || ext === "gif") return { body: PNG_1x1, type: "image/png" };
  if (ext === "swf") return { body: EMPTY_SWF, type: "application/x-shockwave-flash" };
  if (ext === "xml") return { body: Buffer.from("<root />"), type: "text/xml" };
  return undefined;
}

export const MIME: Record<string, string> = {
  html: "text/html; charset=utf-8",
  js: "text/javascript; charset=utf-8",
  mjs: "text/javascript; charset=utf-8",
  wasm: "application/wasm",
  swf: "application/x-shockwave-flash",
  xml: "text/xml; charset=utf-8",
  txt: "text/plain; charset=utf-8",
  json: "application/json",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  ttf: "font/ttf",
  otf: "font/otf",
  woff2: "font/woff2",
  flv: "video/x-flv",
  mp3: "audio/mpeg",
  bin: "application/octet-stream",
  zip: "application/zip",
  exe: "application/octet-stream",
};
export const mimeOf = (p: string) => MIME[p.toLowerCase().split(".").pop() ?? ""] ?? "application/octet-stream";
