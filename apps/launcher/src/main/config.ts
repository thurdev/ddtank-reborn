import fs from "node:fs";
import path from "node:path";
import type { LauncherConfig, RuntimeKind, RuntimeSource } from "../shared/types.js";

/**
 * Config resolution (later wins):
 *   1. built-in defaults (localhost dev)
 *   2. <resources>/launcher.config.json   (operator, shipped inside the installer)
 *   3. <exe dir>/launcher.config.json     (portable override next to the .exe)
 *   4. <userData>/launcher.config.json    (per-machine override)
 *   5. env vars DDT_*                     (dev / CI)
 * File keys are the same as LauncherConfig (partial). Unknown keys are ignored.
 */

export const DEFAULT_API_URL = "http://localhost:8080";

export function defaultConfig(): LauncherConfig {
  return {
    apiUrl: DEFAULT_API_URL,
    manifestUrl: "",
    loginUrl: "",
    updateUrl: "",
    client: { swfUrl: `${DEFAULT_API_URL}/flash/Loading.swf`, configUrl: `${DEFAULT_API_URL}/flash/config.xml`, width: 1000, height: 600 },
    runtimes: {},
    runtimePaths: {},
    runtimeExtraArgs: {},
    sources: ["defaults"],
  };
}

type PartialConfig = Partial<Omit<LauncherConfig, "client" | "sources">> & { client?: Partial<LauncherConfig["client"]> };

export function mergeConfig(base: LauncherConfig, patch: PartialConfig, source: string): LauncherConfig {
  const out: LauncherConfig = {
    ...base,
    client: { ...base.client },
    runtimes: { ...base.runtimes },
    runtimePaths: { ...base.runtimePaths },
    runtimeExtraArgs: { ...base.runtimeExtraArgs },
    sources: [...base.sources, source],
  };
  for (const k of ["apiUrl", "manifestUrl", "loginUrl", "updateUrl"] as const) {
    const v = patch[k];
    if (typeof v === "string") out[k] = v.trim().replace(/\/+$/, "");
  }
  if (patch.client && typeof patch.client === "object") {
    const c = patch.client;
    if (typeof c.swfUrl === "string") out.client.swfUrl = c.swfUrl;
    if (typeof c.configUrl === "string") out.client.configUrl = c.configUrl;
    if (typeof c.width === "number") out.client.width = c.width;
    if (typeof c.height === "number") out.client.height = c.height;
  }
  for (const kind of ["projector", "ruffle"] as const) {
    const src = patch.runtimes?.[kind];
    if (isRuntimeSource(src)) out.runtimes[kind] = { ...src, sha256: src.sha256.toLowerCase() };
    const p = patch.runtimePaths?.[kind];
    if (typeof p === "string" && p) out.runtimePaths[kind] = p;
    const a = patch.runtimeExtraArgs?.[kind];
    if (Array.isArray(a)) out.runtimeExtraArgs[kind] = a.filter((x): x is string => typeof x === "string");
  }
  return out;
}

export function isRuntimeSource(v: unknown): v is RuntimeSource {
  return !!v && typeof v === "object" && typeof (v as RuntimeSource).url === "string" && typeof (v as RuntimeSource).sha256 === "string";
}

function readJson(file: string): PartialConfig | undefined {
  try {
    if (!fs.existsSync(file)) return undefined;
    const raw = fs.readFileSync(file, "utf8").replace(/^﻿/, "");
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as PartialConfig) : undefined;
  } catch (e) {
    throw new Error(`Invalid config file ${file}: ${(e as Error).message}`);
  }
}

export function envConfig(env: NodeJS.ProcessEnv): PartialConfig {
  const p: PartialConfig = {};
  if (env.DDT_API_URL) p.apiUrl = env.DDT_API_URL;
  if (env.DDT_MANIFEST_URL) p.manifestUrl = env.DDT_MANIFEST_URL;
  if (env.DDT_LOGIN_URL) p.loginUrl = env.DDT_LOGIN_URL;
  if (env.DDT_UPDATE_URL) p.updateUrl = env.DDT_UPDATE_URL;
  if (env.DDT_SWF_URL || env.DDT_CONFIG_XML_URL) {
    p.client = {};
    if (env.DDT_SWF_URL) p.client.swfUrl = env.DDT_SWF_URL;
    if (env.DDT_CONFIG_XML_URL) p.client.configUrl = env.DDT_CONFIG_XML_URL;
  }
  const paths: Partial<Record<RuntimeKind, string>> = {};
  if (env.DDT_PROJECTOR_PATH) paths.projector = env.DDT_PROJECTOR_PATH;
  if (env.DDT_RUFFLE_PATH) paths.ruffle = env.DDT_RUFFLE_PATH;
  if (Object.keys(paths).length) p.runtimePaths = paths;
  return p;
}

/** If the API URL changed but derived URLs were not set, derive them. */
export function finalizeConfig(cfg: LauncherConfig): LauncherConfig {
  const api = cfg.apiUrl.replace(/\/+$/, "");
  const out = { ...cfg, apiUrl: api };
  if (!out.manifestUrl) out.manifestUrl = `${api}/api/public/launcher`;
  if (!out.loginUrl) out.loginUrl = `${api}/api/auth/login`;
  // If only apiUrl was overridden, keep the client on the same origin.
  if (out.client.swfUrl.startsWith(DEFAULT_API_URL) && api !== DEFAULT_API_URL) {
    out.client = {
      ...out.client,
      swfUrl: out.client.swfUrl.replace(DEFAULT_API_URL, api),
      configUrl: out.client.configUrl?.replace(DEFAULT_API_URL, api),
    };
  }
  return out;
}

export function loadConfig(opts: { resourcesDir: string; exeDir: string; userDataDir: string; env: NodeJS.ProcessEnv }): LauncherConfig {
  let cfg = defaultConfig();
  const files = [
    path.join(opts.resourcesDir, "launcher.config.json"),
    path.join(opts.exeDir, "launcher.config.json"),
    path.join(opts.userDataDir, "launcher.config.json"),
  ];
  for (const f of [...new Set(files)]) {
    try {
      const patch = readJson(f);
      if (patch) cfg = mergeConfig(cfg, patch, f);
    } catch (e) {
      // A broken override must not discard the other files: skip it and report in `sources`.
      cfg = { ...cfg, sources: [...cfg.sources, `IGNORADO ${(e as Error).message}`] };
    }
  }
  const env = envConfig(opts.env);
  if (Object.keys(env).length) cfg = mergeConfig(cfg, env, "env");
  return finalizeConfig(cfg);
}
