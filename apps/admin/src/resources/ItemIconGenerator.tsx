import { useState } from "react";
import { toast } from "sonner";
import { ApiError, Badge, Button, Spinner, Textarea } from "@ddtank/ui";
import { Sparkles } from "lucide-react";
import { api } from "@/lib/api";

interface GerarResposta {
  draftKey: string;
  previewUrl: string;
  prompt: string;
}

/**
 * Botão "Gerar ícone (IA)" do editor de item: chama a Recraft via `apps/api`, mostra a prévia (rascunho em
 * `/uploads/icon-drafts/...`) e só grava no caminho real do ícone quando o admin clica "Aceitar".
 * "Regenerar" é só chamar de novo — cada chamada troca a prévia, nada é salvo até aceitar.
 * Como lê esse código (cada variável):
 * - `templateId`: item sendo editado (precisa já existir — ação só aparece no modo edição).
 * - `iconUrlAtual`: ícone hoje (overlay do vendor), mostrado antes de gerar/depois de aceitar.
 * - `prompt`: texto opcional pra substituir o prompt automático (nome/categoria/descrição do item).
 * - `rascunho`: resposta de `.../icon/generate` (prévia + `draftKey` usado no accept); `null` antes de gerar.
 * - `aceito`: true depois do accept (a prévia virou o ícone real; recarregar a página mostra o novo ícone).
 */
export function ItemIconGenerator({ templateId, iconUrlAtual }: { templateId: number; iconUrlAtual?: string }) {
  const [busy, setBusy] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [rascunho, setRascunho] = useState<GerarResposta | null>(null);
  const [aceito, setAceito] = useState(false);

  const gerar = async () => {
    setBusy(true);
    try {
      const res = await api.post<GerarResposta>(`/api/admin/items/${templateId}/icon/generate`, prompt.trim() ? { prompt: prompt.trim() } : {});
      setRascunho(res);
      setAceito(false);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Falha ao gerar ícone");
    } finally {
      setBusy(false);
    }
  };

  const aceitar = async () => {
    if (!rascunho) return;
    setBusy(true);
    try {
      await api.post(`/api/admin/items/${templateId}/icon/accept`, { draftKey: rascunho.draftKey });
      toast.success("Ícone atualizado");
      setAceito(true);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Falha ao aceitar ícone");
    } finally {
      setBusy(false);
    }
  };

  const preview = rascunho?.previewUrl ?? iconUrlAtual;

  return (
    <div className="rounded-2xl border-2 border-line p-4">
      <h3 className="mb-3 flex items-center gap-2 font-display text-lg text-sun">
        <Sparkles className="size-5" /> Ícone (IA)
        {aceito && <Badge tone="mint">Aceito</Badge>}
      </h3>
      <div className="flex flex-wrap items-start gap-4">
        <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-xl border-2 border-line bg-night-deep">
          {preview ? <img src={preview} alt="" className="size-full object-contain" /> : <span className="font-mono text-xs text-muted">#{templateId}</span>}
        </div>
        <div className="min-w-0 flex-1">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Prompt personalizado (opcional) — em branco usa nome/categoria/descrição do item"
            rows={4}
            disabled={busy}
          />
          {rascunho && <p className="mt-1 line-clamp-2 font-mono text-xs text-muted" title={rascunho.prompt}>{rascunho.prompt}</p>}
          <div className="mt-2 flex flex-wrap gap-2">
            <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={gerar}>
              {busy ? <Spinner className="size-4" /> : <Sparkles />} {rascunho ? "Regenerar" : "Gerar ícone (IA)"}
            </Button>
            {rascunho && !aceito && (
              <Button type="button" size="sm" disabled={busy} onClick={aceitar}>
                Aceitar
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
