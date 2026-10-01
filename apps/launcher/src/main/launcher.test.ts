import { describe, expect, it } from "vitest";
import { buildSwfUrl, projectorArgs, projectorQualityIndex, ruffleArgs } from "./runtime/args.js";
import { chooseRuntime } from "./runtime/game.js";
import { defaultConfig, envConfig, finalizeConfig, mergeConfig } from "./config.js";
import { sanitizeSettings } from "./settings.js";
import { toSession } from "./api.js";
import { redact } from "./logger.js";
import { DEFAULT_SETTINGS, type RuntimeStatus } from "../shared/types.js";

const fv = { user: "joao", key: "abc123", config: "http://localhost:8080/flash/config.xml" };

describe("runtime args", () => {
  it("puts flashvars in the SWF query string for the projector", () => {
    const [url] = projectorArgs("http://localhost:8080/flash/Loading.swf", fv);
    const u = new URL(url!);
    expect(u.pathname).toBe("/flash/Loading.swf");
    expect(u.searchParams.get("user")).toBe("joao");
    expect(u.searchParams.get("config")).toBe(fv.config);
  });
  it("keeps existing query params", () => {
    expect(buildSwfUrl("http://h/L.swf?v=2", { a: "1" })).toBe("http://h/L.swf?v=2&a=1");
  });
  it("builds ruffle args with -P flashvars and URL last", () => {
    const a = ruffleArgs("http://h/L.swf", fv, { ...DEFAULT_SETTINGS, fullscreen: true, ruffleGraphics: "dx12" });
    expect(a.slice(0, 2)).toEqual(["-P", "user=joao"]);
    expect(a).toContain("--fullscreen");
    expect(a[a.indexOf("--graphics") + 1]).toBe("dx12");
    expect(a[a.indexOf("--quality") + 1]).toBe("medium");
    expect(a.at(-1)).toBe("http://h/L.swf");
  });
  it("maps quality to projector menu index", () => {
    expect([projectorQualityIndex("low"), projectorQualityIndex("medium"), projectorQualityIndex("best")]).toEqual([0, 1, 2]);
  });
});

describe("chooseRuntime", () => {
  const st = (p: Partial<RuntimeStatus>, r: Partial<RuntimeStatus>): RuntimeStatus[] => [
    { kind: "projector", installed: false, downloadable: false, ...p },
    { kind: "ruffle", installed: false, downloadable: false, ...r },
  ];
  it("honours explicit preference", () => expect(chooseRuntime("ruffle", st({ installed: true }, {}))).toBe("ruffle"));
  it("auto prefers server default", () => expect(chooseRuntime("auto", st({ installed: true }, {}), "ruffle")).toBe("ruffle"));
  it("auto prefers projector when usable", () => expect(chooseRuntime("auto", st({ downloadable: true }, { installed: true }))).toBe("projector"));
  it("auto falls back to ruffle", () => expect(chooseRuntime("auto", st({}, { installed: true }))).toBe("ruffle"));
});

describe("config", () => {
  it("derives endpoints from apiUrl", () => {
    const c = finalizeConfig(mergeConfig(defaultConfig(), { apiUrl: "https://play.example.com/" }, "test"));
    expect(c.manifestUrl).toBe("https://play.example.com/api/public/launcher");
    expect(c.loginUrl).toBe("https://play.example.com/api/auth/login");
    expect(c.client.swfUrl).toBe("https://play.example.com/flash/Loading.swf");
  });
  it("reads env vars", () => {
    const e = envConfig({ DDT_API_URL: "http://x:1", DDT_PROJECTOR_PATH: "C:/fp.exe" });
    expect(e.apiUrl).toBe("http://x:1");
    expect(e.runtimePaths?.projector).toBe("C:/fp.exe");
  });
  it("ignores runtime sources without sha256", () => {
    const c = mergeConfig(defaultConfig(), { runtimes: { projector: { url: "http://x/fp.exe" } as never } }, "t");
    expect(c.runtimes.projector).toBeUndefined();
  });
});

describe("settings", () => {
  it("clamps and rejects junk", () => {
    const s = sanitizeSettings({ width: 10, quality: "ultra", runtime: "ruffle", lastUsername: "x", rememberUsername: false });
    expect(s.width).toBe(640);
    expect(s.quality).toBe(DEFAULT_SETTINGS.quality);
    expect(s.runtime).toBe("ruffle");
    expect(s.lastUsername).toBe("");
  });
});

describe("login response", () => {
  const req = { serverId: "s1", username: "joao", password: "x" };
  const client = { swfUrl: "http://h/L.swf", configUrl: "http://h/config.xml", width: 1000, height: 600 };
  it("accepts {play:{flashvars}}", () => {
    const s = toSession({ play: { flashvars: { user: "joao", key: "k" } } }, req, client);
    expect(s?.flashvars).toEqual({ user: "joao", key: "k", config: "http://h/config.xml" });
  });
  it("accepts {ticket}", () => expect(toSession({ ticket: { user: "u", key: "k" } }, req, client)?.flashvars.user).toBe("u"));
  it("rejects without key", () => expect(toSession({ flashvars: { user: "u" } }, req, client)).toBeUndefined());
});

describe("redact", () => {
  it("hides keys", () => {
    expect(redact("http://h/L.swf?user=a&key=SECRET")).toBe("http://h/L.swf?user=a&key=***");
    expect(redact('{"password":"hunter2"}')).toBe('{"password":"***"}');
    expect(redact("-P key=SECRET")).not.toContain("SECRET");
  });
});
