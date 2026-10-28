# Textos e traduções (PT-BR)

Existem **3 sistemas de texto** diferentes no jogo — não confunda qual editar.

**Como verificado**: lido/confirmado contra `packages/db/src/translations.ts`,
`apps/admin/src/resources/system.tsx`, `packages/db/scripts/export-texts.ts`,
`docs/CLIENT.md`. Não editado um texto ao vivo nesta tarefa.

## 1. Strings de UI do servidor (`language.txt` → `ctx.lang.t()`)

Textos que o SERVIDOR manda (mensagens de sistema, erros, falas de NPC em script PvE).
Arquivo `key:value` (`apps/game/data/Language-vn.txt`), carregado por `LanguageMgr`
(`apps/game/src/util/lang.ts`) — ver [`03-api-referencia.md`](../03-api-referencia.md) pra
API de `t()`.

**Editar**: Admin → **Textos e traduções** (`apps/admin/src/resources/system.tsx`) → busca
por chave ou texto, edita o campo **Português (BR)** por linha. Mudança é lida pelo próximo
`t()` chamado (sem precisar reiniciar — confirme se o cache do `apps/game` recarrega o
arquivo ou só na inicialização; se não recarregar sozinho, use **Recarregar templates**).

## 2. Overlay de tradução de tabela (`Translations`, colunas do schema `game`)

Textos que vêm de LINHA de tabela (nome/descrição de item, mapa, NPC, missão...) — o
original está em vietnamita/chinês; a tradução PT-BR fica numa tabela SEPARADA
(`app."Translations"`, `packages/db/src/schema/app.ts`), nunca sobrescrevendo a linha
original. Aplicado em memória na hora de ler (`loadTranslations`/`applyTranslations`,
`packages/db/src/translations.ts`):

```ts
const rows = await db.select().from(game.Game_Map);
const overlay = await loadTranslations(db, "Game_Map", cfg.DEFAULT_LANG);
return rows.map((r) => applyTranslations(r, "ID", overlay));
```

- **Linha sem tradução**: cai no valor original sem erro (nunca quebra, mesma garantia de
  `LanguageMgr.t()`).
- **Gerar o lote de textos pra traduzir**: `pnpm --filter @ddt/db exec tsx scripts/
  export-texts.ts [Tabela.Coluna ...]` (sem args = lista padrão: `Game_Map`, `Pve_Info`,
  `Mission_Info`, `Achievement`, `NPC_Info`, `Quest`, `Shop_Goods`, `Pet_Template_Info`,
  `Pet_Skill_Info`...) — exporta de `packages/db/seed/game/<Tabela>.json.gz` pra
  `data/i18n/_work/db/<tabela>.<coluna>.jsonl` (um `{rowId, text}` por linha).
- **Importar depois de traduzido**: `pnpm --filter @ddt/db exec tsx scripts/
  import-translations.ts` — grava em `app."Translations"`.
- **Editar uma tradução pontual**: direto na tabela `Translations` via
  `drizzle-kit studio` (chave `table`+`column`+`rowId`+`lang`) — mais rápido que rodar o
  pipeline inteiro pra 1 linha.

## 3. Texto desenhado DENTRO de uma imagem ("image text")

Banners, títulos de evento e algumas telas antigas têm o texto **pintado no PNG**
(não é `TextField`) — mudar isso não é editar string, é reprocessar a imagem.

- Pipeline de remaster de arte (image-to-image, mantém silhueta/pivô/frames):
  `tools/remaster/` — inventário e método em `tools/remaster/README.md`.
- Pipeline de texto PT-BR dentro de imagem: `tools/i18n/`
  (`build-client-art.mjs` é o orquestrador único — roda os passos de OCR/inpaint/redesenho
  de texto na ordem certa). Pra uma janela com VÁRIOS blocos de texto, a abordagem usada no
  projeto é inpaint local (remove o texto original) + reconstrução via blocos SVG
  estilizados sobre a imagem (não reescrever a imagem inteira com IA) — mais previsível e
  mais fácil de corrigir manualmente depois.
- Pra trocar só UMA imagem com texto (sem rodar o pipeline completo): trate como
  [trocar-icone-imagem.md](./trocar-icone-imagem.md) — edite o PNG final (já com o texto
  PT-BR desenhado) e substitua mantendo o nome.

## Qual sistema usar pra cada caso

| Você quer mudar... | Sistema |
|---|---|
| Mensagem de erro/sucesso do servidor | `language.txt` (§1) |
| Nome/descrição de um item/mapa/missão | `Translations` (§2) |
| Texto pintado num banner/imagem de evento | Image text (§3) |
| Texto de um botão/label da interface (SWF exportado) | Não é nenhum dos 3 — é
  layout/XML do componente (`apps/api/assets/flash/ui/.../xml/`) ou texto fixo no AS3
  original (`tools/as3-to-ts/i18n/strings.pt-BR.json`, tradução por literal exato na
  geração — ver [`docs/client-pixi/TRANSPILADOR.md`](../../client-pixi/TRANSPILADOR.md)). |
