/**
 * Contract shared between the Electron main process, the preload bridge and the React renderer.
 * Only types + plain constants live here (the renderer imports it with `import type`).
 */

export type RuntimeKind = "projector" | "ruffle";
export type RuntimePreference = RuntimeKind | "auto";
export type Quality = "low" | "medium" | "high" | "best";
export type RuffleGraphics = "default" | "dx12" | "vulkan" | "gl";

/** Effective launcher configuration (defaults < config files < env). */
export interface LauncherConfig {
  /** Base URL of apps/api (no trailing slash). */
  apiUrl: string;
  /** Full URL of the launcher manifest. Default: `${apiUrl}/api/public/launcher`. */
  manifestUrl: string;
  /** Login endpoint. Default: `${apiUrl}/api/auth/login`. */
  loginUrl: string;
  /** electron-updater "generic" feed URL (folder with latest.yml). Empty = disabled. */
  updateUrl: string;
  /** Fallback client info if the manifest is unreachable / does not provide one. */
  client: ClientInfo;
  /** Where to download game runtimes from when not bundled (operator-provided mirrors). */
  runtimes: Partial<Record<RuntimeKind, RuntimeSource>>;
  /** Explicit local paths (dev): skip download when set and the file exists. */
  runtimePaths: Partial<Record<RuntimeKind, string>>;
  /** Extra CLI args appended per runtime (escape hatch for flags that changed upstream). */
  runtimeExtraArgs: Partial<Record<RuntimeKind, string[]>>;
  /** Where the config came from (for the diagnostics screen). */
  sources: string[];
}

export interface ClientInfo {
  /** Absolute URL of the loader SWF (e.g. http://localhost:8080/flash/Loading.swf). */
  swfUrl: string;
  /** Optional config.xml URL, injected as the `config` flashvar when the API does not send one. */
  configUrl?: string;
  /** Native stage size of the client (DDTank 4.1 = 1000x600). */
  width: number;
  height: number;
}

export interface RuntimeSource {
  /** Download URL (.exe or .zip). Operator-provided; never an Adobe binary committed to git. */
  url: string;
  /** Lowercase hex sha256 of the downloaded file. Required: downloads without it are refused. */
  sha256: string;
  version?: string;
  /** For .zip archives: path of the executable inside the archive. */
  exe?: string;
}

export interface ServerEntry {
  id: string;
  name: string;
  status: "online" | "offline" | "maintenance";
  description?: string;
  players?: number;
  recommended?: boolean;
  /** Override API base for this server (multi-region). */
  apiUrl?: string;
  /** Override client info for this server. */
  client?: Partial<ClientInfo>;
}

export interface NewsItem {
  id: string;
  title: string;
  body?: string;
  url?: string;
  date?: string;
  tag?: string;
}

export interface LauncherManifest {
  launcher?: {
    latestVersion?: string;
    minVersion?: string;
    downloadUrl?: string;
    updateUrl?: string;
    notes?: string;
  };
  servers: ServerEntry[];
  news: NewsItem[];
  client?: Partial<ClientInfo>;
  runtimes?: Partial<Record<RuntimeKind, RuntimeSource>>;
  /** Server-side recommended runtime (e.g. force "projector" while Ruffle cannot run the client). */
  defaultRuntime?: RuntimeKind;
}

export interface ManifestResult {
  manifest: LauncherManifest;
  /** True when the remote manifest failed and we used the built-in fallback. */
  offline: boolean;
  error?: string;
  fetchedAt: string;
}

export interface LoginRequest {
  serverId: string;
  username: string;
  password: string;
}

/** What the API returns on POST /api/auth/login (validated loosely in main). */
export interface PlaySession {
  username: string;
  serverId: string;
  /** Flashvars for Loading.swf (user, key, config, ...). */
  flashvars: Record<string, string>;
  /** Optional override of the SWF URL. */
  swfUrl?: string;
  expiresAt?: string;
}

export interface LoginResult {
  ok: boolean;
  session?: PlaySession;
  error?: string;
}

export interface Settings {
  runtime: RuntimePreference;
  quality: Quality;
  width: number;
  height: number;
  fullscreen: boolean;
  /** Projector: remove the File/View/Control menu bar from the game window. */
  hideProjectorMenu: boolean;
  /** Ruffle: wgpu backend. dx12/vulkan are GPU accelerated. */
  ruffleGraphics: RuffleGraphics;
  /** Ruffle: prefer the discrete GPU. */
  highPerformanceGpu: boolean;
  /** What to do with the launcher window while the game runs. */
  launcherOnPlay: "minimize" | "keep" | "hide";
  rememberUsername: boolean;
  lastUsername: string;
  lastServerId: string;
}

export const DEFAULT_SETTINGS: Settings = {
  runtime: "auto",
  quality: "medium",
  width: 1000,
  height: 600,
  fullscreen: false,
  hideProjectorMenu: true,
  ruffleGraphics: "default",
  highPerformanceGpu: true,
  launcherOnPlay: "minimize",
  rememberUsername: true,
  lastUsername: "",
  lastServerId: "",
};

export interface RuntimeStatus {
  kind: RuntimeKind;
  installed: boolean;
  path?: string;
  /** Where it came from: bundled with the installer, downloaded, or configured path. */
  origin?: "bundled" | "downloaded" | "configured";
  downloadable: boolean;
}

export type GameState =
  | { state: "idle" }
  | { state: "preparing"; message: string; progress?: number }
  | { state: "running"; pid: number; runtime: RuntimeKind; startedAt: string }
  | { state: "exited"; code: number | null; runtime: RuntimeKind }
  | { state: "error"; message: string };

export type UpdateState =
  | { state: "disabled"; reason: string }
  | { state: "checking" }
  | { state: "none"; version: string }
  | { state: "available"; version: string; notes?: string; manual?: boolean; downloadUrl?: string }
  | { state: "downloading"; percent: number }
  | { state: "ready"; version: string }
  | { state: "error"; message: string };

export interface AppInfo {
  version: string;
  platform: NodeJS.Platform;
  packaged: boolean;
  portable: boolean;
  logFile: string;
  config: LauncherConfig;
}

export interface LogLine {
  ts: string;
  level: "debug" | "info" | "warn" | "error";
  scope: string;
  msg: string;
}

/** The API exposed on `window.launcher` by the preload script. */
export interface LauncherBridge {
  getAppInfo(): Promise<AppInfo>;
  getManifest(force?: boolean): Promise<ManifestResult>;
  login(req: LoginRequest): Promise<LoginResult>;
  logout(): Promise<void>;
  getSettings(): Promise<Settings>;
  saveSettings(patch: Partial<Settings>): Promise<Settings>;
  getRuntimeStatus(): Promise<RuntimeStatus[]>;
  installRuntime(kind: RuntimeKind): Promise<RuntimeStatus>;
  play(): Promise<GameState>;
  stopGame(): Promise<void>;
  getGameState(): Promise<GameState>;
  checkForUpdates(): Promise<UpdateState>;
  installUpdate(): Promise<void>;
  getLogs(limit?: number): Promise<LogLine[]>;
  openLogsFolder(): Promise<void>;
  openExternal(url: string): Promise<void>;
  onGameState(cb: (s: GameState) => void): () => void;
  onUpdateState(cb: (s: UpdateState) => void): () => void;
  onLog(cb: (l: LogLine) => void): () => void;
}

export const IPC = {
  getAppInfo: "app:info",
  getManifest: "manifest:get",
  login: "auth:login",
  logout: "auth:logout",
  getSettings: "settings:get",
  saveSettings: "settings:save",
  getRuntimeStatus: "runtime:status",
  installRuntime: "runtime:install",
  play: "game:play",
  stopGame: "game:stop",
  getGameState: "game:state",
  checkForUpdates: "update:check",
  installUpdate: "update:install",
  getLogs: "logs:get",
  openLogsFolder: "logs:open",
  openExternal: "shell:open",
  evGameState: "ev:game-state",
  evUpdateState: "ev:update-state",
  evLog: "ev:log",
} as const;
