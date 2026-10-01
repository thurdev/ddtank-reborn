// Sandboxed preload: may only require("electron"), so channel names are inlined (keep in sync with shared/types.ts IPC).
import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron";
import type { LauncherBridge } from "../shared/types.js";

const invoke =
  (ch: string) =>
  (...args: unknown[]) =>
    ipcRenderer.invoke(ch, ...args);

function on<T>(ch: string) {
  return (cb: (v: T) => void) => {
    const fn = (_e: IpcRendererEvent, v: T) => cb(v);
    ipcRenderer.on(ch, fn);
    return () => {
      ipcRenderer.removeListener(ch, fn);
    };
  };
}

const bridge: LauncherBridge = {
  getAppInfo: invoke("app:info") as LauncherBridge["getAppInfo"],
  getManifest: invoke("manifest:get") as LauncherBridge["getManifest"],
  login: invoke("auth:login") as LauncherBridge["login"],
  logout: invoke("auth:logout") as LauncherBridge["logout"],
  getSettings: invoke("settings:get") as LauncherBridge["getSettings"],
  saveSettings: invoke("settings:save") as LauncherBridge["saveSettings"],
  getRuntimeStatus: invoke("runtime:status") as LauncherBridge["getRuntimeStatus"],
  installRuntime: invoke("runtime:install") as LauncherBridge["installRuntime"],
  play: invoke("game:play") as LauncherBridge["play"],
  stopGame: invoke("game:stop") as LauncherBridge["stopGame"],
  getGameState: invoke("game:state") as LauncherBridge["getGameState"],
  checkForUpdates: invoke("update:check") as LauncherBridge["checkForUpdates"],
  installUpdate: invoke("update:install") as LauncherBridge["installUpdate"],
  getLogs: invoke("logs:get") as LauncherBridge["getLogs"],
  openLogsFolder: invoke("logs:open") as LauncherBridge["openLogsFolder"],
  openExternal: invoke("shell:open") as LauncherBridge["openExternal"],
  onGameState: on("ev:game-state"),
  onUpdateState: on("ev:update-state"),
  onLog: on("ev:log"),
};

contextBridge.exposeInMainWorld("launcher", bridge);
