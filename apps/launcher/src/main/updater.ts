import { app } from "electron";
import electronUpdater from "electron-updater";
import type { LauncherManifest, UpdateState } from "../shared/types.js";
import type { ScopedLogger } from "./logger.js";

const { autoUpdater } = electronUpdater;

/** Compare dotted versions numerically ("0.10.0" > "0.9.3"). Pre-release tags are ignored. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split("-")[0]!.split(".").map((x) => Number.parseInt(x, 10) || 0);
  const pb = b.split("-")[0]!.split(".").map((x) => Number.parseInt(x, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return Math.sign(d);
  }
  return 0;
}

/**
 * Two layers:
 *  - electron-updater (generic provider) for the NSIS install: downloads + installs on quit.
 *  - manifest version check for everything else (portable .exe, dev): shows "download new version" link.
 */
export class Updater {
  private current: UpdateState = { state: "none", version: app.getVersion() };
  private listeners = new Set<(s: UpdateState) => void>();
  private wired = false;

  constructor(
    private feedUrl: string,
    private portable: boolean,
    private log: ScopedLogger,
  ) {}

  onState(cb: (s: UpdateState) => void) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private set(s: UpdateState) {
    this.current = s;
    for (const l of this.listeners) l(s);
  }

  private wire() {
    if (this.wired) return;
    this.wired = true;
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.logger = {
      info: (m: unknown) => this.log.info(String(m)),
      warn: (m: unknown) => this.log.warn(String(m)),
      error: (m: unknown) => this.log.error(String(m)),
      debug: (m: unknown) => this.log.debug(String(m)),
    };
    autoUpdater.setFeedURL({ provider: "generic", url: this.feedUrl });
    autoUpdater.on("checking-for-update", () => this.set({ state: "checking" }));
    autoUpdater.on("update-not-available", () => this.set({ state: "none", version: app.getVersion() }));
    autoUpdater.on("update-available", (i) => this.set({ state: "available", version: i.version }));
    autoUpdater.on("download-progress", (p) => this.set({ state: "downloading", percent: Math.round(p.percent) }));
    autoUpdater.on("update-downloaded", (i) => this.set({ state: "ready", version: i.version }));
    autoUpdater.on("error", (e) => this.set({ state: "error", message: e.message }));
  }

  /** `manifest` comes from GET /api/public/launcher; its updateUrl overrides the configured feed. */
  async check(manifest?: LauncherManifest): Promise<UpdateState> {
    const info = manifest?.launcher;
    const feed = info?.updateUrl || this.feedUrl;
    const latest = info?.latestVersion;
    const canAuto = app.isPackaged && !this.portable && !!feed && process.platform === "win32";

    if (canAuto) {
      this.feedUrl = feed;
      this.wire();
      try {
        await autoUpdater.checkForUpdates();
      } catch (e) {
        this.set({ state: "error", message: (e as Error).message });
      }
      return this.current;
    }

    if (latest && compareVersions(latest, app.getVersion()) > 0) {
      this.set({ state: "available", version: latest, notes: info?.notes, manual: true, downloadUrl: info?.downloadUrl });
    } else if (!latest && !feed) {
      this.set({ state: "disabled", reason: "Nenhuma URL de atualização configurada." });
    } else {
      this.set({ state: "none", version: app.getVersion() });
    }
    return this.current;
  }

  /** True when the manifest says this build is below the minimum allowed version. */
  mustUpdate(manifest?: LauncherManifest): boolean {
    const min = manifest?.launcher?.minVersion;
    return !!min && compareVersions(app.getVersion(), min) < 0;
  }

  install() {
    if (this.current.state === "ready") autoUpdater.quitAndInstall();
  }

  state() {
    return this.current;
  }
}
