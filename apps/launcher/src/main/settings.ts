import fs from "node:fs";
import path from "node:path";
import { DEFAULT_SETTINGS, type Settings } from "../shared/types.js";

const QUALITIES = new Set(["low", "medium", "high", "best"]);
const RUNTIMES = new Set(["auto", "projector", "ruffle"]);
const GRAPHICS = new Set(["default", "dx12", "vulkan", "gl"]);
const ON_PLAY = new Set(["minimize", "keep", "hide"]);

/** Coerce untrusted input (renderer or disk) into valid Settings. */
export function sanitizeSettings(input: unknown, base: Settings = DEFAULT_SETTINGS): Settings {
  const s = { ...base };
  if (!input || typeof input !== "object") return s;
  const i = input as Record<string, unknown>;
  if (typeof i.runtime === "string" && RUNTIMES.has(i.runtime)) s.runtime = i.runtime as Settings["runtime"];
  if (typeof i.quality === "string" && QUALITIES.has(i.quality)) s.quality = i.quality as Settings["quality"];
  if (typeof i.width === "number" && Number.isFinite(i.width)) s.width = clamp(Math.round(i.width), 640, 7680);
  if (typeof i.height === "number" && Number.isFinite(i.height)) s.height = clamp(Math.round(i.height), 384, 4320);
  if (typeof i.fullscreen === "boolean") s.fullscreen = i.fullscreen;
  if (typeof i.hideProjectorMenu === "boolean") s.hideProjectorMenu = i.hideProjectorMenu;
  if (typeof i.ruffleGraphics === "string" && GRAPHICS.has(i.ruffleGraphics)) s.ruffleGraphics = i.ruffleGraphics as Settings["ruffleGraphics"];
  if (typeof i.highPerformanceGpu === "boolean") s.highPerformanceGpu = i.highPerformanceGpu;
  if (typeof i.launcherOnPlay === "string" && ON_PLAY.has(i.launcherOnPlay)) s.launcherOnPlay = i.launcherOnPlay as Settings["launcherOnPlay"];
  if (typeof i.rememberUsername === "boolean") s.rememberUsername = i.rememberUsername;
  if (typeof i.lastUsername === "string") s.lastUsername = i.lastUsername.slice(0, 64);
  if (typeof i.lastServerId === "string") s.lastServerId = i.lastServerId.slice(0, 64);
  if (!s.rememberUsername) s.lastUsername = "";
  return s;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export class SettingsStore {
  private file: string;
  private value: Settings;

  constructor(dir: string) {
    this.file = path.join(dir, "settings.json");
    let disk: unknown;
    try {
      disk = JSON.parse(fs.readFileSync(this.file, "utf8"));
    } catch {
      disk = undefined;
    }
    this.value = sanitizeSettings(disk);
  }

  get(): Settings {
    return { ...this.value };
  }

  save(patch: unknown): Settings {
    this.value = sanitizeSettings(patch, this.value);
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = this.file + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(this.value, null, 2), "utf8");
    fs.renameSync(tmp, this.file);
    return this.get();
  }
}
