# Cliente + assets — Flash original, Ruffle, launcher, remaster

O cliente é FIXO (AS3 compilado). Servidor se adapta a ele, nunca o contrário.
Specs: `research/client/01-client-map.md`, `02-ruffle-report.md`.

## Execução
| Modo | Código | Doc |
|---|---|---|
| Navegador (Ruffle) | `apps/client-harness/public/ruffle/`, página Jogar em `apps/web` | [client-harness](../apps/client-harness/README.md) |
| Desktop (launcher) | `apps/launcher/` (Flash projector / Ruffle desktop) | [launcher](../apps/launcher/README.md) |
| Desenhos launcher | `research/launcher/00-existing.md`, `01-design.md` | — |

## Assets
- Originais servidos em `apps/api/assets/` (flash, request XML). Não edita SWF na mão.
- Overlay do admin tem prioridade sobre o pack (custom sem tocar no original).
- Extração SWF → spritesheets: JPEXS FFDec (ver `research/assets/00-assets.md`, `map-check.md`).

## Remaster IA + PT-BR
- Pipeline: `tools/remaster/` — image-to-image sobre o original (mesma silhueta/pivô/frames).
  Inventário e método: `remaster/README.md`, `remaster/00-site-pagina-jogar/LEIA.md`.
- Texto PT-BR: `tools/i18n/` (`build-client-art.mjs` é o orquestrador único).
  Status: `docs/I18N-AUDIT.md`, `research/i18n/` (inventários e lotes).
- Decisão 2026-10-03: lote antigo de imagens descartado (feio/quebrou botões);
  jogo usa arte original + só traduções de TEXTO até o remaster IA com crédito.

## i18n do cliente DDT-6600 (`/flash6600`, M1 da migração)
O pack 6600 (`vendor/DDT-6600/WebSimple/Flash_6600_v040/ui/turkey/`) é turco (`LANGUAGE="turkey"` no
`config.xml`, carrega `ui/turkey/language.png` — um zip de 1 entrada `language.txt`). Pipeline PT-BR:
- `tools/i18n/lang-6600.mjs` — lê o turco original, resolve cada chave por (a) nossa tradução PT-BR da
  4.1 (`data/i18n/pt-BR/client-language.txt`) se a chave existir lá, senão (b) `data/i18n/pt-BR/
  lang-6600-extra.json` (traduções só do 6600 — **tem prioridade sobre (a)** quando a chave existe nos
  dois, pra corrigir sentido diferente entre versões), senão (c) mantém a linha turca e lista como
  pendente. Escreve `data/i18n/pt-BR/client-language-6600.txt` + o zip servido
  `apps/api/assets/flash6600/ui/turkey/language.png` (overlay lido por `apps/api/src/routes/static.ts`).
  O parser replica `ddt/data/analyze/LanguageAnalyzer.as` (Source Flash) byte a byte — ver comentário no
  topo do arquivo antes de tocar no formato (o .txt turco tem linhas de continuação quebradas que o
  parser real descarta; preservamos verbatim pra manter contagem/ordem de linha == original).
  `node tools/i18n/lang-6600.mjs --dry` só reporta contagens + grava `research/i18n/
  lang-6600-untranslated-pairs.json` (chave → turco) sem escrever nada.
- `tools/i18n/mt-6600.mjs` — tradução em massa turco→PT-BR (Google gtx + MyMemory, cache em
  `data/i18n/cache/tr-pt-BR.json`) do que `lang-6600.mjs --dry` listou como pendente, grava em
  `lang-6600-extra.json` (nunca sobrescreve entrada já presente, a menos que `--force`). **Atenção:** os
  dois provedores gratuitos bloqueiam sob uso sustentado (Google gtx devolve a página "Sorry..." 429,
  MyMemory devolve "ALL AVAILABLE FREE TRANSLATIONS FOR TODAY" — cota diária por IP); quando isso
  acontecer, tente de novo mais tarde ou traduza à mão/via LLM com o fluxo abaixo.
- `tools/i18n/llm-chunks-6600.mjs split|build` — fallback pra tradução manual/LLM quando o MT grátis está
  bloqueado (foi o caminho usado na primeira leva completa, 3050 valores distintos): `split [tamanho=200]`
  gera `data/i18n/_work/llm6600/in-NNN.json` ({i, tr}) com todo valor turco ainda sem tradução; traduza
  cada lote (à mão ou com um LLM) pra `out-NNN.json` ({"<i>": "texto pt"}) no mesmo diretório; `build` funde
  tudo em `lang-6600-extra.json` (idem, não sobrescreve entrada já presente a menos que `--force`). Os
  `in-NNN.json`/`out-NNN.json` ficam versionados (mesmo padrão de `data/i18n/_work/llm/` do pipeline de
  banco) — servem de trilha de auditoria de quem traduziu o quê.
- `tools/i18n/fix-6600-terms.mjs --apply` — normaliza terminologia (Sociedade/guilda — troca sindicato/
  aliança/união/unidade/tropas por "sociedade" só nas chaves do domínio `consorti*`/`club.*`, e corrige a
  concordância de artigo que a troca de palavra deixa errada, ex. "do sociedade"→"da sociedade"), marca
  "Bombom"→"DDTank", aspas órfãs (sobra das linhas multi-linha turco quebradas) e reporta chaves cuja
  tradução saiu idêntica ao turco original (heurística de "ainda não traduzido" — na leva completa deu só
  número/código/placeholder puro, nada de texto real).
- Regerar tudo: `pnpm lang:6600` (ou `--dry` pra só ver as contagens antes de gravar). Depois de editar
  `lang-6600-extra.json` à mão, roda de novo pra reconstruir o `.txt` + o zip servido.
