import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Button, Dialog, DialogContent, Input, NativeSelect, Spinner, Switch, Textarea, cn } from "@ddtank/ui";
import { ImageUp, Plus, Search, X } from "lucide-react";
import { toast } from "sonner";
import { uploadFile } from "@/lib/api";
import { formataAtributosItem, getItemCached, searchItensPorNome, type ItemResumo } from "@/resources/items";
import { useI18n, useText } from "@/i18n";
import type { FieldDef, FieldOption } from "./types";

interface Props {
  field: FieldDef;
  id: string;
  value: unknown;
  onChange: (v: unknown) => void;
  onBlur?: () => void;
  invalid?: boolean;
  mode: "create" | "edit";
}

function TagsInput({ id, value, onChange, invalid, placeholder }: { id: string; value: string[]; onChange: (v: string[]) => void; invalid?: boolean; placeholder?: string }) {
  const [draft, setDraft] = useState("");
  const commit = () => {
    const parts = draft.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
    if (parts.length) onChange([...value, ...parts.filter((p) => !value.includes(p))]);
    setDraft("");
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit();
    } else if (e.key === "Backspace" && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  };
  return (
    <div
      className={cn(
        "flex min-h-10 flex-wrap items-center gap-1.5 rounded-xl border-2 border-line bg-night-deep/60 px-2 py-1.5 focus-within:border-sun",
        invalid && "border-coral",
      )}
    >
      {value.map((tag) => (
        <span key={tag} className="inline-flex items-center gap-1 rounded-lg bg-panel-2 px-2 py-0.5 font-mono text-xs">
          {tag}
          <button type="button" aria-label={`Remover ${tag}`} onClick={() => onChange(value.filter((t) => t !== tag))}>
            <X className="size-3" />
          </button>
        </span>
      ))}
      <input
        id={id}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKey}
        onBlur={commit}
        placeholder={value.length ? "" : placeholder}
        className="min-w-24 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-muted/60"
      />
    </div>
  );
}

function ImageInput({ id, value, onChange, folder, invalid }: { id: string; value: string; onChange: (v: string) => void; folder?: string; invalid?: boolean }) {
  const { t } = useI18n();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const res = await uploadFile(file, folder);
      onChange(res.url);
    } catch {
      toast.error(t("field.uploadError"));
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };
  return (
    <div className="flex items-center gap-3">
      <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl border-2 border-line bg-night-deep">
        {value ? <img src={value} alt="" className="size-full object-contain" /> : <ImageUp className="size-6 text-muted" />}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://…" aria-invalid={invalid} />
        <div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => void onFile(e.target.files?.[0])} />
          <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={() => fileRef.current?.click()}>
            {busy ? <Spinner className="size-4" /> : <ImageUp />} {busy ? t("field.uploading") : t("field.upload")}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Ícone pequeno (ou placeholder `#`) de um `ItemResumo`, usado no campo fechado, na lista do popup e nos chips. */
function ItemIcon({ item, className }: { item: ItemResumo; className?: string }) {
  return item.iconUrl ? (
    <img
      src={item.iconUrl}
      alt=""
      loading="lazy"
      onError={(e) => {
        e.currentTarget.style.display = "none";
      }}
      className={cn("shrink-0 rounded-lg border-2 border-line bg-night-deep object-contain", className)}
    />
  ) : (
    <span className={cn("grid shrink-0 place-items-center rounded-lg border-2 border-line bg-night-deep font-mono text-muted", className)}>#</span>
  );
}

/**
 * Busca com debounce p/ o popup de item (compartilhada pelo picker simples e o múltiplo).
 * Como lê esse código (cada variável):
 * - `aberto`: só busca enquanto o popup está visível.
 * - `categoryIds`: filtro opcional por categoria (ex. picker de arma).
 * - `busca`/`setBusca`: texto digitado; `lista`: resultados; `carregando`: spinner.
 */
function useItemBusca(aberto: boolean, categoryIds?: number[]) {
  const [busca, setBusca] = useState("");
  const [lista, setLista] = useState<ItemResumo[]>([]);
  const [carregando, setCarregando] = useState(false);
  const cats = categoryIds?.join(",");
  useEffect(() => {
    if (!aberto) return;
    const timer = setTimeout(() => {
      setCarregando(true);
      void searchItensPorNome(busca, 20, categoryIds)
        .then(setLista)
        .finally(() => setCarregando(false));
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca, aberto, cats]);
  useEffect(() => {
    if (!aberto) {
      setBusca("");
      setLista([]);
    }
  }, [aberto]);
  return { busca, setBusca, lista, carregando };
}

/**
 * Popup de busca de item (ícone+nome+atributos), com botões rápidos p/ valores sentinela (`special`, ex. "Moedas
 * grátis" sem item real). Reaproveitado pelo picker simples e pelo múltiplo.
 */
function ItemSearchDialog({
  id,
  open,
  onOpenChange,
  onPick,
  categoryIds,
  special,
}: {
  id: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onPick: (item: ItemResumo) => void;
  categoryIds?: number[];
  special?: FieldOption[];
}) {
  const text = useText();
  const { busca, setBusca, lista, carregando } = useItemBusca(open, categoryIds);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Selecionar item" description="Busque por nome e escolha na lista.">
        {!!special?.length && (
          <div className="mb-3 flex flex-wrap gap-2">
            {special.map((o) => (
              <Button
                key={String(o.value)}
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => onPick({ TemplateID: Number(o.value), Name: text(o.label) })}
              >
                {text(o.label)}
              </Button>
            ))}
          </div>
        )}
        <Input id={`${id}-busca`} value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Ex.: Bazuca…" autoFocus />
        <div className="mt-3 flex max-h-72 flex-col gap-1 overflow-y-auto">
          {carregando ? (
            <div className="grid place-items-center py-8">
              <Spinner className="size-6" />
            </div>
          ) : lista.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">{busca.trim() ? "Nenhum item encontrado." : "Digite o nome do item."}</p>
          ) : (
            lista.map((item) => (
              <button
                key={item.TemplateID}
                type="button"
                onClick={() => onPick(item)}
                className="flex items-center gap-2 rounded-xl border-2 border-line bg-night-deep/60 px-3 py-2 text-left hover:border-sun"
              >
                <ItemIcon item={item} className="size-10" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-ink">{item.Name}</span>
                  <span className="block truncate font-mono text-xs text-muted">{formataAtributosItem(item)}</span>
                </span>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Picker de item (um só): busca por nome, exibe ícone+nome+atributos, popup no tema.
 * Como lê esse código (cada variável):
 * - `value`: `TemplateID` atual (ou `null` vazio).
 * - `atual`: resumo exibido no campo fechado (inclui `iconUrl`); resolvido via `special` (sentinela) ou lookup.
 * - `aberto`: popup (`Dialog`) visível ou não.
 * - `categoryIds`/`special`: repassados do `FieldDef` (`pickerCategory`/`pickerSpecial`).
 */
function ItemPickerInput({
  id,
  value,
  onChange,
  invalid,
  disabled,
  categoryIds,
  special,
}: {
  id: string;
  value: number | null;
  onChange: (v: unknown) => void;
  invalid?: boolean;
  disabled?: boolean;
  categoryIds?: number[];
  special?: FieldOption[];
}) {
  const text = useText();
  const [aberto, setAberto] = useState(false);
  const [atual, setAtual] = useState<ItemResumo | null>(null);

  useEffect(() => {
    let vivo = true;
    if (value === null) {
      setAtual(null);
      return;
    }
    if (atual?.TemplateID === value) return;
    const hit = special?.find((o) => Number(o.value) === value);
    if (hit) {
      setAtual({ TemplateID: value, Name: text(hit.label) });
      return;
    }
    void getItemCached(value).then((item) => {
      if (vivo) setAtual(item);
    });
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const escolher = (item: ItemResumo) => {
    setAtual(item);
    onChange(item.TemplateID);
    setAberto(false);
  };

  return (
    <>
      <div className={cn("flex min-h-10 items-center gap-2 rounded-xl border-2 border-line bg-night-deep/60 px-2 py-1.5", invalid && "border-coral")}>
        <div className="min-w-0 flex-1">
          {atual ? (
            <div className="flex items-center gap-2">
              <ItemIcon item={atual} className="size-10" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-ink">{atual.Name}</p>
                <p className="truncate font-mono text-xs text-muted">{formataAtributosItem(atual)}</p>
              </div>
            </div>
          ) : (
            <span className="text-sm text-muted/60">{value ? `#${value} (não encontrado)` : "Buscar item por nome…"}</span>
          )}
        </div>
        {value !== null && (
          <button
            type="button"
            aria-label="Limpar item"
            disabled={disabled}
            onClick={() => {
              setAtual(null);
              onChange(null);
            }}
            className="rounded-lg p-1 text-muted hover:bg-panel-2 hover:text-ink"
          >
            <X className="size-4" />
          </button>
        )}
        <Button type="button" variant="secondary" size="sm" disabled={disabled} onClick={() => setAberto(true)}>
          <Search /> Buscar
        </Button>
      </div>
      <ItemSearchDialog id={id} open={aberto} onOpenChange={setAberto} onPick={escolher} categoryIds={categoryIds} special={special} />
    </>
  );
}

/**
 * Picker de vários itens (ex. equipamentos de um bot): chips com ícone+nome, "+" abre o mesmo popup de busca.
 * Como lê esse código (cada variável):
 * - `value`: lista de `TemplateID`s salvos; `itens`: resumos resolvidos (cache) p/ exibir os chips.
 * - `aberto`: popup de busca aberto; `adicionar`/`remover`: mutam `value` via `onChange`.
 */
function ItemMultiPickerInput({
  id,
  value,
  onChange,
  disabled,
  categoryIds,
}: {
  id: string;
  value: number[];
  onChange: (v: unknown) => void;
  disabled?: boolean;
  categoryIds?: number[];
}) {
  const [aberto, setAberto] = useState(false);
  const [itens, setItens] = useState<Record<number, ItemResumo | null>>({});

  useEffect(() => {
    let vivo = true;
    void Promise.all(value.map(async (tid) => [tid, await getItemCached(tid)] as const)).then((pares) => {
      if (vivo) setItens(Object.fromEntries(pares));
    });
    return () => {
      vivo = false;
    };
  }, [value]);

  const adicionar = (item: ItemResumo) => {
    if (!value.includes(item.TemplateID)) onChange([...value, item.TemplateID]);
    setAberto(false);
  };
  const remover = (tid: number) => onChange(value.filter((v) => v !== tid));

  return (
    <>
      <div id={id} className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-xl border-2 border-line bg-night-deep/60 px-2 py-1.5">
        {value.map((tid) => {
          const item = itens[tid];
          return (
            <span key={tid} className="inline-flex items-center gap-1.5 rounded-lg bg-panel-2 px-2 py-1">
              {item ? <ItemIcon item={item} className="size-6" /> : <span className="font-mono text-xs text-muted">#{tid}</span>}
              <span className="max-w-32 truncate text-xs">{item?.Name ?? `#${tid}`}</span>
              <button type="button" aria-label={`Remover item ${tid}`} disabled={disabled} onClick={() => remover(tid)}>
                <X className="size-3" />
              </button>
            </span>
          );
        })}
        <Button type="button" variant="secondary" size="sm" disabled={disabled} onClick={() => setAberto(true)}>
          <Plus /> Adicionar
        </Button>
      </div>
      <ItemSearchDialog id={id} open={aberto} onOpenChange={setAberto} onPick={adicionar} categoryIds={categoryIds} />
    </>
  );
}

/**
 * Lista de itens anexados a uma carta (correio): linha = item-picker + quantidade + validade, até 5 (limite do
 * servidor, `sendMail`/`give-item`). Guarda `{ templateId, count, validDays }[]`.
 * Como lê esse código (cada variável):
 * - `value`: linhas atuais; `atualizar(i, patch)`: mescla campos da linha `i`; `remover(i)`: tira a linha.
 */
function MailItemsInput({ id, value, onChange, disabled }: { id: string; value: { templateId?: number; count?: number; validDays?: number }[]; onChange: (v: unknown) => void; disabled?: boolean }) {
  const atualizar = (i: number, patch: Record<string, unknown>) => onChange(value.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  const remover = (i: number) => onChange(value.filter((_, idx) => idx !== i));
  const adicionarLinha = () => onChange([...value, { templateId: undefined, count: 1, validDays: 0 }]);

  return (
    <div id={id} className="flex flex-col gap-2">
      {value.map((row, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2 rounded-xl border-2 border-line bg-night-deep/40 p-2">
          <div className="min-w-56 flex-1">
            <ItemPickerInput
              id={`${id}-${i}`}
              value={typeof row.templateId === "number" ? row.templateId : null}
              onChange={(v) => atualizar(i, { templateId: v })}
              disabled={disabled}
            />
          </div>
          <Input
            type="number"
            min={1}
            value={row.count ?? 1}
            onChange={(e) => atualizar(i, { count: e.target.valueAsNumber || 1 })}
            className="w-20 font-mono"
            aria-label="Quantidade"
            disabled={disabled}
          />
          <Input
            type="number"
            min={0}
            value={row.validDays ?? 0}
            onChange={(e) => atualizar(i, { validDays: e.target.valueAsNumber || 0 })}
            className="w-24 font-mono"
            aria-label="Validade (dias)"
            disabled={disabled}
          />
          <button type="button" aria-label="Remover item" disabled={disabled} onClick={() => remover(i)} className="rounded-lg p-1.5 text-muted hover:bg-panel-2 hover:text-ink">
            <X className="size-4" />
          </button>
        </div>
      ))}
      {value.length < 5 && (
        <Button type="button" variant="secondary" size="sm" disabled={disabled} onClick={adicionarLinha}>
          <Plus /> Adicionar item (máx. 5)
        </Button>
      )}
    </div>
  );
}

export function FieldInput({ field: f, id, value, onChange, onBlur, invalid, mode }: Props) {
  const { t } = useI18n();
  const text = useText();
  const common = { id, onBlur, "aria-invalid": invalid, disabled: f.readOnly, placeholder: f.placeholder };

  if ((f.type as string) === "item-picker") {
    const templateId = typeof value === "number" && Number.isFinite(value) ? value : null;
    return <ItemPickerInput id={id} value={templateId} onChange={onChange} invalid={invalid} disabled={f.readOnly} categoryIds={f.pickerCategory} special={f.pickerSpecial} />;
  }
  if ((f.type as string) === "item-picker-multi") {
    const ids = Array.isArray(value) ? (value as unknown[]).map(Number).filter(Number.isFinite) : [];
    return <ItemMultiPickerInput id={id} value={ids} onChange={onChange} disabled={f.readOnly} categoryIds={f.pickerCategory} />;
  }
  if ((f.type as string) === "item-list") {
    const rows = Array.isArray(value) ? (value as { templateId?: number; count?: number; validDays?: number }[]) : [];
    return <MailItemsInput id={id} value={rows} onChange={onChange} disabled={f.readOnly} />;
  }

  switch (f.type) {
    case "boolean":
      return (
        <div className="flex h-10 items-center gap-3">
          <Switch id={id} checked={!!value} onCheckedChange={(c) => onChange(c)} disabled={f.readOnly} />
          <span className="text-sm text-muted">{value ? t("crud.yes") : t("crud.no")}</span>
        </div>
      );
    case "number":
      return (
        <Input
          {...common}
          type="number"
          inputMode="decimal"
          step={f.step ?? (f.int === false ? "any" : 1)}
          min={f.min}
          max={f.max}
          value={value === null || value === undefined || Number.isNaN(value) ? "" : String(value)}
          onChange={(e) => onChange(e.target.value === "" ? null : e.target.valueAsNumber)}
          className="font-mono"
        />
      );
    case "select":
      return (
        <NativeSelect {...common} value={value === null || value === undefined ? "" : String(value)} onChange={(e) => onChange(e.target.value)}>
          {!f.required && <option value="">{t("field.select")}</option>}
          {(f.options ?? []).map((o) => (
            <option key={String(o.value)} value={String(o.value)}>
              {text(o.label)}
            </option>
          ))}
        </NativeSelect>
      );
    case "textarea":
      return <Textarea {...common} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} rows={4} />;
    case "json":
      return (
        <Textarea
          {...common}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          rows={6}
          spellCheck={false}
          className="font-mono text-xs"
        />
      );
    case "tags":
      return (
        <TagsInput
          id={id}
          value={Array.isArray(value) ? (value as string[]) : []}
          onChange={onChange}
          invalid={invalid}
          placeholder={f.placeholder ?? t("field.tagsHint")}
        />
      );
    case "image":
      return <ImageInput id={id} value={String(value ?? "")} onChange={onChange} folder={f.uploadFolder} invalid={invalid} />;
    case "date":
    case "datetime":
      return (
        <Input
          {...common}
          type={f.type === "date" ? "date" : "datetime-local"}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "password":
      return (
        <Input
          {...common}
          type="password"
          autoComplete="new-password"
          placeholder={mode === "edit" ? t("field.passwordKeep") : f.placeholder}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "color":
      return (
        <div className="flex items-center gap-2">
          <input type="color" value={String(value || "#ffc531")} onChange={(e) => onChange(e.target.value)} className="h-10 w-12 rounded-lg bg-transparent" aria-label={text(f.label)} />
          <Input {...common} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} className="font-mono" />
        </div>
      );
    default:
      return <Input {...common} value={String(value ?? "")} maxLength={f.maxLength} onChange={(e) => onChange(e.target.value)} />;
  }
}
