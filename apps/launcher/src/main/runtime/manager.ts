import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { LauncherConfig, RuntimeKind, RuntimeSource, RuntimeStatus } from "../../shared/types.js";
import type { ScopedLogger } from "../logger.js";

/**
 * Locates or installs the game runtimes.
 *
 * Lookup order per runtime:
 *   1. configured path (runtimePaths / DDT_*_PATH)          -> origin "configured"
 *   2. <resources>/runtime/<kind>/<exe>  (put there at build time by scripts/fetch-runtime.mjs) -> "bundled"
 *   3. <userData>/runtime/<kind>/<exe>   (downloaded on first Play from the operator mirror)   -> "downloaded"
 *
 * Downloads always require a sha256; a mismatch deletes the file. No Adobe binary is ever committed to git.
 */

export const RUNTIME_EXE: Record<RuntimeKind, string> = {
  projector: "flashplayer_sa.exe",
  ruffle: "ruffle.exe",
};

export interface Progress {
  (message: string, fraction?: number): void;
}

export class RuntimeManager {
  constructor(
    private cfg: LauncherConfig,
    private dirs: { resources: string; userData: string },
    private log: ScopedLogger,
    private remoteSources: () => Partial<Record<RuntimeKind, RuntimeSource>> = () => ({}),
  ) {}

  /** Remote manifest sources win over local config so operators can rotate mirrors without a new build. */
  source(kind: RuntimeKind): RuntimeSource | undefined {
    return this.remoteSources()[kind] ?? this.cfg.runtimes[kind];
  }

  private candidates(kind: RuntimeKind): { path: string; origin: RuntimeStatus["origin"] }[] {
    const exe = RUNTIME_EXE[kind];
    const list: { path: string; origin: RuntimeStatus["origin"] }[] = [];
    const configured = this.cfg.runtimePaths[kind];
    if (configured) list.push({ path: configured, origin: "configured" });
    list.push({ path: path.join(this.dirs.resources, "runtime", kind, exe), origin: "bundled" });
    list.push({ path: path.join(this.dirs.userData, "runtime", kind, exe), origin: "downloaded" });
    return list;
  }

  status(kind: RuntimeKind): RuntimeStatus {
    const found = this.candidates(kind).find((c) => fs.existsSync(c.path));
    return {
      kind,
      installed: !!found,
      path: found?.path,
      origin: found?.origin,
      downloadable: !!this.source(kind),
    };
  }

  all(): RuntimeStatus[] {
    return (["projector", "ruffle"] as const).map((k) => this.status(k));
  }

  async ensure(kind: RuntimeKind, progress: Progress): Promise<string> {
    const st = this.status(kind);
    const src = this.source(kind);
    if (st.installed && st.path) {
      // Operator rotated the runtime (new sha256 in manifest/config): replace our downloaded copy.
      if (st.origin === "downloaded" && src && recordedSha(path.dirname(st.path)) !== src.sha256.toLowerCase()) {
        this.log.info(`${kind}: sha256 changed in manifest, re-downloading`);
        return this.install(kind, src, progress);
      }
      return st.path;
    }
    if (!src) {
      throw new Error(
        kind === "projector"
          ? "Flash Player projector não encontrado e nenhuma URL de download foi configurada pelo administrador."
          : "Ruffle não encontrado e nenhuma URL de download foi configurada.",
      );
    }
    return this.install(kind, src, progress);
  }

  async install(kind: RuntimeKind, src: RuntimeSource, progress: Progress): Promise<string> {
    if (!/^[a-f0-9]{64}$/i.test(src.sha256)) throw new Error(`sha256 ausente/inválido para ${kind}`);
    const dir = path.join(this.dirs.userData, "runtime", kind);
    fs.mkdirSync(dir, { recursive: true });
    const isZip = /\.zip(?:$|\?)/i.test(src.url);
    const tmp = path.join(dir, `download.${isZip ? "zip" : "exe"}.part`);
    this.log.info(`downloading ${kind} from ${src.url}`);
    progress(`Baixando ${kind === "projector" ? "Flash Player" : "Ruffle"}...`, 0);
    const actual = await download(src.url, tmp, (f) => progress(`Baixando... ${Math.round(f * 100)}%`, f));
    if (actual !== src.sha256.toLowerCase()) {
      fs.rmSync(tmp, { force: true });
      throw new Error(`Checksum inválido para ${kind}: esperado ${src.sha256}, recebido ${actual}`);
    }
    const target = path.join(dir, RUNTIME_EXE[kind]);
    if (isZip) {
      progress("Extraindo...", 1);
      const out = path.join(dir, "x");
      fs.rmSync(out, { recursive: true, force: true });
      fs.mkdirSync(out, { recursive: true });
      await extractZip(tmp, out);
      const inner = src.exe ? path.join(out, src.exe) : findExe(out, kind);
      if (!inner || !fs.existsSync(inner)) throw new Error(`Executável não encontrado no zip de ${kind}`);
      // Keep sibling files (Ruffle ships only ruffle.exe, but be safe): move whole folder content.
      for (const f of fs.readdirSync(path.dirname(inner))) {
        fs.renameSync(path.join(path.dirname(inner), f), path.join(dir, f === path.basename(inner) ? RUNTIME_EXE[kind] : f));
      }
      fs.rmSync(out, { recursive: true, force: true });
      fs.rmSync(tmp, { force: true });
    } else {
      fs.renameSync(tmp, target);
    }
    fs.writeFileSync(path.join(dir, "runtime.json"), JSON.stringify({ ...src, installedAt: new Date().toISOString() }, null, 2));
    this.log.info(`${kind} installed at ${target} (sha256 ok)`);
    return target;
  }
}

function recordedSha(dir: string): string | undefined {
  try {
    const j = JSON.parse(fs.readFileSync(path.join(dir, "runtime.json"), "utf8")) as { sha256?: string };
    return j.sha256?.toLowerCase();
  } catch {
    return undefined;
  }
}

export async function sha256File(file: string): Promise<string> {
  const h = createHash("sha256");
  await pipeline(fs.createReadStream(file), h);
  return h.digest("hex");
}

/** Streams url -> file, returns sha256 hex. */
export async function download(url: string, file: string, onProgress?: (fraction: number) => void): Promise<string> {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok || !res.body) throw new Error(`Download falhou: HTTP ${res.status}`);
  const total = Number(res.headers.get("content-length") ?? 0);
  const hash = createHash("sha256");
  let done = 0;
  let lastTick = 0;
  const body = Readable.fromWeb(res.body as import("node:stream/web").ReadableStream<Uint8Array>);
  body.on("data", (chunk: Buffer) => {
    hash.update(chunk);
    done += chunk.length;
    const now = Date.now();
    if (total && onProgress && now - lastTick > 150) {
      lastTick = now;
      onProgress(done / total);
    }
  });
  await pipeline(body, fs.createWriteStream(file));
  return hash.digest("hex");
}

/** Windows 10+ ships bsdtar as tar.exe, which extracts .zip natively — no extra dependency. */
function extractZip(zip: string, out: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const p = spawn("tar", ["-xf", zip, "-C", out], { windowsHide: true });
    let err = "";
    p.stderr.on("data", (d) => (err += String(d)));
    p.on("error", reject);
    p.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`tar exit ${code}: ${err.trim()}`))));
  });
}

function findExe(dir: string, kind: RuntimeKind): string | undefined {
  const want = kind === "ruffle" ? /^ruffle(\.exe)?$/i : /^flashplayer.*\.exe$/i;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isFile() && want.test(e.name)) return p;
    if (e.isDirectory()) {
      const r = findExe(p, kind);
      if (r) return r;
    }
  }
  return undefined;
}
