/**
 * Músicas de fundo: o Flash tocava `resource/sound/<id>.flv` (só áudio) via
 * NetStream. Navegador não toca FLV — converte pra MP3 em
 * `apps/client/public/assets/resource/sound/<id>.mp3` (o shim de NetStream
 * troca .flv → .mp3 e o boot aponta /resource/sound pros assets).
 *
 *   cd tools/swf-export && npx tsx src/sounds.ts [--force]
 *
 * Precisa de `ffmpeg` no PATH (ou FFMPEG=<caminho>).
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "../../..");
const SRC = join(REPO, "vendor/_assets/merged/sound");
const OUT = join(REPO, "apps/client/public/assets/resource/sound");
const FFMPEG = process.env.FFMPEG ?? "ffmpeg";
const force = process.argv.includes("--force");

mkdirSync(OUT, { recursive: true });
let ok = 0, skip = 0, fail = 0;
for (const f of readdirSync(SRC)) {
  if (!/\.flv$/i.test(f)) continue;
  const out = join(OUT, f.toLowerCase().replace(/\.flv$/, ".mp3"));
  if (!force && existsSync(out)) { skip++; continue; }
  try {
    execFileSync(FFMPEG, ["-y", "-loglevel", "error", "-i", join(SRC, f), "-vn", "-c:a", "libmp3lame", "-q:a", "4", out], { stdio: ["ignore", "ignore", "pipe"] });
    ok++;
  } catch (e) {
    fail++;
    console.error(`falhou ${f}: ${String((e as Error).message).split("\n")[0]}`);
  }
}
console.log(`músicas: ${ok} convertidas, ${skip} já existiam, ${fail} falhas → ${OUT}`);
