// Local job queue for the Higgsfield web automation (Seedream 4.5, unlimited toggle, driven via Playwright).
//   node tools/remaster/hf-queue.mjs            -> serves http://127.0.0.1:7788
//   GET  /next                -> next job {id, upload, prompt} (upload = absolute path of the upscaled input)
//   POST /done?id=..&hf=..    -> downloads https://d8j0ntlcm91z4.cloudfront.net/<user>/<hf>.png, post-processes to
//                               the exact original size (center-crop to aspect, lanczos, original alpha re-applied)
//                               and writes remaster/<category>/outputs/<name>.png
//   POST /fail?id=..&why=..   -> marks job failed (retried up to 2 more times)
//   GET  /status
// State persists in remaster/_auto/state.json, so it can be stopped and resumed.
import { createServer } from "node:http";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(".");
const AUTO = join(ROOT, "remaster/_auto");
const CDN = "https://d8j0ntlcm91z4.cloudfront.net/user_3GTAcG8wB8hMi4zVVUC51azi0GB";
mkdirSync(join(AUTO, "up"), { recursive: true });
mkdirSync(join(AUTO, "raw"), { recursive: true });

const inv = JSON.parse(readFileSync("research/i18n/image-inventory.json", "utf8")).rows;
const byPath = new Map(inv.map((r) => [r.path, r]));
const manifest = readFileSync("remaster/manifest.csv", "utf8").trim().split("\n").slice(1).map((l) => {
  const [category, file, swf, srcFile, w, h] = l.split(",");
  return { category, file, swf, srcFile, w: +w, h: +h };
});

const ffprobe = (f) => execFileSync("ffprobe", ["-v", "error", "-select_streams", "v", "-show_entries", "stream=width,height,pix_fmt", "-of", "csv=p=0", f]).toString().trim().split(",");

function hasAlpha(f) {
  return /a|pal/.test(ffprobe(f)[2] ?? "");
}

function editPrompt(vn, pt) {
  return [
    `Edit this image: replace the text "${vn}" with "${pt}" (Brazilian Portuguese, spelled exactly like that)`,
    "in the exact same font, bold letter style, same text colors and vertical gradient, same outline and shadow, same size and position (shrink the text slightly only if needed to fit the same space).",
    "Keep the shape, colors, border, highlights, background and every other pixel identical to the original.",
    "Do not add any background, border, frame, ornaments or new elements. Output the same image only.",
  ].join(" ");
}

const stateFile = join(AUTO, "state.json");
const state = existsSync(stateFile) ? JSON.parse(readFileSync(stateFile, "utf8")) : { jobs: {} };
const save = () => writeFileSync(stateFile, JSON.stringify(state, null, 1));

// Jobs: UI categories, known PT-BR translation, OCR text present, not already produced.
const ORDER = ["02-lobby-hall", "03-janelas", "04-botoes-titulos", "05-icones", "06-combate-outros"];
const jobs = [];
for (const m of manifest) {
  if (!ORDER.includes(m.category)) continue;
  const r = byPath.get(`${m.swf}::${m.srcFile}`);
  const pt = r?.ptBrSuggestion && String(r.ptBrSuggestion).trim();
  const vn = r?.ocrText && r.ocrText.replace(/\s+/g, " ").trim();
  if (!pt || !vn || (r.ocrConfidence ?? 0) < 55) continue;
  const id = m.file.replace(/\.(png|jpe?g)$/i, "");
  const out = join(ROOT, "remaster", m.category, "outputs", id + ".png");
  jobs.push({ id, ...m, vn: vn.slice(0, 80), pt, out, prio: ORDER.indexOf(m.category) });
}
jobs.sort((a, b) => a.prio - b.prio || b.w * b.h - a.w * a.h);

function prepare(j) {
  const src = join(ROOT, "remaster", j.category, "inputs", j.file);
  const up = join(AUTO, "up", j.id + ".png");
  if (!existsSync(up)) {
    const [w, h] = ffprobe(src).map(Number);
    const k = Math.max(1, Math.min(8, Math.ceil(640 / Math.min(w, h)), Math.floor(2048 / Math.max(w, h))));
    execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-i", src, "-vf", `scale=iw*${k}:ih*${k}:flags=lanczos`, up]);
  }
  return { id: j.id, upload: up.replace(/\\/g, "/"), prompt: editPrompt(j.vn, j.pt) };
}

async function finish(j, hf) {
  const raw = join(AUTO, "raw", j.id + ".png");
  const res = await fetch(`${CDN}/${hf}.png`);
  if (!res.ok) throw new Error(`download ${res.status}`);
  writeFileSync(raw, Buffer.from(await res.arrayBuffer()));
  const src = join(ROOT, "remaster", j.category, "inputs", j.file);
  const [w, h] = ffprobe(src).map(Number);
  const crop = `crop='min(iw,ih*${w}/${h})':'min(ih,iw*${h}/${w})',scale=${w}:${h}:flags=lanczos`;
  if (hasAlpha(src)) {
    execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-i", raw, "-i", src, "-filter_complex",
      `[0]${crop},format=rgb24[c];[1]format=rgba,alphaextract[a];[c][a]alphamerge`, j.out]);
  } else {
    execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-i", raw, "-vf", crop, j.out]);
  }
}

createServer(async (req, res) => {
  const u = new URL(req.url, "http://x");
  const send = (code, obj) => { res.writeHead(code, { "content-type": "application/json" }); res.end(JSON.stringify(obj)); };
  try {
    if (u.pathname === "/next") {
      const j = jobs.find((j) => !existsSync(j.out) && (state.jobs[j.id]?.fails ?? 0) < 3 && !state.jobs[j.id]?.busy);
      if (!j) return send(200, { done: true });
      state.jobs[j.id] = { ...(state.jobs[j.id] ?? {}), busy: true, at: Date.now() };
      save();
      return send(200, prepare(j));
    }
    if (u.pathname === "/done") {
      const j = jobs.find((x) => x.id === u.searchParams.get("id"));
      await finish(j, u.searchParams.get("hf"));
      state.jobs[j.id] = { hf: u.searchParams.get("hf"), ok: true };
      save();
      return send(200, { ok: true, out: j.out });
    }
    if (u.pathname === "/fail") {
      const id = u.searchParams.get("id");
      const s = state.jobs[id] ?? {};
      state.jobs[id] = { fails: (s.fails ?? 0) + 1, why: u.searchParams.get("why") };
      save();
      return send(200, { ok: true });
    }
    if (u.pathname === "/status") {
      const ok = jobs.filter((j) => existsSync(j.out)).length;
      return send(200, { total: jobs.length, ok, failed: Object.values(state.jobs).filter((s) => (s.fails ?? 0) >= 3).length });
    }
    send(404, {});
  } catch (e) {
    send(500, { error: String(e.message ?? e) });
  }
}).listen(7788, "127.0.0.1", () => console.log(`hf-queue on :7788 — ${jobs.length} jobs`));
