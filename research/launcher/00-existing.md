# 00 - Existing launchers in vendor/DDTank41

Researched 2026-10-01. Sources: `git -C vendor/DDTank41 ls-tree -r --name-only remake/main | grep -i launcher` and `vendor/DDTank41/Source Launcher` (present on both branches).

There are three launcher lineages. They use three different ways to run Flash.

## 1. `remake/main:Launcher.Electron/` (AloneInAbyss): Electron 11 + PepperFlash

Files: `main.js`, `flash-policy.js`, `cdp-inspect.js`, `package.json` (`electron: 11.5.0`). Design notes are in `remake/main:DOCUMENTACAO-LAUNCHER.md`.

- **How Flash runs:** the old Chromium PPAPI plugin.
  - `app.commandLine.appendSwitch("ppapi-flash-path", pepflashplayer64.dll)` and `ppapi-flash-version 32.0.0.303` are set before `ready`.
  - Then `BrowserWindow({ webPreferences: { plugins: true, contextIsolation: true } })` calls `loadURL("http://127.0.0.1/index.htm")`. That is the ASP.NET `Tank.Flash` site, whose `playgame.aspx` embeds `DDT_Loadin2.swf` with `wmode="direct"` and `quality=high`.
- **Pinned to Electron 11.5.0 on purpose:** PPAPI was removed in Electron 12.
- **No Flash binary of its own.** `findPepperFlash()` takes `Launcher.Electron/flashver/pepflashplayer64.dll`, or **borrows the DLL from the user's installed DDClássico launcher** (`%LOCALAPPDATA%\Programs\ddclassico-launcher\resources\flashver\`). DDClássico is a Brazilian private server whose launcher is also Electron 11.5.0 + Pepper Flash 32.0.0.303, with a webview on their site and electron-updater (generic provider).
- **Dev tooling, not a product:**
  - It starts its own **843 socket-policy server** (`flash-policy.js`, `allow-access-from domain="*" to-ports="*"`).
  - It logs every request to `logs/electron-net.log`.
  - It opens `--remote-debugging-port=9222` and screenshots the page every 8 s (`cdp-inspect.js` reads the DOM over CDP).
  - It has no login UI, no updater and no settings. Login is done by the web page.
- **Assessment:** this proves the PPAPI recipe works. It also shows the security cost: Chromium 87 (2020, hundreds of CVEs) loading remote content, with a 2020 Flash plugin and the debug port open.

## 2. `Source Launcher/Launcher` (Gun321.Client, VN "Cyrus" launcher): WinForms + F-In-Box (in-memory Flash ActiveX)

- **.NET 4.0 WinForms, obfuscated** (class and member names like `Class0`, `smethod_0`, `zpmZq…`). The code is VN-only: PHP launcher API `/launcher/login.php` on `Member_GMP`, MoMo / card payment.
- **How Flash runs (main path):** `Forms/PlayGameInBox.cs`.
  - The Flash OCX is an embedded resource (`EmbedAssemblies/Assemblies.winfl.ocx`, the **F-In-Box** commercial library). It is loaded from memory through `AxCode`/`c__control`, so the user does not need Flash installed or registered.
  - Properties: `FlashProperty_WMode = "direct"`, `FlashProperty_Movie = Url`, `FlashProperty_FlashVars = FlashVars` (the `user=..&key=..&config=..` string), then `FlashMethod_Play()`.
  - **Quality:** a menu in the title bar sets `FlashProperty_Quality2 = "low" | "medium" | "high"` at runtime. Low quality was a feature players asked for.
  - **ExternalInterface:** `OnFlashCall` handles `console.log`, `analyzeStr` (it replies `isSafeFlash(ConfigDecryptKey)`, a client-integrity handshake), `setDailyTask`, and similar calls.
- **Alternative path:** `Forms/RunFlashStandAlone.cs` launches **`%TEMP%\flashplayer32_0r0_344\flashplayer.exe <swf-url-with-query>`** (the Flash 32 projector) with `ProcessWindowStyle.Hidden`. It then **re-parents the projector window into its own form** with `SetParent(process.MainWindowHandle, panel.Handle)`. Flashvars go in the **SWF query string** (`DebugLoader.swf?user=..&key=..&config=..`).
- **Flash settings:** it ships pre-baked `FlashSettings.*.settings.sol` files and copies them into `%APPDATA%\Macromedia\Flash Player\macromedia.com\support\flashplayer\sys\` for its domains. This most likely pre-grants local-storage quota, so the "allow local storage" prompt never appears. DDTank caches modules in SharedObjects.
- **Assessment:** this is the most "productized" design: login, server list, quality switch, logs. It depends on a commercial OCX (F-In-Box) plus an Adobe ActiveX DLL, and it is Windows-only and obfuscated. We take ideas from it, not code.

## 3. `Source Launcher/GunDaiVietLauncher`, `ZGunLauncher`: thin WinForms wrappers

These are small forms around the obfuscated `Gun321.Client.exe` (process kill/restart helpers). They do nothing new for running Flash.

## Takeaways for our launcher

| Idea | Source | Use? |
|---|---|---|
| Flashvars in the SWF query string for the projector | VN `RunFlashStandAlone` | **Yes** (that is how the projector gets `user/key/config`) |
| Quality switch Low/Medium/High at runtime | VN `SetQuality` | **Yes**: we drive the projector's own View > Quality menu |
| `wmode=direct` | VN, `playgame.aspx` | N/A for the projector (no wmode; see 01-design) |
| Re-parenting the projector window (SetParent) | VN | No: it breaks fullscreen and DPI and adds no value. We size and title the projector window instead |
| Pre-seeded `.sol` settings (storage quota) | VN | Later. Write `settings.sol` for our domains if the storage prompt shows up |
| 843 policy server inside the launcher | AloneInAbyss | No: `apps/game` answers the policy on 843 and in-band |
| Electron 11 + PepperFlash | AloneInAbyss, DDClássico | **Rejected** (security); see 01-design |
| electron-updater generic feed | DDClássico | **Yes** |
