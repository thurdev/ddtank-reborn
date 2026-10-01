/**
 * Port of Bussiness/LanguageMgr.cs: "key:value" lines (first ':' splits, tabs removed, '#' comments,
 * last duplicate wins); GetTranslation returns the id itself when missing and applies string.Format {n}.
 */
import { existsSync, readFileSync } from "node:fs";

export class LanguageMgr {
  private readonly map = new Map<string, string>();

  static fromFile(path: string): LanguageMgr {
    const l = new LanguageMgr();
    if (existsSync(path)) l.load(readFileSync(path, "utf8"));
    return l;
  }

  load(text: string): void {
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
    for (const raw of text.split(/\r?\n/)) {
      if (raw.startsWith("#")) continue;
      const i = raw.indexOf(":");
      if (i === -1) continue;
      this.map.set(raw.slice(0, i), raw.slice(i + 1).replace(/\t/g, ""));
    }
  }

  set(key: string, value: string): void {
    this.map.set(key, value);
  }

  get size(): number {
    return this.map.size;
  }

  t(id: string, ...args: unknown[]): string {
    const s = this.map.get(id);
    if (s === undefined) return id;
    return s.replace(/\{(\d+)(?::[^}]*)?\}/g, (m, n: string) => (Number(n) < args.length ? String(args[Number(n)]) : m));
  }
}
