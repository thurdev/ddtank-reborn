/** Asset storage for admin uploads: local disk (dev) or S3-compatible (R2/S3/MinIO) via SigV4 with fetch (no SDK). */
import { createHash, createHmac } from "node:crypto";
import { mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import type { Config } from "../config.js";
import { mimeOf } from "./resources.js";

export interface Asset {
  key: string;
  name: string;
  url: string;
  size: number;
  contentType: string;
  updatedAt: string;
}

export interface Storage {
  kind: "local" | "s3";
  put(key: string, body: Buffer, contentType?: string): Promise<Asset>;
  list(prefix: string): Promise<Asset[]>;
  remove(key: string): Promise<void>;
  /** Local dir (overlay for /resource/), when kind=local. */
  dir?: string;
}

export const safeKey = (k: string) =>
  k
    .replace(/\\/g, "/")
    .split("/")
    .filter((s) => s && s !== "." && s !== "..")
    .map((s) => s.replace(/[^\w.\- ]/g, "_"))
    .join("/");

export function createStorage(cfg: Config): Storage {
  return cfg.STORAGE === "s3" ? s3Storage(cfg) : localStorage(cfg);
}

function localStorage(cfg: Config): Storage {
  const dir = cfg.UPLOAD_DIR;
  mkdirSync(dir, { recursive: true });
  const url = (k: string) => `${cfg.PUBLIC_URL}/uploads/${k.split("/").map(encodeURIComponent).join("/")}`;
  const asset = (k: string): Asset => {
    const st = statSync(join(dir, k));
    return { key: k, name: k.split("/").pop()!, url: url(k), size: st.size, contentType: mimeOf(k), updatedAt: st.mtime.toISOString() };
  };
  return {
    kind: "local",
    dir,
    async put(key, body) {
      const k = safeKey(key);
      mkdirSync(dirname(join(dir, k)), { recursive: true });
      writeFileSync(join(dir, k), body);
      return asset(k);
    },
    async list(prefix) {
      const base = join(dir, safeKey(prefix));
      const out: Asset[] = [];
      const walk = (d: string) => {
        let names: string[] = [];
        try {
          names = readdirSync(d);
        } catch {
          return;
        }
        for (const n of names) {
          const abs = join(d, n);
          if (statSync(abs).isDirectory()) walk(abs);
          else out.push(asset(relative(dir, abs).split(sep).join("/")));
        }
      };
      walk(base);
      return out;
    },
    async remove(key) {
      rmSync(join(dir, safeKey(key)), { force: true });
    },
  };
}

function s3Storage(cfg: Config): Storage {
  const endpoint = cfg.S3_ENDPOINT.replace(/\/+$/, "");
  const bucket = cfg.S3_BUCKET;
  const pub = (k: string) => (cfg.S3_PUBLIC_URL ? `${cfg.S3_PUBLIC_URL.replace(/\/+$/, "")}/${k}` : `${endpoint}/${bucket}/${k}`);
  const sha = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");
  const hmac = (k: Buffer | string, s: string) => createHmac("sha256", k).update(s).digest();
  async function req(method: string, key: string, query: Record<string, string> = {}, body: Buffer = Buffer.alloc(0), type?: string) {
    const u = new URL(`${endpoint}/${bucket}/${key.split("/").map(encodeURIComponent).join("/")}`);
    for (const [k, v] of Object.entries(query).sort()) u.searchParams.set(k, v);
    const now = new Date().toISOString().replace(/[-:]|\.\d{3}/g, "");
    const day = now.slice(0, 8);
    const payload = sha(body);
    const headers: Record<string, string> = { host: u.host, "x-amz-content-sha256": payload, "x-amz-date": now };
    if (type) headers["content-type"] = type;
    const names = Object.keys(headers).sort();
    const canonQuery = [...u.searchParams].map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).sort().join("&");
    const canon = [method, u.pathname, canonQuery, names.map((n) => `${n}:${headers[n]}\n`).join(""), names.join(";"), payload].join("\n");
    const scope = `${day}/${cfg.S3_REGION}/s3/aws4_request`;
    const toSign = ["AWS4-HMAC-SHA256", now, scope, sha(canon)].join("\n");
    const kSig = hmac(hmac(hmac(hmac(`AWS4${cfg.S3_SECRET_ACCESS_KEY}`, day), cfg.S3_REGION), "s3"), "aws4_request");
    headers.authorization = `AWS4-HMAC-SHA256 Credential=${cfg.S3_ACCESS_KEY_ID}/${scope}, SignedHeaders=${names.join(";")}, Signature=${createHmac("sha256", kSig).update(toSign).digest("hex")}`;
    const res = await fetch(u, { method, headers, body: method === "PUT" ? new Uint8Array(body) : undefined });
    if (!res.ok && res.status !== 404) throw new Error(`S3 ${method} ${key}: ${res.status} ${await res.text()}`);
    return res;
  }
  return {
    kind: "s3",
    async put(key, body, type) {
      const k = safeKey(key);
      await req("PUT", k, {}, body, type ?? mimeOf(k));
      return { key: k, name: k.split("/").pop()!, url: pub(k), size: body.length, contentType: type ?? mimeOf(k), updatedAt: new Date().toISOString() };
    },
    async list(prefix) {
      const res = await req("GET", "", { "list-type": "2", prefix: safeKey(prefix) + "/" });
      const xml = await res.text();
      return [...xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)].map((m) => {
        const g = (t: string) => new RegExp(`<${t}>([^<]*)</${t}>`).exec(m[1]!)?.[1] ?? "";
        const k = g("Key");
        return { key: k, name: k.split("/").pop()!, url: pub(k), size: Number(g("Size")), contentType: mimeOf(k), updatedAt: g("LastModified") };
      });
    },
    async remove(key) {
      await req("DELETE", safeKey(key));
    },
  };
}
