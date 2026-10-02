/**
 * Static trees for the client: /flash/ (FLASHSITE: compiled client, generated config.xml), /resource/ (SITE: resource
 * pack with the uploads overlay + typed placeholders for misses), /ruffle/, /uploads/, crossdomain.xml.
 */
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { AppCtx } from "../context.js";
import { CiTree, mimeOf, placeholder } from "../lib/resources.js";

export const CROSSDOMAIN = `<?xml version="1.0"?>
<!DOCTYPE cross-domain-policy SYSTEM "http://www.adobe.com/xml/dtds/cross-domain-policy.dtd">
<cross-domain-policy>
  <site-control permitted-cross-domain-policies="all"/>
  <allow-access-from domain="*" to-ports="*" secure="false"/>
  <allow-http-request-headers-from domain="*" headers="*" secure="false"/>
</cross-domain-policy>
`;

/** config.xml with every URL pointed at this deployment (template: FLASH_DIR/config.xml, research/client/01-client-map.md §3). */
export function buildConfigXml(ctx: AppCtx, template: string): string {
  const b = ctx.cfg.PUBLIC_URL;
  const set: Record<string, string> = {
    FLASHSITE: `${b}/flash/`,
    BACKUP_FLASHSITE: `${b}/flash/`,
    USE_MD5: "true",
    SITE: `${b}/resource/`,
    FIRSTPAGE: `${ctx.cfg.SITE_URL}/`,
    REGISTER: `${ctx.cfg.SITE_URL}/register`,
    REQUEST_PATH: `${b}/request/`,
    LOGIN_PATH: `${ctx.cfg.SITE_URL}/login`,
    FILL_PATH: `${ctx.cfg.SITE_URL}/account`,
    WEEKLYSITE: `${b}/flash/`,
    COUNT_PATH: "",
    STATISTIC: "false",
    OFFICIAL_SITE: `${ctx.cfg.SITE_URL}/`,
    USER_GUILD_ENABLE: String(ctx.cfg.USER_GUIDE_ENABLE),
  };
  let x = template;
  for (const [k, v] of Object.entries(set)) x = x.replace(new RegExp(`(<${k}\\s+value=")[^"]*(")`, "i"), `$1${v}$2`);
  x = x.replace(/<POLICY_FILES>[\s\S]*?<\/POLICY_FILES>/i, `<POLICY_FILES>\n<file value="${b}/crossdomain.xml"/>\n</POLICY_FILES>`);
  x = x.replace(/(<(?:STATISTICS|EXTERNAL_INTERFACE_360)\b[^>]*enable=")[^"]*(")/gi, "$1false$2");
  return x;
}

function sendFile(req: FastifyRequest, reply: FastifyReply, file: string) {
  const st = statSync(file);
  const etag = `"${st.size.toString(16)}-${st.mtimeMs.toString(16)}"`;
  reply.header("ETag", etag).header("Cache-Control", "public, max-age=300").header("Access-Control-Allow-Origin", "*");
  if (req.headers["if-none-match"] === etag) return reply.code(304).send();
  reply.type(mimeOf(file)).header("Content-Length", st.size);
  if (req.method === "HEAD") return reply.send();
  return reply.send(createReadStream(file));
}

const relOf = (req: FastifyRequest, prefix: RegExp) => {
  let p = new URL(req.url, "http://x").pathname;
  try {
    p = decodeURIComponent(p);
  } catch {
    /* keep raw */
  }
  return p.replace(prefix, "");
};

export async function staticRoutes(f: FastifyInstance, ctx: AppCtx) {
  const flash = new CiTree(ctx.cfg.FLASH_DIR);
  const ruffle = new CiTree(ctx.cfg.RUFFLE_DIR);
  ctx.log.info(`static: flash ${flash.size} files (${ctx.cfg.FLASH_DIR}), resource ${ctx.resources.trees.map((t) => t.size).join("+")} files`);

  const cfgTemplate = () => {
    const f = flash.resolve("config.xml");
    return f && existsSync(f) ? readFileSync(f, "utf8") : "<root><config><REQUEST_PATH value=\"\"/></config></root>";
  };

  f.get("/crossdomain.xml", (_req, reply) => reply.type("text/xml").send(CROSSDOMAIN));

  f.route({
    method: ["GET", "HEAD"],
    url: "/flash/*",
    handler: (req, reply) => {
      const rel = relOf(req, /^\/flash\//i);
      const low = rel.toLowerCase();
      if (low === "config.xml") return reply.type("text/xml; charset=utf-8").header("Cache-Control", "no-cache").send(buildConfigXml(ctx, cfgTemplate()));
      if (low === "crossdomain.xml") return reply.type("text/xml").send(CROSSDOMAIN);
      const file = flash.resolve(rel);
      if (!file) return reply.code(404).send("not found");
      return sendFile(req, reply, file);
    },
  });

  f.route({
    method: ["GET", "HEAD"],
    url: "/resource/*",
    handler: (req, reply) => {
      const rel = relOf(req, /^\/resource\//i);
      if (rel.toLowerCase() === "crossdomain.xml") return reply.type("text/xml").send(CROSSDOMAIN);
      const file = ctx.resources.resolve(rel);
      if (file) return sendFile(req, reply, file);
      ctx.resources.miss(rel);
      const ph = placeholder(rel);
      if (!ph) return reply.code(404).send("not found");
      return reply.type(ph.type).header("X-Placeholder", "1").header("Access-Control-Allow-Origin", "*").send(ph.body);
    },
  });

  f.route({
    method: ["GET", "HEAD"],
    url: "/ruffle/*",
    handler: (req, reply) => {
      const file = ruffle.resolve(relOf(req, /^\/ruffle\//i));
      return file ? sendFile(req, reply, file) : reply.code(404).send("not found");
    },
  });

  if (ctx.storage.kind === "local") {
    f.route({
      method: ["GET", "HEAD"],
      url: "/uploads/*",
      handler: (req, reply) => {
        const file = ctx.resources.trees[0]?.resolve(relOf(req, /^\/uploads\//i));
        return file ? sendFile(req, reply, file) : reply.code(404).send("not found");
      },
    });
  }
}
