// Minimal static server for the DDTank client harness (no framework).
//
// Routes (first match wins, file lookup is case-insensitive like IIS):
//   /                 -> public/index.html
//   /<anything>       -> fixtures/<anything>        (overrides: harness config.xml, stub .ashx replies)
//   /flash/*          -> public/game/flash/*         (copy of vendor/DDTank41/Source Flash/FlashSV1)
//   /request/*        -> vendor/DDTank41/Tank.Request/* (pre-built zlib XML only; read-only)
//   /resource/*       -> $RESOURCE_DIR/*            (image/, sound/ pack; not in the repo)
//   /*                -> public/*                    (ruffle/, fonts/, crossdomain.xml)
// Every request is appended to logs/requests.jsonl as one JSON line.
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { appendFileSync, mkdirSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.HARNESS_PORT ?? 9380);
const PUBLIC = join(here, "public");
const FIXTURES = join(here, "fixtures");
const FLASH_DIR = process.env.FLASH_DIR ?? join(PUBLIC, "game/flash");
const REQUEST_DIR = process.env.REQUEST_DIR ?? resolve(here, "../../vendor/DDTank41/Tank.Request");
const RESOURCE_DIR = process.env.RESOURCE_DIR ?? "";
const VARIANT = process.env.FIXTURE_VARIANT ?? "";
const LOG_DIR = join(here, "logs");
const LOG_FILE = join(LOG_DIR, process.env.HARNESS_LOG ?? "requests.jsonl");
mkdirSync(LOG_DIR, { recursive: true });

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".map": "application/json",
  ".wasm": "application/wasm",
  ".swf": "application/x-shockwave-flash",
  ".xml": "text/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".gif": "image/gif",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".woff2": "font/woff2",
  ".ashx": "text/plain; charset=utf-8",
  ".flv": "video/x-flv",
  ".mp3": "audio/mpeg",
};

const dirCache = new Map<string, Map<string, string>>();
function listDir(dir: string): Map<string, string> | null {
  let m = dirCache.get(dir);
  if (m) return m;
  try {
    m = new Map(readdirSync(dir).map((n) => [n.toLowerCase(), n]));
  } catch {
    return null;
  }
  dirCache.set(dir, m);
  return m;
}

/** Resolve rel (posix, decoded) under base, matching each segment case-insensitively. */
function resolveCI(base: string, rel: string): string | null {
  if (!base) return null;
  let cur = base;
  for (const seg of rel.split("/").filter(Boolean)) {
    if (seg === ".." || seg === ".") return null;
    const entries = listDir(cur);
    const real = entries?.get(seg.toLowerCase());
    if (!real) return null;
    cur = join(cur, real);
  }
  try {
    return statSync(cur).isFile() ? cur : null;
  } catch {
    return null;
  }
}

function lookup(pathname: string): { file: string; source: string } | null {
  const tries: Array<[string, string, string]> = [];
  if (VARIANT) {
    // FIXTURE_VARIANT=register -> prefer fixtures/request/LoginSelectList.register.ashx
    const ext = extname(pathname);
    tries.push([FIXTURES, `${pathname.slice(0, pathname.length - ext.length)}.${VARIANT}${ext}`, `fixture:${VARIANT}`]);
  }
  tries.push([FIXTURES, pathname, "fixture"]);
  const lower = pathname.toLowerCase();
  if (lower.startsWith("/flash/")) tries.push([FLASH_DIR, pathname.slice(7), "flash"]);
  else if (lower.startsWith("/request/")) {
    const rel = pathname.slice(9);
    if (rel.toLowerCase().endsWith(".xml")) tries.push([REQUEST_DIR, rel, "vendor-request"]);
  } else if (lower.startsWith("/resource/")) tries.push([RESOURCE_DIR, pathname.slice(10), "resource"]);
  tries.push([PUBLIC, pathname, "public"]);
  for (const [base, rel, source] of tries) {
    const file = resolveCI(base, rel);
    if (file) return { file, source };
  }
  return null;
}

function log(entry: Record<string, unknown>): void {
  appendFileSync(LOG_FILE, JSON.stringify(entry) + "\n");
}

function handle(req: IncomingMessage, res: ServerResponse): void {
  const t0 = Date.now();
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  let pathname: string;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    pathname = url.pathname;
  }
  if (pathname === "/") pathname = "/index.html";

  const chunks: Buffer[] = [];
  req.on("data", (c: Buffer) => chunks.push(c));
  req.on("end", () => {
    const body = Buffer.concat(chunks);
    const hit = lookup(pathname);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "no-store");
    let status = 404;
    let bytes = 0;
    if (req.method === "OPTIONS") {
      status = 204;
      res.setHeader("Access-Control-Allow-Headers", "*");
      res.writeHead(status).end();
    } else if (hit) {
      const data = readFileSync(hit.file);
      status = 200;
      bytes = data.length;
      res.writeHead(200, {
        "Content-Type": MIME[extname(hit.file).toLowerCase()] ?? "application/octet-stream",
        "Content-Length": data.length,
      });
      res.end(req.method === "HEAD" ? undefined : data);
    } else {
      res.writeHead(404, { "Content-Type": "text/plain" }).end("not found");
    }
    log({
      t: new Date(t0).toISOString(),
      method: req.method,
      path: pathname,
      query: url.search,
      body: body.length ? body.toString("latin1").slice(0, 2000) : undefined,
      status,
      bytes,
      source: hit?.source ?? null,
      ms: Date.now() - t0,
      ua: (req.headers["user-agent"] ?? "").slice(0, 40),
    });
    const tag = status === 200 ? hit?.source : "MISS";
    console.log(`${status} ${req.method} ${pathname}${url.search ? " ?…" : ""} [${tag}]`);
  });
}

createServer(handle).listen(PORT, () => {
  console.log(`client-harness on http://localhost:${PORT}/  (log: ${LOG_FILE})`);
  console.log(`  flash:    ${FLASH_DIR}`);
  console.log(`  request:  ${REQUEST_DIR} (+ fixtures/request)`);
  console.log(`  resource: ${RESOURCE_DIR || "(unset: set RESOURCE_DIR to an image/ sound/ pack)"}`);
});
