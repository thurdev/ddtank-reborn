/**
 * REQUEST_PATH (`/request/`): Tank.Request .ashx handlers and the generated template .xml files.
 * Paths are case-insensitive (the client lowercases URLs), query parsing tolerates the client's `?rnd=Xrnd=X` bug,
 * and GET/POST form values are merged like `context.Request["x"]`.
 */
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { AppCtx } from "../context.js";
import { result, zlibXml } from "../lib/flash-xml.js";
import { ENDPOINTS } from "../request/registry.js";
import type { Output, ReqCtx } from "../request/types.js";
import { authOf } from "./auth.js";

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

export async function requestRoutes(f: FastifyInstance, ctx: AppCtx) {
  const handler = async (req: FastifyRequest, reply: FastifyReply, override?: string) => {
    const url = new URL(req.url, "http://x");
    let rel = (override ?? safeDecode(url.pathname)).replace(/^\/request\//i, "/");
    rel = rel.replace(/\/{2,}/g, "/");
    const lower = rel.toLowerCase();

    // generated / snapshot template files
    if (lower.endsWith(".xml")) {
      const base = lower.slice(lower.lastIndexOf("/") + 1, -4);
      const file = ctx.cache.get(base);
      if (file) {
        reply.header("ETag", file.etag).header("Cache-Control", "no-cache");
        if (req.headers["if-none-match"] === file.etag) return reply.code(304).send();
        return reply.type(file.compressed ? "application/octet-stream" : "text/xml; charset=utf-8").send(file.body);
      }
      if (/celeb/.test(base)) {
        // Cross-area / not-built rankings (spec §3.2): an empty, valid list.
        return reply.type("application/octet-stream").send(zlibXml(result(true, "Success!", [], [["date", new Date().toISOString().slice(0, 10)]]).toString()));
      }
      ctx.log.warn(`request: missing template ${rel}`);
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
      return send(reply, { kind: "xml", xml: result(false, "Not supported") });
    }
    const params = paramsOf(req);
    const rc: ReqCtx = {
      app: ctx,
      req,
      ip: req.ip,
      p: (n) => params.get(n.toLowerCase()),
      int: (n, def = 0) => {
        const v = Number.parseInt(params.get(n.toLowerCase()) ?? "", 10);
        return Number.isFinite(v) ? v : def;
      },
    };
    try {
      return send(reply, await ep.handle(rc));
    } catch (e) {
      ctx.log.error(e as object, `request ${rel}`);
      return send(reply, { kind: "xml", xml: result(false, "Fail!") });
    }
  };
  f.route({ method: ["GET", "POST", "HEAD"], url: "/request/*", handler: (req, reply) => handler(req, reply) });
  f.route({ method: ["GET", "POST"], url: "/CreateLogin.aspx", handler: (req, reply) => handler(req, reply, "/CreateLogin.aspx") });
}

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}
