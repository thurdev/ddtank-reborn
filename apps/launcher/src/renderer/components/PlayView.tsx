import { useEffect, useState, type FormEvent } from "react";
import { LogOut, Play, RefreshCw, Square, Users } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  cn,
  EmptyState,
  Field,
  Input,
  PowerGauge,
  Spinner,
  StatusDot,
} from "@ddtank/ui";
import type { GameState, ManifestResult, PlaySession, ServerEntry, Settings } from "../../shared/types";

interface Props {
  manifest?: ManifestResult;
  settings: Settings;
  session?: PlaySession;
  game: GameState;
  blocked: boolean;
  onSession: (s?: PlaySession) => void;
  onSaveSettings: (p: Partial<Settings>) => Promise<void>;
  onRefresh: () => Promise<void>;
}

export function PlayView({ manifest, settings, session, game, blocked, onSession, onSaveSettings, onRefresh }: Props) {
  const servers = manifest?.manifest.servers ?? [];
  const news = manifest?.manifest.news ?? [];
  const [serverId, setServerId] = useState(settings.lastServerId);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!servers.length) return;
    if (!servers.some((s) => s.id === serverId)) {
      setServerId((servers.find((s) => s.recommended && s.status === "online") ?? servers.find((s) => s.status === "online") ?? servers[0])!.id);
    }
  }, [servers, serverId]);

  const selected = servers.find((s) => s.id === serverId);

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Servidores</CardTitle>
            <Button
              size="sm"
              variant="ghost"
              disabled={refreshing}
              onClick={async () => {
                setRefreshing(true);
                await onRefresh().finally(() => setRefreshing(false));
              }}
            >
              <RefreshCw className={cn(refreshing && "animate-spin")} /> Atualizar
            </Button>
          </CardHeader>
          <CardContent>
            {!manifest ? (
              <div className="flex items-center gap-2 text-muted">
                <Spinner /> Carregando…
              </div>
            ) : (
              <>
                {manifest.offline && (
                  <p className="mb-3 rounded-xl border border-coral/40 bg-coral/10 p-3 text-sm text-coral">
                    Não foi possível falar com o servidor ({manifest.error}). Usando a lista local.
                  </p>
                )}
                <div className="grid gap-2 sm:grid-cols-2">
                  {servers.map((s) => (
                    <ServerCard key={s.id} server={s} active={s.id === serverId} disabled={!!session} onSelect={() => setServerId(s.id)} />
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            {session ? (
              <PlayPanel session={session} server={selected} game={game} blocked={blocked} onLogout={() => onSession(undefined)} />
            ) : (
              <LoginForm
                server={selected}
                settings={settings}
                disabled={blocked || !selected}
                onLogged={(s) => onSession(s)}
                onRemember={(v) => onSaveSettings({ rememberUsername: v })}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Notícias</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {news.length === 0 && <EmptyState title="Sem notícias por enquanto" />}
          {news.map((n) => (
            <article key={n.id} className="rounded-xl border border-line bg-night-deep/50 p-3">
              <div className="mb-1 flex items-center gap-2">
                {n.tag && <Badge tone="sun">{n.tag}</Badge>}
                {n.date && <span className="text-xs text-muted">{new Date(n.date).toLocaleDateString("pt-BR")}</span>}
              </div>
              <h4 className="font-display text-lg leading-tight">{n.title}</h4>
              {n.body && <p className="mt-1 text-sm text-muted selectable">{n.body}</p>}
              {n.url && (
                <button className="mt-1 text-sm text-sky hover:underline" onClick={() => window.launcher.openExternal(n.url!)}>
                  Ler mais
                </button>
              )}
            </article>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function ServerCard({ server, active, disabled, onSelect }: { server: ServerEntry; active: boolean; disabled: boolean; onSelect: () => void }) {
  const label = server.status === "online" ? "Online" : server.status === "maintenance" ? "Manutenção" : "Offline";
  return (
    <button
      onClick={onSelect}
      disabled={disabled && !active}
      className={cn(
        "flex flex-col gap-1 rounded-xl border-2 p-3 text-left transition-colors disabled:opacity-40",
        active ? "border-sun bg-sun/10" : "border-line bg-night-deep/50 hover:border-muted",
      )}
    >
      <div className="flex items-center gap-2">
        <StatusDot online={server.status === "online"} />
        <span className="font-display text-lg">{server.name}</span>
        {server.recommended && <Badge tone="mint">Recomendado</Badge>}
      </div>
      <div className="flex items-center gap-3 text-xs text-muted">
        <span>{label}</span>
        {typeof server.players === "number" && (
          <span className="flex items-center gap-1">
            <Users className="size-3" /> {server.players}
          </span>
        )}
        {server.description && <span className="truncate">{server.description}</span>}
      </div>
    </button>
  );
}

function LoginForm({
  server,
  settings,
  disabled,
  onLogged,
  onRemember,
}: {
  server?: ServerEntry;
  settings: Settings;
  disabled: boolean;
  onLogged: (s: PlaySession) => void;
  onRemember: (v: boolean) => void;
}) {
  const [username, setUsername] = useState(settings.lastUsername);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!server) return;
    setBusy(true);
    setError(undefined);
    const r = await window.launcher.login({ serverId: server.id, username, password });
    setBusy(false);
    setPassword("");
    if (r.ok && r.session) onLogged(r.session);
    else setError(r.error ?? "Falha no login.");
  };

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <Field label="Usuário" htmlFor="u">
        <Input id="u" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} disabled={disabled || busy} autoFocus />
      </Field>
      <Field label="Senha" htmlFor="p">
        <Input id="p" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={disabled || busy} />
      </Field>
      <Button type="submit" size="lg" disabled={disabled || busy || !username || !password}>
        {busy ? <Spinner /> : null} Entrar
      </Button>
      <label className="flex items-center gap-2 text-sm text-muted sm:col-span-3">
        <input type="checkbox" checked={settings.rememberUsername} onChange={(e) => onRemember(e.target.checked)} className="accent-sun" />
        Lembrar meu usuário
      </label>
      {error && (
        <p role="alert" className="text-sm font-medium text-coral sm:col-span-3">
          {error}
        </p>
      )}
    </form>
  );
}

function PlayPanel({ session, server, game, blocked, onLogout }: { session: PlaySession; server?: ServerEntry; game: GameState; blocked: boolean; onLogout: () => void }) {
  const running = game.state === "running";
  const preparing = game.state === "preparing";
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-muted">Logado como</div>
          <div className="font-display text-2xl">{session.username}</div>
          <div className="text-sm text-muted">{server?.name}</div>
        </div>
        <Button variant="ghost" size="sm" disabled={running || preparing} onClick={() => void window.launcher.logout().then(onLogout)}>
          <LogOut /> Sair
        </Button>
      </div>

      {preparing && (
        <PowerGauge value={game.progress ?? 0.05} label={game.message} readout={game.progress !== undefined ? `${Math.round(game.progress * 100)}%` : "…"} />
      )}
      {game.state === "error" && <p className="rounded-xl border border-coral/40 bg-coral/10 p-3 text-sm text-coral selectable">{game.message}</p>}
      {game.state === "exited" && game.code !== 0 && game.code !== null && (
        <p className="text-sm text-muted">O jogo fechou com código {game.code}. Veja a aba Logs se isso não era esperado.</p>
      )}

      {running ? (
        <Button size="xl" variant="danger" onClick={() => window.launcher.stopGame()}>
          <Square /> Fechar jogo
        </Button>
      ) : (
        <Button size="xl" disabled={preparing || blocked} onClick={() => window.launcher.play()}>
          {preparing ? <Spinner /> : <Play />} JOGAR
        </Button>
      )}
      {running && <p className="text-center text-sm text-muted">Jogo aberto ({game.runtime === "projector" ? "Flash Player" : "Ruffle"}). Bom jogo!</p>}
    </div>
  );
}
