# 01 - Launcher design (apps/launcher)

Date: 2026-10-01. Phase 1 goal: a player downloads one .exe, logs in and plays the **original DDTank 4.1 Flash client** on our Node server. No manual Flash, browser or plugin installs.

## Decision

**Hybrid. The launcher UI is current Electron (44) + React + TypeScript and contains no Flash. The game runs as a separate process:**
1. **Flash Player 32 projector** (`flashplayer_32_sa.exe`, 32.0.0.465) is the default.
2. **Ruffle desktop** is optional, selectable per player or forced by the server through `defaultRuntime` in the manifest.

The UI framework was Electron rather than Tauri. Tauri was possible (`cargo 1.98` is installed) and would give a roughly 10 MB binary instead of roughly 90 MB. Electron won for these reasons:
- the task asked for an electron-builder portable build;
- electron-updater is mature;
- everything stays in one language (TS) with the rest of the monorepo;
- `@ddtank/ui` (React + Tailwind) is reused as is.

Because the launcher no longer hosts Flash, we can switch to Tauri later without touching the runtime code (spawn, args and window tuning are plain Node).

## Options evaluated

| | (a) FP32 projector launched by the launcher | (b) Electron 11 + PepperFlash | (c) Ruffle desktop |
|---|---|---|---|
| Runs our 4.1 client today | **Yes**: the real AVM2, the same path BrunoSzczuk/VN servers use | Yes | **Not yet**: stalls in pickgliss `UIModuleLoader` (`Loader.loadBytes`, ruffle #18896); needs client patches (research/02) |
| Security | Unpatched 2020 VM, but **only the SWF runs in it**. No browser, no HTML/JS attack surface; it loads only our URL | **Worst**: Chromium 87 plus a 2020 plugin, both exposed to web content (webviews, ads, redirects). Sandboxing and an origin allow-list reduce the risk but do not remove it | **Best**: memory-safe Rust, maintained, sandboxed I/O |
| Performance | CPU software rasterizer (Flash never GPU-rendered the display list outside Stage3D). Single-threaded. Cost scales with **window pixel count × quality** | Same Flash renderer. `wmode=direct/gpu` only GPU-composites the final frame | **GPU** (wgpu: DX12/Vulkan/GL) tessellates vectors on the GPU, so big windows and fullscreen are cheap. But AVM2 is an **interpreter** with no JIT, so script-heavy frames can be slower than Flash |
| Hardware-accelerated option | No real one (only the Stage3D/direct compositing path, which DDTank does not use) | `wmode=gpu/direct` (compositing only) | **Yes** (`--graphics dx12`/`vulkan`, `--power high`) |
| Legality of redistribution | Adobe EULA: redistribution needed a licence, and Adobe no longer distributes it. **Grey.** We never commit or bundle it by default; the operator supplies a mirror and sha256 (see below) | PepperFlash DLL, same EULA problem, **plus** shipping an EOL Chromium | **MIT/Apache-2.0**: free to bundle |
| Auto-update | The launcher updates itself (electron-updater). The runtime is pinned by sha256 in the manifest and can be rotated server-side | The app has to stay on Electron 11 forever | Same as (a); pin a nightly |
| Platform | Windows (mac/linux projectors exist but rot) | Win/mac/linux | Win/mac/linux |

**(b) is rejected.** It ties us to a frozen 2020 Chromium, and the projector gives the same fidelity with far less attack surface.
**(a) is primary for Phase 1** because it is the only option that runs the client unmodified today.
**(c) is wired in now.** It becomes the default (via `defaultRuntime: "ruffle"` in the manifest, with no launcher release needed) once the client agent's Ruffle patches land. It is also the legal, redistributable path.

## Architecture

```
Electron main (Node)                              Renderer (React, sandboxed, CSP, no Node)
  config.ts   defaults < resources/launcher.config.json < exeDir/... < userData/... < DDT_* env
  api.ts      GET {api}/api/public/launcher (zod-validated, offline fallback)
              POST {api}/api/auth/login -> flashvars          <-- IPC (preload contextBridge) -->  Play / Settings / Logs
  runtime/manager.ts  locate (configured > bundled > downloaded) / download + sha256 + unzip (tar.exe)
  runtime/args.ts     projector: "<swf>?user&key&config" | ruffle: -P k=v --quality --width ... <swf>
  runtime/game.ts     spawn, one instance, stdout->logs, exit -> state
  runtime/window-win.ts  PowerShell+user32: title, View>Quality, size+center, hide menu, Ctrl+F fullscreen
  updater.ts  electron-updater (NSIS) | manifest version check (portable/dev) | minVersion gate
  logger.ts   userData/logs/launcher.log (2 MiB rotate), secrets redacted (key=, password=)
```

Security in the launcher:
- `contextIsolation`, `sandbox` and no `nodeIntegration`;
- a strict CSP is injected;
- every permission request is denied;
- navigation is blocked and external links go to the system browser (http/https only);
- all network calls happen in main, so the renderer has `connect-src 'self'`;
- IPC inputs are validated and the password is never stored (only the username, when the player opts in);
- login keys are treated as single-use and redacted from logs, and the session is dropped when the game exits.

## API contract (for apps/api)

`GET /api/public/launcher` returns the following (every field is optional except `servers`):
```json
{
  "launcher": { "latestVersion": "0.2.0", "minVersion": "0.1.0", "downloadUrl": "https://…/download", "updateUrl": "https://…/launcher/updates/", "notes": "…" },
  "defaultRuntime": "projector",
  "client": { "swfUrl": "https://play.example.com/flash/Loading.swf", "configUrl": "https://play.example.com/flash/config.xml", "width": 1000, "height": 600 },
  "servers": [{ "id": "s1", "name": "Servidor 1", "status": "online|offline|maintenance", "players": 12, "recommended": true, "description": "…", "apiUrl": "optional override", "client": { "swfUrl": "optional override" } }],
  "news": [{ "id": "1", "title": "…", "body": "…", "url": "https://…", "date": "2026-10-01", "tag": "Evento" }],
  "runtimes": { "projector": { "url": "https://mirror/flashplayer_32_sa.exe", "sha256": "<64 hex>", "version": "32.0.0.465" },
                "ruffle":    { "url": "https://github.com/ruffle-rs/ruffle/releases/download/nightly-…/…-windows-x86_64.zip", "sha256": "<64 hex>", "exe": "ruffle.exe" } }
}
```

`POST /api/auth/login` takes `{ "username", "password", "serverId", "client": "launcher" }`.
- Success returns **2xx** with `{ "user": { "id", "username" }, "play": { "flashvars": { "user": "...", "key": "<one-time key>", "config": "..." }, "swfUrl": "optional", "expiresAt": "optional" } }`. The launcher also accepts `{ "flashvars": {...} }` or `{ "ticket": { "user", "key" } }`. It adds `config` from `client.configUrl` when the API omits it.
- Failure returns 4xx with `{ "message": "texto PT-BR" }`. The message is shown to the player as is.
- `key` must be the one-time key that the 4.1 flow registers (the `CreateLogin.aspx` equivalent). The SWF then calls `Login.ashx` and the socket LOGIN with it (research/04 §2.6). The launcher does not interpret flashvars; it passes them through, so the exact names (`user`, `key`, `config`, optionally `rid`, …) are owned by apps/api and the client agent (research/client).

## Server-side requirements for the projector

The projector is the real Flash VM, so Flash's security model applies:
- **Socket policy:** `<policy-file-request/>` must be answered on 843 and/or in-band on the game port (apps/game; research/02 §4).
- **`crossdomain.xml`** must be served at the HTTP roots used by the client (resources, request, flash).
- The SWF runs in the remote sandbox because it is loaded by http(s) URL. Do not ask players to download SWFs locally (local-with-filesystem sandbox would block network access).

## Performance: what actually helps ("Flash lags")

Flash renders the display list **on the CPU, single-threaded**. Roughly, the cost is the number of redrawn pixels × the antialiasing level × the filters in use. In order of impact:

1. **Window size.** The projector scales the stage ("Show all"), so 1920×1080 costs about 3.5× the pixels of the native 1000×600. Default to native size and offer bigger presets as opt-in. Fullscreen is the most expensive mode in the projector, and nearly free in Ruffle (GPU).
2. **Quality.** `low` turns off antialiasing and bitmap smoothing (the biggest FPS win), `medium` uses 2×2 AA and `high` uses 4×4 AA. The launcher defaults to **medium** and applies it through the projector's View > Quality menu right after launch. The VN launcher had the same switch, which shows players use it.
3. **Filters/particles:** glow, blur and drop shadow on many sprites, plus battle particles. These are client-side; the client agent can add a "low effects" flag that `config.xml` (PARTICAL_LITE / `particallite.xml`, `shapelite.swf`) already hints at.
4. **Frame rate:** the SWF header decides it (DDTank uses about 25 fps for battle animation and timing). Raising it would change game timing; do not force it. Stable frame pacing matters more than raw fps.
5. **wmode (`direct`/`gpu`):** this is an embed parameter for the browser plugin and ActiveX. **The projector has no wmode.** For display-list content like DDTank, `direct` only changes compositing and is not a rendering speedup. `opaque`/`transparent` are slower.
6. **System:** use the high-performance power plan. On laptops, pick the discrete GPU for the Ruffle runtime (`--power high`). Hardware acceleration in Flash (Settings > Display) affects video and Stage3D only.
7. **The real hardware-accelerated path is Ruffle desktop:** `--graphics dx12|vulkan` plus `--power high`. It wins at big resolutions and loses on script-heavy frames (AVM2 interpreter). It needs the client patches first. **The long-term answer to lag is Phase 2 (PixiJS/WebGL client).**

## Runtime distribution and the legal caveat

- **Nothing from Adobe is committed to git.** `apps/launcher/runtime/` is gitignored.
- **Option 1 (the default and the cleanest for the installer):** the manifest lists `runtimes.projector.url` + `sha256`, pointing at the **operator's own mirror**. On first Play the launcher downloads it to `%APPDATA%/DDTank Launcher/runtime/projector/` (portable builds use the data folder next to the exe), verifies the sha256 and runs it. If the hash does not match, the file is deleted and the run aborts.
- **Option 2:** the operator runs `pnpm --filter launcher fetch-runtime projector` before `dist:win`, and electron-builder bundles it as `resources/runtime/projector/flashplayer_sa.exe`. The same URL and sha256 rules apply.
- **Legal caveat (also printed by the script):** the Flash Player projector is proprietary Adobe software. Adobe ended support on 2020-12-31 and no longer distributes it, and its licence never granted general redistribution. Mirroring or bundling it is the **operator's decision and risk**. The same applies to the 7Road client itself (research/04 §4.8). Ruffle (MIT/Apache-2.0) can be bundled freely; keep its LICENSE files.

## Auto-update

- **NSIS install:** electron-updater, generic provider. The feed URL comes from `manifest.launcher.updateUrl`, then config `updateUrl`, then `DDT_UPDATE_URL`. It downloads in the background and offers "Reiniciar e instalar"; otherwise the update installs on quit. Publishing a release means uploading `latest.yml` plus the installer to that folder (we never pass `--publish`).
- **Portable .exe:** it cannot self-update. The launcher compares `manifest.launcher.latestVersion` and shows a download link.
- **`minVersion`:** a launcher older than this is blocked from playing, with a download banner.
- **Runtimes** update independently: change the url/sha256 in the manifest. The launcher re-downloads when the file is missing, or when the sha recorded in its `runtime.json` differs from the manifest.

## Verified (2026-10-01)

- `pnpm --filter launcher build`, `typecheck` and `test` (16 vitest cases) pass. `electron-builder --win portable` produces `release/DDTank-Launcher-Portable-0.1.0.exe` (about 93 MB). The packaged app starts and falls back to offline mode with no API.
- End-to-end against `scripts/mock-api.mjs`:
  - manifest → servers and news are rendered;
  - wrong password → the API's PT-BR message;
  - login → flashvars;
  - Play → the runtime is spawned with `Loading.swf?user=…&key=…&config=…` (the key is redacted in logs);
  - the window tuner finds the window, selects View > Quality > Low, hides the menu and resizes it to 1000×600. This was tested with a WinForms stand-in that has a real Win32 menu, because no Adobe binary is available here.
- **Not verified:** the real `flashplayer_32_sa.exe` menu layout. We assume View > Quality has Low/Medium/High at positions 0, 1, 2, and that Full Screen carries the "Ctrl+F" accelerator text. If the matching fails it only logs a warning. Ruffle CLI flags (`-P`, `--quality`, `--width/--height`, `--fullscreen`, `--graphics`, `--power`, `--tcp-connections`) still need checking against the pinned nightly's `--help`; `runtimeExtraArgs.ruffle` is the escape hatch.

## Follow-ups

- An icon (`apps/launcher/build/icon.ico`) and code signing (unsigned exes trigger SmartScreen).
- Pre-seed Flash `settings.sol` storage quota for our domains if the "allow local storage" prompt appears (as the VN launcher did).
- macOS/Linux: the Ruffle runtime already works cross-platform; the projector window tuner is Windows-only.
