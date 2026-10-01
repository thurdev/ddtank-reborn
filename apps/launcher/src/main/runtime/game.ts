import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";
import type { ClientInfo, GameState, LauncherConfig, PlaySession, RuntimeKind, RuntimeStatus, Settings } from "../../shared/types.js";
import type { ScopedLogger } from "../logger.js";
import { redact } from "../logger.js";
import { projectorArgs, projectorQualityIndex, ruffleArgs } from "./args.js";
import type { RuntimeManager } from "./manager.js";
import { tuneProjectorWindow } from "./window-win.js";

export function chooseRuntime(pref: Settings["runtime"], statuses: RuntimeStatus[], serverDefault?: RuntimeKind): RuntimeKind {
  if (pref !== "auto") return pref;
  if (serverDefault) return serverDefault;
  const usable = (k: RuntimeKind) => statuses.some((s) => s.kind === k && (s.installed || s.downloadable));
  // Projector first: Ruffle still stalls in pickgliss UIModuleLoader (Loader.loadBytes) on the 4.1 client.
  if (usable("projector")) return "projector";
  if (usable("ruffle")) return "ruffle";
  return "projector";
}

export class GameController {
  private child: ChildProcess | undefined;
  private current: GameState = { state: "idle" };
  private listeners = new Set<(s: GameState) => void>();

  constructor(
    private cfg: LauncherConfig,
    private runtimes: RuntimeManager,
    private log: ScopedLogger,
  ) {}

  onState(cb: (s: GameState) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  state(): GameState {
    return this.current;
  }

  private set(s: GameState) {
    this.current = s;
    for (const l of this.listeners) l(s);
  }

  isRunning() {
    return !!this.child && this.child.exitCode === null;
  }

  async play(opts: {
    session: PlaySession;
    client: ClientInfo;
    settings: Settings;
    serverName: string;
    serverDefaultRuntime?: RuntimeKind;
  }): Promise<GameState> {
    if (this.isRunning()) return this.current;
    const { session, client, settings } = opts;
    const kind = chooseRuntime(settings.runtime, this.runtimes.all(), opts.serverDefaultRuntime);
    try {
      this.set({ state: "preparing", message: "Verificando runtime do jogo..." });
      const exe = await this.runtimes.ensure(kind, (message, progress) => this.set({ state: "preparing", message, progress }));
      const swfUrl = session.swfUrl ?? client.swfUrl;
      const extra = this.cfg.runtimeExtraArgs[kind] ?? [];
      const args =
        kind === "projector" ? projectorArgs(swfUrl, session.flashvars, extra) : ruffleArgs(swfUrl, session.flashvars, settings, extra);
      this.log.info(`starting ${kind}: ${exe} ${redact(args.join(" "))}`);
      this.set({ state: "preparing", message: "Abrindo o jogo..." });

      const child = spawn(exe, args, {
        cwd: path.dirname(exe),
        windowsHide: false,
        stdio: ["ignore", "pipe", "pipe"],
        env: kind === "ruffle" ? { ...process.env, RUST_LOG: process.env.RUST_LOG ?? "warn" } : process.env,
      });
      this.child = child;
      child.stdout?.on("data", (d) => this.pipe(kind, String(d)));
      child.stderr?.on("data", (d) => this.pipe(kind, String(d)));

      await new Promise<void>((resolve, reject) => {
        child.once("spawn", () => resolve());
        child.once("error", reject);
      });
      const pid = child.pid ?? 0;
      this.set({ state: "running", pid, runtime: kind, startedAt: new Date().toISOString() });

      child.once("exit", (code) => {
        this.log.info(`${kind} exited with code ${code}`);
        this.child = undefined;
        this.set({ state: "exited", code, runtime: kind });
      });

      if (kind === "projector") {
        tuneProjectorWindow(
          {
            pid,
            title: `DDTank — ${opts.serverName} — ${session.username}`,
            width: settings.width,
            height: settings.height,
            qualityIndex: projectorQualityIndex(settings.quality),
            hideMenu: settings.hideProjectorMenu,
            fullscreen: settings.fullscreen,
          },
          this.log,
        );
      }
      return this.current;
    } catch (e) {
      const message = (e as Error).message;
      this.log.error(`play failed (${kind}): ${message}`);
      this.child = undefined;
      this.set({ state: "error", message });
      return this.current;
    }
  }

  stop() {
    if (this.child && this.child.exitCode === null) {
      this.log.info("stopping game");
      this.child.kill();
    }
  }

  private pipe(kind: RuntimeKind, chunk: string) {
    for (const line of chunk.split(/\r?\n/)) if (line.trim()) this.log.debug(`[${kind}] ${line.slice(0, 1000)}`);
  }
}
