import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { DbHandle } from "@ddt/db";
import { zlibXml } from "../lib/flash-xml.js";
import { TEMPLATES, type TemplateDef } from "./defs.js";

export interface CachedFile {
  name: string;
  body: Buffer;
  compressed: boolean;
  etag: string;
  builtAt: Date;
  source: "db" | "snapshot";
}

/**
 * In-memory cache of the generated template XML files (replaces the files CreateAllXml.ashx wrote into the web root).
 * Keys are lowercase file names without extension (the client lowercases every URL).
 */
export class TemplateCache {
  private files = new Map<string, CachedFile>();
  private snapshots = new Map<string, string>();
  private building = new Map<TemplateDef, Promise<void>>();
  readonly defs = TEMPLATES;

  constructor(
    private h: DbHandle,
    private opts: { snapshotDir?: string; log?: (msg: string) => void } = {},
  ) {
    const dir = opts.snapshotDir;
    if (dir && existsSync(dir)) {
      for (const f of readdirSync(dir)) if (f.toLowerCase().endsWith(".xml")) this.snapshots.set(f.slice(0, -4).toLowerCase(), join(dir, f));
    }
  }

  async buildAll(filter?: (d: TemplateDef) => boolean): Promise<void> {
    const t0 = Date.now();
    const defs = this.defs.filter((d) => !filter || filter(d));
    for (const d of defs) await this.rebuild(d);
    this.opts.log?.(`templates: built ${defs.length} definitions (${this.files.size} files) in ${Date.now() - t0} ms`);
  }

  /** Rebuild one definition (coalesces concurrent calls). */
  rebuild(d: TemplateDef): Promise<void> {
    const running = this.building.get(d);
    if (running) return running;
    const p = (async () => {
      const xml = (await d.build(this.h)).toString();
      const plain = Buffer.from(xml, "utf8");
      let z: Buffer | undefined;
      for (const f of d.files) {
        const body = f.compress ? (z ??= zlibXml(xml)) : plain;
        this.files.set(f.name.toLowerCase(), {
          name: f.name,
          body,
          compressed: f.compress,
          etag: `"${createHash("sha1").update(body).digest("base64url")}"`,
          builtAt: new Date(),
          source: "db",
        });
      }
    })().finally(() => this.building.delete(d));
    this.building.set(d, p);
    return p;
  }

  /** Invalidation hook: call after writes to any table ("game.Shop_Goods" or "Shop_Goods"). */
  async invalidate(tables: string[]): Promise<string[]> {
    const want = new Set(tables.map((t) => t.toLowerCase()));
    const hit = this.defs.filter((d) => d.deps.some((dep) => want.has(dep.toLowerCase()) || want.has(dep.split(".")[1]!.toLowerCase())));
    for (const d of hit) await this.rebuild(d);
    return hit.flatMap((d) => d.files.map((f) => f.name));
  }

  /** Lookup by lowercase name (no extension). Falls back to the shipped DDTank41 snapshot bytes (static-only files). */
  get(name: string): CachedFile | undefined {
    const key = name.toLowerCase();
    const f = this.files.get(key);
    if (f) return f;
    const snap = this.snapshots.get(key);
    if (!snap) return undefined;
    const body = readFileSync(snap);
    const c: CachedFile = {
      name,
      body,
      compressed: body[0] === 0x78,
      etag: `"${createHash("sha1").update(body).digest("base64url")}"`,
      builtAt: new Date(),
      source: "snapshot",
    };
    this.files.set(key, c);
    return c;
  }

  byEndpoint(path: string): TemplateDef | undefined {
    const p = path.toLowerCase();
    return this.defs.find((d) => d.endpoint?.toLowerCase() === p);
  }

  list(): CachedFile[] {
    return [...this.files.values()];
  }
}
