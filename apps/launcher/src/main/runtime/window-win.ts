import { spawn } from "node:child_process";
import type { ScopedLogger } from "../logger.js";

/**
 * Post-launch tweaks for the Flash Player projector window (Windows only), done with user32 through
 * PowerShell + Add-Type so the launcher needs no native Node module:
 *   - wait for the projector's main window
 *   - set window title
 *   - pick View > Quality > Low/Medium/High through the menu (WM_COMMAND)
 *   - resize the client area to WxH and center it
 *   - remove the menu bar (blocks File > Open of arbitrary SWFs, cleaner window)
 *   - fullscreen via the menu item whose accelerator is "Ctrl+F" (locale independent)
 * Everything is best-effort: failures are logged, the game keeps running.
 */

export interface ProjectorWindowOptions {
  pid: number;
  title: string;
  width: number;
  height: number;
  qualityIndex: 0 | 1 | 2;
  hideMenu: boolean;
  fullscreen: boolean;
}

const SCRIPT = String.raw`
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
Add-Type -TypeDefinition @"
using System;
using System.Text;
using System.Runtime.InteropServices;
public static class W {
  public delegate bool EnumProc(IntPtr h, IntPtr l);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc cb, IntPtr l);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern IntPtr GetMenu(IntPtr h);
  [DllImport("user32.dll")] public static extern bool SetMenu(IntPtr h, IntPtr m);
  [DllImport("user32.dll")] public static extern int GetMenuItemCount(IntPtr m);
  [DllImport("user32.dll")] public static extern IntPtr GetSubMenu(IntPtr m, int pos);
  [DllImport("user32.dll")] public static extern uint GetMenuItemID(IntPtr m, int pos);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetMenuStringW(IntPtr m, uint id, StringBuilder s, int max, uint flags);
  [DllImport("user32.dll")] public static extern bool PostMessageW(IntPtr h, uint msg, IntPtr w, IntPtr l);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern bool SetWindowTextW(IntPtr h, string t);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L, T, R, B; }
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool GetClientRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool MoveWindow(IntPtr h, int x, int y, int w, int hh, bool repaint);
  [DllImport("user32.dll")] public static extern int GetSystemMetrics(int i);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  public static IntPtr Find(uint pid) {
    IntPtr found = IntPtr.Zero;
    EnumWindows((h, l) => { uint p; GetWindowThreadProcessId(h, out p); if (p == pid && IsWindowVisible(h) && GetMenu(h) != IntPtr.Zero) { found = h; return false; } return true; }, IntPtr.Zero);
    return found;
  }
  public static string Text(IntPtr m, int pos) { var sb = new StringBuilder(256); GetMenuStringW(m, (uint)pos, sb, 256, 0x400); return sb.ToString(); }
}
"@
$procId = [uint32]$env:DDT_PID
$h = [IntPtr]::Zero
for ($i = 0; $i -lt 150 -and $h -eq [IntPtr]::Zero; $i++) { Start-Sleep -Milliseconds 100; $h = [W]::Find($procId) }
if ($h -eq [IntPtr]::Zero) { Write-Output 'window-not-found'; exit 2 }
[void][W]::SetWindowTextW($h, $env:DDT_TITLE)
$menu = [W]::GetMenu($h)
$WM_COMMAND = 0x0111
$fullId = 0
$q = [int]$env:DDT_QUALITY
for ($i = 0; $i -lt [W]::GetMenuItemCount($menu); $i++) {
  $sub = [W]::GetSubMenu($menu, $i)
  if ($sub -eq [IntPtr]::Zero) { continue }
  for ($j = 0; $j -lt [W]::GetMenuItemCount($sub); $j++) {
    $t = [W]::Text($sub, $j)
    if ($t -match 'Ctrl\+F') { $fullId = [W]::GetMenuItemID($sub, $j) }
    $qs = [W]::GetSubMenu($sub, $j)
    if ($qs -ne [IntPtr]::Zero -and $t -match 'ualit|alidad|ualitä' -and [W]::GetMenuItemCount($qs) -ge 3) {
      $id = [W]::GetMenuItemID($qs, $q)
      [void][W]::PostMessageW($h, $WM_COMMAND, [IntPtr]$id, [IntPtr]::Zero)
      Write-Output ("quality=" + [W]::Text($qs, $q))
    }
  }
}
if ($env:DDT_HIDE_MENU -eq '1') { [void][W]::SetMenu($h, [IntPtr]::Zero); Write-Output 'menu-hidden' }
Start-Sleep -Milliseconds 150
$wr = New-Object W+RECT; $cr = New-Object W+RECT
[void][W]::GetWindowRect($h, [ref]$wr); [void][W]::GetClientRect($h, [ref]$cr)
$fw = ($wr.R - $wr.L) - ($cr.R - $cr.L); $fh = ($wr.B - $wr.T) - ($cr.B - $cr.T)
$w = [int]$env:DDT_W + $fw; $hh = [int]$env:DDT_H + $fh
$sw = [W]::GetSystemMetrics(0); $sh = [W]::GetSystemMetrics(1)
$x = [Math]::Max(0, [int](($sw - $w) / 2)); $y = [Math]::Max(0, [int](($sh - $hh) / 2))
[void][W]::MoveWindow($h, $x, $y, $w, $hh, $true)
Write-Output ("size=" + $env:DDT_W + "x" + $env:DDT_H)
[void][W]::SetForegroundWindow($h)
if ($env:DDT_FULLSCREEN -eq '1' -and $fullId -ne 0) { [void][W]::PostMessageW($h, $WM_COMMAND, [IntPtr]$fullId, [IntPtr]::Zero); Write-Output 'fullscreen' }
`;

export function tuneProjectorWindow(o: ProjectorWindowOptions, log: ScopedLogger): void {
  if (process.platform !== "win32") return;
  const encoded = Buffer.from(SCRIPT, "utf16le").toString("base64");
  const ps = spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-EncodedCommand", encoded], {
    windowsHide: true,
    env: {
      ...process.env,
      DDT_PID: String(o.pid),
      DDT_TITLE: o.title,
      DDT_W: String(o.width),
      DDT_H: String(o.height),
      DDT_QUALITY: String(o.qualityIndex),
      DDT_HIDE_MENU: o.hideMenu ? "1" : "0",
      DDT_FULLSCREEN: o.fullscreen ? "1" : "0",
    },
  });
  let out = "";
  ps.stdout.on("data", (d) => (out += String(d)));
  ps.stderr.on("data", (d) => (out += String(d)));
  ps.on("error", (e) => log.warn(`window tune failed to start: ${e.message}`));
  ps.on("close", (code) => {
    const msg = out.replace(/\s+/g, " ").trim();
    if (code === 0) log.info(`projector window tuned: ${msg}`);
    else log.warn(`projector window tune exit ${code}: ${msg.slice(0, 500)}`);
  });
}
