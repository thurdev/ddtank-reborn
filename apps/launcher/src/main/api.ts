import { z } from "zod";
import type {
  ClientInfo,
  LauncherConfig,
  LauncherManifest,
  LoginRequest,
  LoginResult,
  ManifestResult,
  PlaySession,
  ServerEntry,
} from "../shared/types.js";
import type { ScopedLogger } from "./logger.js";

const TIMEOUT_MS = 10_000;

const runtimeSource = z.object({
  url: z.string().url(),
  sha256: z.string().regex(/^[a-fA-F0-9]{64}$/),
  version: z.string().optional(),
  exe: z.string().optional(),
});

const clientInfo = z
  .object({
    swfUrl: z.string().url(),
    configUrl: z.string().url(),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  })
  .partial();

const manifestSchema = z.object({
  launcher: z
    .object({
      latestVersion: z.string(),
      minVersion: z.string(),
      downloadUrl: z.string().url(),
      updateUrl: z.string().url(),
      notes: z.string(),
    })
    .partial()
    .optional(),
  servers: z
    .array(
      z.object({
        id: z.coerce.string(),
        name: z.string(),
        status: z.enum(["online", "offline", "maintenance"]).catch("online"),
        description: z.string().optional(),
        players: z.number().optional(),
        recommended: z.boolean().optional(),
        apiUrl: z.string().url().optional(),
        client: clientInfo.optional(),
      }),
    )
    .default([]),
  news: z
    .array(
      z.object({
        id: z.coerce.string(),
        title: z.string(),
        body: z.string().optional(),
        url: z.string().url().optional(),
        date: z.string().optional(),
        tag: z.string().optional(),
      }),
    )
    .default([]),
  client: clientInfo.optional(),
  runtimes: z.object({ projector: runtimeSource, ruffle: runtimeSource }).partial().optional(),
  defaultRuntime: z.enum(["projector", "ruffle"]).optional(),
});

const stringRecord = z.record(z.string(), z.union([z.string(), z.number(), z.boolean()]).transform(String));

/** Accepts a few shapes so apps/api can evolve: {play:{flashvars}}, {flashvars}, {ticket:{user,key}}, {user,key}. */
const loginSchema = z.object({
  play: z.object({ flashvars: stringRecord, swfUrl: z.string().url().optional(), expiresAt: z.string().optional() }).partial().optional(),
  flashvars: stringRecord.optional(),
  ticket: z.object({ user: z.string(), key: z.string() }).optional(),
  user: z.union([z.string(), z.object({ username: z.string().optional(), name: z.string().optional() }).passthrough()]).optional(),
  key: z.string().optional(),
  swfUrl: z.string().url().optional(),
  expiresAt: z.string().optional(),
});

async function fetchJson(url: string, init: RequestInit = {}): Promise<{ status: number; data: unknown }> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      ...init,
      signal: ctrl.signal,
      headers: { Accept: "application/json", "X-Client": "ddtank-launcher", ...(init.headers ?? {}) },
    });
    const text = await res.text();
    let data: unknown = text;
    try {
      data = text ? JSON.parse(text) : undefined;
    } catch {
      /* keep text */
    }
    return { status: res.status, data };
  } finally {
    clearTimeout(t);
  }
}

export function fallbackManifest(cfg: LauncherConfig): LauncherManifest {
  return {
    servers: [{ id: "local", name: "Servidor local (dev)", status: "online", description: cfg.apiUrl }],
    news: [],
    client: cfg.client,
  };
}

export class ApiClient {
  private manifest: ManifestResult | undefined;

  constructor(
    private cfg: LauncherConfig,
    private log: ScopedLogger,
  ) {}

  async getManifest(force = false): Promise<ManifestResult> {
    if (this.manifest && !force && !this.manifest.offline) return this.manifest;
    try {
      const { status, data } = await fetchJson(this.cfg.manifestUrl);
      if (status !== 200) throw new Error(`HTTP ${status}`);
      const parsed = manifestSchema.safeParse(data);
      if (!parsed.success) throw new Error(`manifest inválido: ${parsed.error.issues[0]?.message ?? "?"}`);
      this.manifest = { manifest: parsed.data as LauncherManifest, offline: false, fetchedAt: new Date().toISOString() };
      this.log.info(`manifest ok: ${parsed.data.servers.length} servers, ${parsed.data.news.length} news`);
    } catch (e) {
      const msg = e instanceof Error ? (e.name === "AbortError" ? "timeout" : e.message) : String(e);
      this.log.warn(`manifest failed (${this.cfg.manifestUrl}): ${msg}`);
      this.manifest = { manifest: fallbackManifest(this.cfg), offline: true, error: msg, fetchedAt: new Date().toISOString() };
    }
    return this.manifest;
  }

  server(id: string): ServerEntry | undefined {
    return this.manifest?.manifest.servers.find((s) => s.id === id);
  }

  /** Effective client info for a server: config < manifest.client < server.client. */
  clientFor(serverId: string): ClientInfo {
    const m = this.manifest?.manifest;
    const s = this.server(serverId);
    return { ...this.cfg.client, ...stripUndef(m?.client), ...stripUndef(s?.client) } as ClientInfo;
  }

  async login(req: LoginRequest): Promise<LoginResult> {
    const server = this.server(req.serverId);
    if (server && server.status !== "online") return { ok: false, error: "Servidor indisponível no momento." };
    const loginUrl = server?.apiUrl ? `${server.apiUrl.replace(/\/+$/, "")}/api/auth/login` : this.cfg.loginUrl;
    warnIfInsecure(loginUrl, this.log);
    try {
      const { status, data } = await fetchJson(loginUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: req.username, password: req.password, serverId: req.serverId, client: "launcher" }),
      });
      if (status < 200 || status >= 300) {
        const msg = errorMessage(data) ?? (status === 401 ? "Usuário ou senha incorretos." : `Erro HTTP ${status}`);
        this.log.warn(`login ${req.username}@${req.serverId}: ${status} ${msg}`);
        return { ok: false, error: msg };
      }
      const session = toSession(data, req, this.clientFor(req.serverId));
      if (!session) return { ok: false, error: "Resposta de login inesperada do servidor." };
      this.log.info(`login ok ${req.username}@${req.serverId} (flashvars: ${Object.keys(session.flashvars).join(",")})`);
      return { ok: true, session };
    } catch (e) {
      const msg = e instanceof Error && e.name === "AbortError" ? "Tempo esgotado ao contatar o servidor." : `Falha de rede: ${(e as Error).message}`;
      this.log.error(`login ${req.username}: ${msg}`);
      return { ok: false, error: msg };
    }
  }
}

export function toSession(data: unknown, req: LoginRequest, client: ClientInfo): PlaySession | undefined {
  const p = loginSchema.safeParse(data);
  if (!p.success) return undefined;
  const d = p.data;
  let flashvars: Record<string, string> | undefined = d.play?.flashvars ?? d.flashvars;
  if (!flashvars && d.ticket) flashvars = { user: d.ticket.user, key: d.ticket.key };
  if (!flashvars && typeof d.user === "string" && d.key) flashvars = { user: d.user, key: d.key };
  if (!flashvars || !flashvars.user || !flashvars.key) return undefined;
  if (!flashvars.config && client.configUrl) flashvars = { ...flashvars, config: client.configUrl };
  const userObj = typeof d.user === "object" ? d.user : undefined;
  return {
    username: (userObj?.username as string | undefined) ?? (userObj?.name as string | undefined) ?? req.username,
    serverId: req.serverId,
    flashvars,
    swfUrl: d.play?.swfUrl ?? d.swfUrl,
    expiresAt: d.play?.expiresAt ?? d.expiresAt,
  };
}

function errorMessage(data: unknown): string | undefined {
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    if (typeof o.message === "string") return o.message;
    if (typeof o.error === "string") return o.error;
  }
  return undefined;
}

function stripUndef<T extends object>(o: T | undefined): Partial<T> {
  if (!o) return {};
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;
}

function warnIfInsecure(url: string, log: ScopedLogger) {
  try {
    const u = new URL(url);
    const local = ["localhost", "127.0.0.1", "::1"].includes(u.hostname);
    if (u.protocol !== "https:" && !local) log.warn(`login over plain HTTP to ${u.host}: configure HTTPS in production`);
  } catch {
    /* invalid URL is reported by fetch */
  }
}
