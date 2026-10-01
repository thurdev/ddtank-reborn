import type { LauncherBridge } from "../shared/types";

declare global {
  interface Window {
    launcher: LauncherBridge;
  }
}
export {};
