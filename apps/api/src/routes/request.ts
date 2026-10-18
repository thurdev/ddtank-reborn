/**
 * REQUEST_PATH (`/request/`): Tank.Request .ashx handlers and the generated template .xml files.
 * Paths are case-insensitive (the client lowercases URLs), query parsing tolerates the client's `?rnd=Xrnd=X` bug,
 * and GET/POST form values are merged like `context.Request["x"]`.
 */
import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { AppCtx } from "../context.js";
import { result, zlibXml } from "../lib/flash-xml.js";
import { ENDPOINTS } from "../request/registry.js";
import type { Output, ReqCtx } from "../request/types.js";
import { authOf } from "./auth.js";
import { CiTree } from "../lib/resources.js";

export function paramsOf(req: FastifyRequest): Map<string, string> {
  const m = new Map<string, string>();
  const add = (o: unknown) => {
    if (!o || typeof o !== "object") return;
    for (const [k, v] of Object.entries(o as Record<string, unknown>)) {
      const key = k.toLowerCase();
      if (m.has(key)) continue;
      const val = Array.isArray(v) ? v[0] : v;
      if (val !== undefined && val !== null) m.set(key, String(val));
    }
  };
  add(req.query);
  add(req.body);
  return m;
}

export function send(reply: FastifyReply, out: Output) {
  reply.header("Cache-Control", "no-store");
  if (out.kind === "redirect") return reply.redirect(out.url);
  if (out.kind === "text") return reply.type(out.contentType ?? "text/plain; charset=utf-8").send(out.text);
  const s = typeof out.xml === "string" ? out.xml : out.xml.toString();
  if (out.zlib) return reply.type("text/plain").send(zlibXml(s));
  return reply.type("text/plain; charset=utf-8").send(s);
}

/** XMLs que o 4.1 carrega como texto puro e o 6600 com COMPRESS_TEXT_LOADER (vendor/DDT-6600/Flash_Project/DDT660/src/ddt/
 *  loader/LoaderCreate.as:631 ServerConfig). Levantado comparando todos os solveRequestPath do 6600 com o que servimos. */
const COMPRESS_6600 = new Set(["serverconfig"]);
/** O contrário: geramos em zlib mas o 6600 carrega com TEXT_LOADER (texto puro) → sai descomprimido pro 6600.
 *  Levantado comparando todos os solveRequestPath(...TEXT_LOADER) do 6600 com o que servimos (SearchGoodsTemp →
 *  UpdateStarAnalyer "#1090 XML malformed", LoaderCreate.as:828). */
const PLAIN_6600 = new Set(["searchgoodstemp", "activeconvertiteminfo"]);
/** XMLs cujo conteúdo (não só formato) o 6600 interpreta diferente: o cliente 6600 recebe o snapshot do 6600.
 *  loaduserbox: UserBoxInfoAnalyzer.as separa caixas por Level<=20 e BossBoxManager.currentGrade exige o ID 1
 *  (nosso dado 4.1 começa no ID 2 com Level 60 → "#1010 accessing field: Level"). Lado servidor (prêmio das caixas)
 *  ainda usa a tabela 4.1 — alinhar no M2 (docs/plan/TASKS.md). */
const SNAPSHOT_FIRST_6600 = new Set(["loaduserbox"]);
/** .ashx que o 6600 carrega com COMPRESS_REQUEST_LOADER (LoaderCreate.as): se ainda não temos o endpoint, a resposta
 *  vazia tem que sair em zlib senão ByteArray.uncompress() estoura e trava o carregamento (#2058). */
const COMPRESS_ASHX_6600 = new Set(["/scenecollecrandomnpc.ashx", "/consortialist.ashx", "/consortiauserslist.ashx", "/dailyloglist.ashx", "/getfightreport.ashx", "/imlistload.ashx", "/loadusermail.ashx", "/mailsenderlist.ashx"]);

/** ServerConfig.xml pro 6600: nossas linhas + as do snapshot 6600 cujo Name não existe nas nossas. */
export function mergeServerConfig6600(ours: string, snapFile: string | null | undefined): string {
  if (!snapFile) return ours;
  const raw = readFileSync(snapFile);
  const snap = raw[0] === 0x78 ? inflateSync(raw).toString("utf8") : raw.toString("utf8");
  const have = new Set([...ours.matchAll(/\bName="([^"]*)"/g)].map((m) => m[1]!.toLowerCase()));
  const extra = [...snap.matchAll(/<Item\b[^>]*\/>/g)].map((m) => m[0]).filter((e) => {
    const n = /\bName="([^"]*)"/.exec(e)?.[1];
    return n && !have.has(n.toLowerCase());
  });
  return extra.length ? ours.replace(/<\/Result>\s*$/, `${extra.map((e) => `  ${e}`).join("\n")}\n</Result>`) : ours;
}

export async function requestRoutes(f: FastifyInstance, ctx: AppCtx) {
  // migração 6600 (M1): XMLs que o cliente 6600 pede e nós ainda não geramos saem do snapshot do vendor, byte a byte
  // (uns são zlib, outros texto puro — igual o IIS servia). Os que já geramos continuam vindo do banco.
  const snap6600 = new CiTree(ctx.cfg.REQUEST6600_SNAPSHOT_DIR);
  const handler = async (req: FastifyRequest, reply: FastifyReply, override?: string) => {
    const url = new URL(req.url, "http://x");
    // o cliente 6600 usa REQUEST_PATH /request6600/ (config.xml dele): mesmos handlers, só muda a compressão de
    // alguns XMLs (o loader dele difere do 4.1) e XML inexistente vira Result vazio em vez de 404
    const is6600 = /^\/request6600\//i.test(url.pathname);
    let rel = (override ?? safeDecode(url.pathname)).replace(/^\/request(?:6600)?\//i, "/");
    rel = rel.replace(/\/{2,}/g, "/");
    const lower = rel.toLowerCase();

    // generated / snapshot template files
    if (lower.endsWith(".xml")) {
      const base = lower.slice(lower.lastIndexOf("/") + 1, -4);
      if (is6600 && SNAPSHOT_FIRST_6600.has(base)) {
        const snapFirst = snap6600.resolve(rel.replace(/^\//, ""));
        if (snapFirst) {
          const body = readFileSync(snapFirst);
          return reply.type(body[0] === 0x78 ? "application/octet-stream" : "text/xml; charset=utf-8").header("X-Snapshot", "6600").send(body);
        }
      }
      const file = ctx.cache.get(base);
      if (file) {
        reply.header("ETag", file.etag).header("Cache-Control", "no-cache");
        if (req.headers["if-none-match"] === file.etag) return reply.code(304).send();
        if (is6600 && base === "serverconfig") {
          // 6600 lê ~70 chaves que o Server_Config da 4.1 não tem (BindMoneyMax, CryptBossOpenDay...,
          // ServerConfigManager.as getserverConfigInfo): completa com as do snapshot 6600, as nossas têm prioridade
          const ours = file.compressed ? inflateSync(file.body).toString("utf8") : file.body.toString("utf8");
          return reply.type("application/octet-stream").send(zlibXml(mergeServerConfig6600(ours, snap6600.resolve("serverconfig.xml"))));
        }
        if (is6600 && file.compressed && PLAIN_6600.has(base)) return reply.type("text/xml; charset=utf-8").send(inflateSync(file.body));
        if (is6600 && !file.compressed && COMPRESS_6600.has(base)) return reply.type("application/octet-stream").send(zlibXml(file.body.toString("utf8")));
        return reply.type(file.compressed ? "application/octet-stream" : "text/xml; charset=utf-8").send(file.body);
      }
      if (/celeb/.test(base)) {
        // Cross-area / not-built rankings (spec §3.2): an empty, valid list.
        return reply.type("application/octet-stream").send(zlibXml(result(true, "Success!", [], [["date", new Date().toISOString().slice(0, 10)]]).toString()));
      }
      const snap = snap6600.resolve(rel.replace(/^\//, ""));
      if (snap) {
        const body = readFileSync(snap);
        return reply.type(body[0] === 0x78 ? "application/octet-stream" : "text/xml; charset=utf-8").header("X-Snapshot", "6600").send(body);
      }
      ctx.log.warn(`request: missing template ${rel}`);
      if (is6600) return reply.type("application/octet-stream").header("X-Empty", "6600").send(zlibXml(result(true, "Success!", []).toString()));
      return reply.code(404).type("text/plain").send("not found");
    }

    // template builder URLs (admin only; the original checked AdminIP): rebuild and answer like csFunction.CreateCompressXml
    const def = ctx.cache.byEndpoint(lower);
    const isAll = lower === "/createallxml.ashx" || lower === "/celeblist/createallceleb.ashx";
    if (def || isAll) {
      const c = authOf(ctx, req);
      if (c?.role !== "admin") return reply.type("text/plain").send("IP is not valid!");
      if (def) {
        await ctx.cache.rebuild(def);
        return reply.type("text/plain").send(def.files.map((x) => `Build:${x.name}.xml,Success!`).join(""));
      }
      await ctx.cache.buildAll(lower.includes("celeb") ? (d) => !!d.periodic : undefined);
      return reply.type("text/plain").send("Build:All,Success!");
    }

    const ep = ENDPOINTS.get(lower) ?? ENDPOINTS.get(lower.replace(/^\/celeblist/, ""));
    if (!ep) {
      ctx.log.warn(`request: unknown endpoint ${rel}`);
      if (is6600 && COMPRESS_ASHX_6600.has(lower)) return reply.type("application/octet-stream").header("X-Empty", "6600").send(zlibXml(result(true, "Success!", []).toString()));
      return send(reply, { kind: "xml", xml: result(false, "Not supported") });
    }
    const params = paramsOf(req);
    const rc: ReqCtx = {
      app: ctx,
      req,
      ip: req.ip,
      client: is6600 ? "6600" : "41",
      p: (n) => params.get(n.toLowerCase()),
      int: (n, def = 0) => {
        const v = Number.parseInt(params.get(n.toLowerCase()) ?? "", 10);
        return Number.isFinite(v) ? v : def;
      },
    };
    try {
      const out = await ep.handle(rc);
      // 6600 loads these via COMPRESS_REQUEST_LOADER (LoaderCreate.as) regardless of whether we have a real
      // handler for them: an implemented endpoint (`ep` exists) skips the "unknown endpoint" zlib-wrap below
      // (line ~133) and answered plain text, so ByteArray.uncompress() on the client threw #2058 right after
      // `REQ /request6600/imlistload.ashx`. Wrap here too, whenever the handler didn't already zlib it.
      if (is6600 && out.kind === "xml" && !out.zlib && COMPRESS_ASHX_6600.has(lower)) return send(reply, { ...out, zlib: true });
      return send(reply, out);
    } catch (e) {
      ctx.log.error(e as object, `request ${rel}`);
      return send(reply, { kind: "xml", xml: result(false, "Fail!") });
    }
  };
  f.route({ method: ["GET", "POST", "HEAD"], url: "/request/*", handler: (req, reply) => handler(req, reply) });
  f.route({ method: ["GET", "POST", "HEAD"], url: "/request6600/*", handler: (req, reply) => handler(req, reply) });
  f.route({ method: ["GET", "POST"], url: "/CreateLogin.aspx", handler: (req, reply) => handler(req, reply, "/CreateLogin.aspx") });
}

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}
