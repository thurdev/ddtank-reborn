import { useEffect, useState } from "react";
import { CheckCircle2, Download, XCircle } from "lucide-react";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Field, Input, NativeSelect, Switch } from "@ddtank/ui";
import type { GameState, RuntimeKind, RuntimeStatus, Settings } from "../../shared/types";

const SIZES = [
  { label: "1000 × 600 (nativo, mais leve)", w: 1000, h: 600 },
  { label: "1250 × 750", w: 1250, h: 750 },
  { label: "1500 × 900", w: 1500, h: 900 },
  { label: "1800 × 1080", w: 1800, h: 1080 },
];

const RUNTIME_LABEL: Record<RuntimeKind, string> = { projector: "Flash Player 32 (projetor)", ruffle: "Ruffle (desktop)" };

export function SettingsView({ settings, game, onSave }: { settings: Settings; game: GameState; onSave: (p: Partial<Settings>) => Promise<void> }) {
  const [runtimes, setRuntimes] = useState<RuntimeStatus[]>([]);
  const [installing, setInstalling] = useState<RuntimeKind>();
  const [error, setError] = useState<string>();
  const sizeKey = SIZES.find((s) => s.w === settings.width && s.h === settings.height) ? `${settings.width}x${settings.height}` : "custom";

  useEffect(() => {
    void window.launcher.getRuntimeStatus().then(setRuntimes);
  }, []);

  const install = async (k: RuntimeKind) => {
    setInstalling(k);
    setError(undefined);
    try {
      await window.launcher.installRuntime(k);
    } catch (e) {
      setError((e as Error).message.replace(/^Error invoking remote method '[^']+': (Error: )?/, ""));
    } finally {
      setInstalling(undefined);
      setRuntimes(await window.launcher.getRuntimeStatus());
    }
  };

  const ruffle = settings.runtime === "ruffle";

  return (
    <div className="grid max-w-4xl gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Runtime do jogo</CardTitle>
          <CardDescription>
            O cliente original é Flash. O launcher abre o jogo em um runtime separado: o projetor do Flash Player 32 (fidelidade máxima) ou o Ruffle
            (emulador open source, aceleração por GPU, ainda incompleto para o DDTank).
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Field label="Usar">
            <NativeSelect value={settings.runtime} onChange={(e) => onSave({ runtime: e.target.value as Settings["runtime"] })}>
              <option value="auto">Automático (recomendado pelo servidor)</option>
              <option value="projector">{RUNTIME_LABEL.projector}</option>
              <option value="ruffle">{RUNTIME_LABEL.ruffle}</option>
            </NativeSelect>
          </Field>
          <div className="grid gap-2">
            {runtimes.map((r) => (
              <div key={r.kind} className="flex items-center gap-3 rounded-xl border border-line bg-night-deep/50 p-3">
                {r.installed ? <CheckCircle2 className="size-5 text-mint" /> : <XCircle className="size-5 text-muted" />}
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{RUNTIME_LABEL[r.kind]}</div>
                  <div className="truncate text-xs text-muted selectable" title={r.path}>
                    {r.installed ? `${originLabel(r.origin)} · ${r.path}` : r.downloadable ? "Será baixado automaticamente ao jogar." : "Indisponível (sem URL configurada)."}
                  </div>
                </div>
                {!r.installed && r.downloadable && (
                  <Button size="sm" variant="secondary" disabled={!!installing || game.state === "running"} onClick={() => install(r.kind)}>
                    <Download /> {installing === r.kind ? "Baixando…" : "Baixar"}
                  </Button>
                )}
              </div>
            ))}
          </div>
          {game.state === "preparing" && installing && <p className="text-sm text-muted">{game.message}</p>}
          {error && <p className="text-sm text-coral selectable">{error}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vídeo e desempenho</CardTitle>
          <CardDescription>
            O Flash desenha tudo na CPU: quanto maior a janela, mais pesado. Para menos lag use qualidade Média/Baixa e o tamanho nativo 1000×600.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Qualidade" hint="Baixa desliga o antialiasing (mais FPS). Alta/Melhor = mais bonito, mais CPU.">
            <NativeSelect value={settings.quality} onChange={(e) => onSave({ quality: e.target.value as Settings["quality"] })}>
              <option value="low">Baixa (mais rápido)</option>
              <option value="medium">Média (recomendado)</option>
              <option value="high">Alta</option>
              <option value="best">Melhor{ruffle ? "" : " (= Alta no Flash Player)"}</option>
            </NativeSelect>
          </Field>
          <Field label="Tamanho da janela">
            <NativeSelect
              value={sizeKey}
              onChange={(e) => {
                const s = SIZES.find((x) => `${x.w}x${x.h}` === e.target.value);
                if (s) void onSave({ width: s.w, height: s.h });
              }}
            >
              {SIZES.map((s) => (
                <option key={s.label} value={`${s.w}x${s.h}`}>
                  {s.label}
                </option>
              ))}
              {sizeKey === "custom" && <option value="custom">Personalizado</option>}
            </NativeSelect>
          </Field>
          <Field label="Largura" htmlFor="w">
            <Input id="w" key={`w${settings.width}`} type="number" min={640} defaultValue={settings.width} onBlur={(e) => onSave({ width: Number(e.target.value) })} />
          </Field>
          <Field label="Altura" htmlFor="h">
            <Input id="h" key={`h${settings.height}`} type="number" min={384} defaultValue={settings.height} onBlur={(e) => onSave({ height: Number(e.target.value) })} />
          </Field>
          <Toggle label="Tela cheia ao abrir" hint="No jogo, Ctrl+F (Flash) ou F11 (Ruffle) também alterna." checked={settings.fullscreen} onChange={(v) => onSave({ fullscreen: v })} />
          <Toggle
            label="Esconder menu do Flash Player"
            hint="Remove a barra Arquivo/Exibir da janela do jogo."
            checked={settings.hideProjectorMenu}
            onChange={(v) => onSave({ hideProjectorMenu: v })}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ruffle (avançado)</CardTitle>
          <CardDescription>Só vale quando o runtime é Ruffle. DirectX 12 / Vulkan usam a placa de vídeo.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Renderizador">
            <NativeSelect value={settings.ruffleGraphics} onChange={(e) => onSave({ ruffleGraphics: e.target.value as Settings["ruffleGraphics"] })}>
              <option value="default">Automático</option>
              <option value="dx12">DirectX 12</option>
              <option value="vulkan">Vulkan</option>
              <option value="gl">OpenGL</option>
            </NativeSelect>
          </Field>
          <Toggle label="Usar GPU dedicada" hint="Notebooks com duas placas de vídeo." checked={settings.highPerformanceGpu} onChange={(v) => onSave({ highPerformanceGpu: v })} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Launcher</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Ao abrir o jogo">
            <NativeSelect value={settings.launcherOnPlay} onChange={(e) => onSave({ launcherOnPlay: e.target.value as Settings["launcherOnPlay"] })}>
              <option value="minimize">Minimizar o launcher</option>
              <option value="hide">Esconder o launcher</option>
              <option value="keep">Manter aberto</option>
            </NativeSelect>
          </Field>
          <Toggle label="Lembrar usuário" checked={settings.rememberUsername} onChange={(v) => onSave({ rememberUsername: v })} />
        </CardContent>
      </Card>
      <p className="text-xs text-muted">
        Mudanças valem a partir do próximo “Jogar”. <Badge tone="neutral">A senha nunca é salva.</Badge>
      </p>
    </div>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start justify-between gap-4 rounded-xl border border-line bg-night-deep/40 p-3">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

function originLabel(o?: RuntimeStatus["origin"]) {
  return o === "bundled" ? "Incluído no instalador" : o === "configured" ? "Caminho configurado" : "Baixado";
}
