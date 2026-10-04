// Minimal Recraft API client. Key from RECRAFT_API_KEY or the gitignored .env.recraft at the repo root.
// Usage:
//   node tools/i18n/ai/rc.mjs gen  --prompt-file p.txt --out out.png [--model recraftv4_1_pro] [--size 16:9] [--style ref1.png --style ref2.jpg]
//   node tools/i18n/ai/rc.mjs i2i  --image in.png --prompt-file p.txt --out out.png [--strength 0.3] [--model recraftv4_1_pro]
//   node tools/i18n/ai/rc.mjs me
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { basename } from "node:path";

const API = "https://external.api.recraft.ai/v1";
function key() {
  if (process.env.RECRAFT_API_KEY) return process.env.RECRAFT_API_KEY;
  if (existsSync(".env.recraft")) {
    const m = readFileSync(".env.recraft", "utf8").match(/RECRAFT_API_KEY=(\S+)/);
    if (m) return m[1];
  }
  throw new Error("RECRAFT_API_KEY not set");
}

function args(argv) {
  const o = { style: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const k = a.slice(2);
    const v = argv[i + 1];
    i++;
    if (k === "style") o.style.push(v);
    else o[k] = v;
  }
  return o;
}

function file(path) {
  const ext = path.toLowerCase().endsWith(".png") ? "image/png" : path.toLowerCase().endsWith(".webp") ? "image/webp" : "image/jpeg";
  return new Blob([readFileSync(path)], { type: ext });
}

async function call(endpoint, form) {
  const res = await fetch(`${API}/${endpoint}`, { method: "POST", headers: { Authorization: `Bearer ${key()}` }, body: form });
  const text = await res.text();
  if (!res.ok) throw new Error(`${endpoint} ${res.status}: ${text.slice(0, 600)}`);
  return JSON.parse(text);
}

async function save(json, out) {
  const item = json.data?.[0] ?? json.image;
  const url = item?.url;
  if (item?.b64_json) writeFileSync(out, Buffer.from(item.b64_json, "base64"));
  else if (url) writeFileSync(out, Buffer.from(await (await fetch(url)).arrayBuffer()));
  else throw new Error("no image in response: " + JSON.stringify(json).slice(0, 300));
  console.log(`saved ${out}`);
}

const [cmd, ...rest] = process.argv.slice(2);
const a = args(rest);
const prompt = a["prompt-file"] ? readFileSync(a["prompt-file"], "utf8").replace(/\s+/g, " ").trim() : a.prompt;

if (cmd === "me") {
  const r = await fetch(`${API}/users/me`, { headers: { Authorization: `Bearer ${key()}` } });
  console.log(await r.text());
} else if (cmd === "gen") {
  const f = new FormData();
  f.set("prompt", prompt);
  f.set("model", a.model ?? "recraftv4_1_pro");
  if (a.size) f.set("size", a.size);
  f.set("n", "1");
  if (a.format) f.set("image_format", a.format);
  for (const s of a.style) f.append("style_references", file(s), basename(s));
  await save(await call("images/generations", f), a.out);
} else if (cmd === "i2i") {
  const f = new FormData();
  f.set("image", file(a.image), basename(a.image));
  f.set("prompt", prompt);
  f.set("strength", a.strength ?? "0.3");
  f.set("model", a.model ?? "recraftv4_1_pro");
  f.set("n", "1");
  if (a.format) f.set("image_format", a.format);
  await save(await call("images/imageToImage", f), a.out);
} else {
  console.log("commands: me | gen | i2i");
}
