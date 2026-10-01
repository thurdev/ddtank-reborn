import { useCallback, useEffect, useState } from "react";
import { Gamepad2, ScrollText, Settings as SettingsIcon } from "lucide-react";
import { Badge, cn, TrajectoryArc } from "@ddtank/ui";
import type { AppInfo, GameState, ManifestResult, PlaySession, Settings, UpdateState } from "../shared/types";
import { PlayView } from "./components/PlayView";
import { SettingsView } from "./components/SettingsView";
import { LogsView } from "./components/LogsView";
import { UpdateBanner } from "./components/UpdateBanner";

type Tab = "play" | "settings" | "logs";
const api = window.launcher;

export function App() {
  const [tab, setTab] = useState<Tab>("play");
  const [info, setInfo] = useState<AppInfo>();
  const [manifest, setManifest] = useState<ManifestResult>();
  const [settings, setSettings] = useState<Settings>();
  const [session, setSession] = useState<PlaySession>();
  const [game, setGame] = useState<GameState>({ state: "idle" });
  const [update, setUpdate] = useState<UpdateState>();

  const reloadManifest = useCallback(async (force = false) => {
    setManifest(await api.getManifest(force));
  }, []);

  useEffect(() => {
    void api.getAppInfo().then(setInfo);
    void api.getSettings().then(setSettings);
    void api.getGameState().then(setGame);
    void reloadManifest().then(() => api.checkForUpdates().then(setUpdate));
    const offGame = api.onGameState((s) => {
      setGame(s);
      // Login keys are single-use: after the game closes, ask for the password again.
      if (s.state === "exited") setSession(undefined);
    });
    const offUpd = api.onUpdateState(setUpdate);
    return () => {
      offGame();
      offUpd();
    };
  }, [reloadManifest]);

  const saveSettings = async (patch: Partial<Settings>) => setSettings(await api.saveSettings(patch));

  const minVersion = manifest?.manifest.launcher?.minVersion;
  const blocked = !!(info && minVersion && cmp(info.version, minVersion) < 0);

  const nav: { id: Tab; label: string; icon: typeof Gamepad2 }[] = [
    { id: "play", label: "Jogar", icon: Gamepad2 },
    { id: "settings", label: "Configurações", icon: SettingsIcon },
    { id: "logs", label: "Logs", icon: ScrollText },
  ];

  return (
    <div className="flex h-full bg-night bg-starfield text-ink">
      <aside className="flex w-56 shrink-0 flex-col border-r border-line bg-night-deep/70 p-4">
        <div className="mb-6 flex items-center gap-2">
          <TrajectoryArc className="h-8 w-12 text-sun" />
          <div>
            <div className="title-plate text-2xl leading-none text-sun">DDTank</div>
            <div className="text-xs text-muted">Reborn Launcher</div>
          </div>
        </div>
        <nav className="flex flex-col gap-1">
          {nav.map((n) => (
            <button
              key={n.id}
              onClick={() => setTab(n.id)}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2 text-left font-display tracking-wide transition-colors",
                tab === n.id ? "bg-sun text-night-deep" : "text-muted hover:bg-panel-2 hover:text-ink",
              )}
            >
              <n.icon className="size-5" />
              {n.label}
            </button>
          ))}
        </nav>
        <div className="mt-auto space-y-2 text-xs text-muted">
          {manifest?.offline && <Badge tone="coral">Servidor offline</Badge>}
          <div>v{info?.version ?? "…"}{info?.portable ? " · portátil" : ""}</div>
          <div className="truncate selectable" title={info?.config.apiUrl}>{info?.config.apiUrl}</div>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <UpdateBanner update={update} blocked={blocked} downloadUrl={manifest?.manifest.launcher?.downloadUrl} />
        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {tab === "play" && settings && (
            <PlayView
              manifest={manifest}
              settings={settings}
              session={session}
              game={game}
              blocked={blocked}
              onSession={setSession}
              onSaveSettings={saveSettings}
              onRefresh={() => reloadManifest(true)}
            />
          )}
          {tab === "settings" && settings && <SettingsView settings={settings} game={game} onSave={saveSettings} />}
          {tab === "logs" && <LogsView logFile={info?.logFile} />}
        </div>
      </main>
    </div>
  );
}

function cmp(a: string, b: string) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) - (pb[i] ?? 0);
  return 0;
}
