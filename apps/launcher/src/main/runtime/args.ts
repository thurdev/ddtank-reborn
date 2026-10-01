import type { Settings } from "../../shared/types.js";

/**
 * Pure argument builders for the two game runtimes (unit-tested).
 *
 * Flash Player projector (flashplayer_32_sa.exe) accepts exactly one positional argument: the movie path/URL.
 * It has no flashvars switch, so flashvars go in the query string (Flash exposes query params through
 * `loaderInfo.parameters`, which is what the original Default.aspx / VN launchers relied on:
 * `Loading.swf?user=..&key=..&config=..`). Quality / size / fullscreen are applied afterwards through the
 * window menu (see window-win.ts).
 *
 * Ruffle desktop takes flashvars with repeated `-P key=value` and has real switches for quality, window size,
 * fullscreen and the wgpu backend. Flags verified against ruffle desktop `--help` (2025-2026 nightlies);
 * anything else goes through `runtimeExtraArgs.ruffle` in launcher.config.json.
 */

export function buildSwfUrl(swfUrl: string, flashvars: Record<string, string>): string {
  const u = new URL(swfUrl);
  for (const [k, v] of Object.entries(flashvars)) u.searchParams.set(k, v);
  return u.toString();
}

export function projectorArgs(swfUrl: string, flashvars: Record<string, string>, extra: string[] = []): string[] {
  return [...extra, buildSwfUrl(swfUrl, flashvars)];
}

export function ruffleArgs(
  swfUrl: string,
  flashvars: Record<string, string>,
  s: Pick<Settings, "quality" | "width" | "height" | "fullscreen" | "ruffleGraphics" | "highPerformanceGpu">,
  extra: string[] = [],
): string[] {
  const args: string[] = [];
  for (const [k, v] of Object.entries(flashvars)) args.push("-P", `${k}=${v}`);
  args.push("--quality", s.quality);
  args.push("--width", String(s.width), "--height", String(s.height));
  if (s.fullscreen) args.push("--fullscreen");
  if (s.ruffleGraphics !== "default") args.push("--graphics", s.ruffleGraphics);
  args.push("--power", s.highPerformanceGpu ? "high" : "low");
  // DDTank connects to the game server with flash.net.Socket; don't prompt the player.
  args.push("--tcp-connections", "allow");
  args.push(...extra);
  args.push(swfUrl);
  return args;
}

/** Projector menu quality index (View > Quality submenu order: Low, Medium, High). "best" maps to High. */
export function projectorQualityIndex(q: Settings["quality"]): 0 | 1 | 2 {
  return q === "low" ? 0 : q === "medium" ? 1 : 2;
}
