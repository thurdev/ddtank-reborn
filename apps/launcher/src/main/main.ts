import { app, BrowserWindow, ipcMain, Menu, session, shell } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { IPC, type AppInfo, type LoginRequest, type PlaySession, type RuntimeKind } from "../shared/types.js";
import { ApiClient } from "./api.js";
import { loadConfig } from "./config.js";
import { Logger } from "./logger.js";
import { GameController } from "./runtime/game.js";
import { RuntimeManager } from "./runtime/manager.js";
import { SettingsStore } from "./settings.js";
import { Updater } from "./updater.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const devServerUrl = process.env.VITE_DEV_SERVER_URL;

// Portable build: keep user data next to the .exe so the folder can be copied around / run from a USB stick.
const portableDir = process.env.PORTABLE_EXECUTABLE_DIR;
if (portableDir) app.setPath("userData", path.join(portableDir, "DDTankLauncherData"));

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  void main();
}

async function main() {
  await app.whenReady();
  const userData = app.getPath("userData");
  const logger = new Logger(path.join(userData, "logs"));
  const log = logger.scope("main");
  log.info(`DDTank Launcher ${app.getVersion()} electron=${process.versions.electron} platform=${process.platform}`);

  const resourcesDir = app.isPackaged ? process.resourcesPath : path.resolve(here, "../..");
  const exeDir = portableDir ?? path.dirname(app.getPath("exe"));
  const cfg = loadConfig({ resourcesDir, exeDir, userDataDir: userData, env: process.env });
  log.info(`config sources: ${cfg.sources.join(" | ")}; api=${cfg.apiUrl}`);

  const settings = new SettingsStore(userData);
  const api = new ApiClient(cfg, logger.scope("api"));
  const runtimes = new RuntimeManager(
    cfg,
    { resources: resourcesDir, userData },
    logger.scope("runtime"),
    () => apiManifestRuntimes(),
  );
  const game = new GameController(cfg, runtimes, logger.scope("game"));
  const updater = new Updater(cfg.updateUrl, !!portableDir, logger.scope("update"));
  let manifestCache: Awaited<ReturnType<ApiClient["getManifest"]>> | undefined;
  const apiManifestRuntimes = () => manifestCache?.manifest.runtimes ?? {};
  let playSession: PlaySession | undefined;

  Menu.setApplicationMenu(null);
  hardenSessions(cfg.apiUrl, !!devServerUrl);

  const win = new BrowserWindow({
    width: 1080,
    height: 680,
    minWidth: 900,
    minHeight: 600,
    show: false,
    backgroundColor: "#0f1530",
    title: "DDTank Launcher",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(here, "../preload/preload.cjs"),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true,
      spellcheck: false,
    },
  });
  win.once("ready-to-show", () => win.show());
  // The launcher never navigates anywhere: external links open in the system browser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    openExternalSafe(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (e, url) => {
    if (devServerUrl && url.startsWith(devServerUrl)) return;
    e.preventDefault();
  });

  const send = (channel: string, payload: unknown) => {
    if (!win.isDestroyed()) win.webContents.send(channel, payload);
  };
  logger.onLine((l) => send(IPC.evLog, l));
  updater.onState((s) => send(IPC.evUpdateState, s));
  game.onState((s) => {
    send(IPC.evGameState, s);
    const mode = settings.get().launcherOnPlay;
    if (s.state === "running") {
      if (mode === "minimize") win.minimize();
      else if (mode === "hide") win.hide();
    } else if (s.state === "exited" || s.state === "error") {
      if (!win.isVisible()) win.show();
      if (win.isMinimized()) win.restore();
      // The login key is single-use on the server side: force a fresh login next time.
      if (s.state === "exited") playSession = undefined;
    }
  });

  app.on("second-instance", () => {
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
  });

  // ---- IPC ----
  ipcMain.handle(IPC.getAppInfo, (): AppInfo => ({
    version: app.getVersion(),
    platform: process.platform,
    packaged: app.isPackaged,
    portable: !!portableDir,
    logFile: logger.file,
    config: cfg,
  }));
  ipcMain.handle(IPC.getManifest, async (_e, force: unknown) => {
    manifestCache = await api.getManifest(force === true);
    return manifestCache;
  });
  ipcMain.handle(IPC.login, async (_e, raw: unknown) => {
    const req = parseLogin(raw);
    if (!req) return { ok: false, error: "Preencha usuário, senha e servidor." };
    if (!manifestCache) manifestCache = await api.getManifest();
    const r = await api.login(req);
    if (r.ok && r.session) {
      playSession = r.session;
      const s = settings.get();
      settings.save({ lastServerId: req.serverId, lastUsername: s.rememberUsername ? req.username : "" });
    }
    return r;
  });
  ipcMain.handle(IPC.logout, () => {
    playSession = undefined;
  });
  ipcMain.handle(IPC.getSettings, () => settings.get());
  ipcMain.handle(IPC.saveSettings, (_e, patch: unknown) => settings.save(patch));
  ipcMain.handle(IPC.getRuntimeStatus, () => runtimes.all());
  ipcMain.handle(IPC.installRuntime, async (_e, kind: unknown) => {
    if (kind !== "projector" && kind !== "ruffle") throw new Error("runtime inválido");
    const src = runtimes.source(kind as RuntimeKind);
    if (!src) throw new Error("Sem URL de download configurada para este runtime.");
    await runtimes.install(kind, src, (message, progress) => send(IPC.evGameState, { state: "preparing", message, progress }));
    send(IPC.evGameState, { state: "idle" });
    return runtimes.status(kind);
  });
  ipcMain.handle(IPC.play, async () => {
    if (!playSession) return { state: "error", message: "Faça login primeiro." };
    const server = api.server(playSession.serverId);
    return game.play({
      session: playSession,
      client: api.clientFor(playSession.serverId),
      settings: settings.get(),
      serverName: server?.name ?? playSession.serverId,
      serverDefaultRuntime: manifestCache?.manifest.defaultRuntime,
    });
  });
  ipcMain.handle(IPC.stopGame, () => game.stop());
  ipcMain.handle(IPC.getGameState, () => game.state());
  ipcMain.handle(IPC.checkForUpdates, async () => {
    if (!manifestCache) manifestCache = await api.getManifest();
    return updater.check(manifestCache.manifest);
  });
  ipcMain.handle(IPC.installUpdate, () => updater.install());
  ipcMain.handle(IPC.getLogs, (_e, limit: unknown) => logger.tail(typeof limit === "number" ? limit : 500));
  ipcMain.handle(IPC.openLogsFolder, () => shell.openPath(path.dirname(logger.file)));
  ipcMain.handle(IPC.openExternal, (_e, url: unknown) => {
    if (typeof url === "string") openExternalSafe(url);
  });

  if (devServerUrl) await win.loadURL(devServerUrl);
  else await win.loadFile(path.join(here, "../renderer/index.html"));

  app.on("window-all-closed", () => {
    game.stop();
    app.quit();
  });
}

function parseLogin(raw: unknown): LoginRequest | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Record<string, unknown>;
  const username = typeof r.username === "string" ? r.username.trim() : "";
  const password = typeof r.password === "string" ? r.password : "";
  const serverId = typeof r.serverId === "string" ? r.serverId : "";
  if (!username || !password || !serverId || username.length > 64 || password.length > 128) return undefined;
  return { username, password, serverId };
}

function openExternalSafe(url: string) {
  try {
    const u = new URL(url);
    if (u.protocol === "https:" || u.protocol === "http:") void shell.openExternal(u.toString());
  } catch {
    /* ignore invalid */
  }
}

/** CSP + deny every permission request: the launcher UI needs none (all network goes through main). */
function hardenSessions(apiUrl: string, dev: boolean) {
  const ses = session.defaultSession;
  ses.setPermissionRequestHandler((_wc, _perm, cb) => cb(false));
  ses.setPermissionCheckHandler(() => false);
  const csp = [
    "default-src 'self'",
    `script-src 'self'${dev ? " 'unsafe-inline' 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    `img-src 'self' data: https: ${new URL(apiUrl).origin}`,
    `connect-src 'self'${dev ? " ws: http://localhost:*" : ""}`,
    "object-src 'none'",
    "base-uri 'none'",
    "frame-src 'none'",
  ].join("; ");
  ses.webRequest.onHeadersReceived((details, cb) => {
    cb({ responseHeaders: { ...details.responseHeaders, "Content-Security-Policy": [csp] } });
  });
}
