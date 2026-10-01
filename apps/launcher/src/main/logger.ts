import fs from "node:fs";
import path from "node:path";
import type { LogLine } from "../shared/types.js";

const MAX_BYTES = 2 * 1024 * 1024;
const RING = 2000;

/** Tiny file + memory logger. Rotates launcher.log -> launcher.prev.log at 2 MiB. */
export class Logger {
  private ring: LogLine[] = [];
  private listeners = new Set<(l: LogLine) => void>();
  readonly file: string;

  constructor(dir: string) {
    fs.mkdirSync(dir, { recursive: true });
    this.file = path.join(dir, "launcher.log");
    try {
      if (fs.existsSync(this.file) && fs.statSync(this.file).size > MAX_BYTES) {
        fs.renameSync(this.file, path.join(dir, "launcher.prev.log"));
      }
    } catch {
      /* ignore rotation errors */
    }
  }

  onLine(cb: (l: LogLine) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  tail(limit = 500): LogLine[] {
    return this.ring.slice(-limit);
  }

  scope(scope: string) {
    return {
      debug: (msg: string) => this.write("debug", scope, msg),
      info: (msg: string) => this.write("info", scope, msg),
      warn: (msg: string) => this.write("warn", scope, msg),
      error: (msg: string) => this.write("error", scope, msg),
    };
  }

  write(level: LogLine["level"], scope: string, msg: string) {
    const line: LogLine = { ts: new Date().toISOString(), level, scope, msg: redact(msg) };
    this.ring.push(line);
    if (this.ring.length > RING) this.ring.splice(0, this.ring.length - RING);
    try {
      fs.appendFileSync(this.file, `[${line.ts}] ${level.toUpperCase().padEnd(5)} ${scope}: ${line.msg}\n`, "utf8");
    } catch {
      /* disk full / locked: keep in memory only */
    }
    for (const l of this.listeners) l(line);
    if (process.env.NODE_ENV === "development") console.log(`[${scope}] ${line.msg}`);
  }
}

/** Never write login keys / passwords to disk. */
export function redact(msg: string): string {
  return msg
    .replace(/([?&](?:key|password|pass|pwd|token|ticket)=)[^&\s"]+/gi, "$1***")
    .replace(/("(?:key|password|pass|pwd|token|ticket)"\s*:\s*")[^"]*"/gi, '$1***"')
    .replace(/(-P(?:key|password|token|ticket)=)\S+/gi, "$1***");
}

export type ScopedLogger = ReturnType<Logger["scope"]>;
