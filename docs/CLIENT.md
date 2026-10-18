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

### Textos estáticos em turco dentro dos SWF (DefineText/DefineEditText) — não passam pelo `language.txt`
Além do `language.txt`, o pack 6600 tem texto turco embutido direto como `DefineText`/`DefineEditText`
nos próprios SWFs (telas de regra/ajuda de evento, rótulos soltos, categorias da bolsa, diálogo de
tutorial…) — mesmo mecanismo do 4.1 (`research/i18n/swf-text-pt.json`, ver `docs/I18N-AUDIT.md`), reaproveitado
pro 6600 com `runSwfTextStepFor` (núcleo comum extraído de `runSwfTextStep` em `tools/i18n/build-client-art.mjs`):
- `tools/qa/swf-text-audit-6600.sh` — exporta o texto (FFDec `-export text`) de todo SWF servido (overlay
  primeiro, senão vendor) em `ui/turkey/swf/*.swf` + SWFs da raiz do pack, filtra por diacrítico turco
  (ş/ç/ğ/ı/ö/ü) OU palavra turca comum sem diacrítico (lista fixa no script), grava
  `research/i18n/swf-texts-6600/<swf>/<charId>.txt` + `research/i18n/swf-text-tr.tsv`.
- `tools/qa/swf-text-seed-6600.mjs` — lê o `.tsv` + os `.txt` exportados e monta o esqueleto
  `research/i18n/swf-text-pt-6600.json` (`{ "<swf>": { "<charId>": { tr: [registros], pt: ["", ...] } } }`,
  mesmo formato do `swf-text-pt.json` do 4.1 trocando a chave `vi` por `tr`); não sobrescreve `pt` já
  preenchido (seguro rodar de novo depois de editar à mão).
- Tradução: preenche `pt` em `research/i18n/swf-text-pt-6600.json` (mesmo nº de registros que `tr`).
- Aplicar: `node tools/i18n/build-client-art.mjs --only-swf-text-6600` (ou `pnpm swftext:6600`) — patcheia
  `apps/api/assets/flash6600/...` (overlay existente tem prioridade sobre o vendor, ex. `ui/turkey/swf/loading.swf`
  já patchado pelo `brand-6600.mjs`), com o mesmo `-replace` nativo formatado + retry + troca de fonte
  (`swf-font-rename.mjs`) do 4.1. Não toca no pack 4.1 (`research/i18n/swf-text-pt.json`/`apps/api/assets/flash`
  continuam no fluxo `runSwfTextStep()`/`pnpm client:art` de sempre).
- Resultado da primeira leva (2026-10-18): **564 registros turcos** encontrados em **69 SWFs** (2 já estavam em
  PT-BR no próprio vendor — `dice.swf` chid 427 e `newchickenbox.swf` chid 113, sobra de outro template,
  ficaram intocados); **562 traduzidos**, aplicados em **67 SWFs** com `-replace`, **67/67 verificados** depois
  de 2 ajustes manuais pontuais (ver abaixo). `-dumpSWF` ok nos 67.
  - `guildmemberweek.swf` chid 21 (regra de aposta de contribuição semanal): `ValueTooLargeException` do FFDec
    (`UI8` de índice de glifo da fonte embutida passa de 255 com o texto PT) tanto no lote quanto na reaplicação
    registro a registro — reverteu pro turco original automaticamente (sem corrupção). Único texto que ficou em
    turco; se quiser insistir, precisa de uma fonte do sistema com o nome certo pra virar vetor em vez de reusar
    os glifos do turco (mesmo caso dos 5 SWFs do 4.1 com fonte "UVN Van").
  - `labyrinth.swf` chid 51: a exportação "formatted" desse campo só tem 1 bloco de posição real (um "run"),
    mas o `.txt` simples (`-export text`) separa o turco em 3 "registros" (`RECORDSEPARATOR`) — o código junta
    os `pt` extras no último run com espaço, só que aqui ficou sem espaço (bug latente do `runSwfTextStepFor`:
    no caminho de retry em lote, `cur` avança pro resultado mesmo quando a verificação falha). Corrigido à mão
    (`ffdec -replace` com o texto já junto, 1 registro) + `research/i18n/swf-text-pt-6600.json` atualizado pra
    não regredir num rerun.
  - Rerodar: `node tools/i18n/build-client-art.mjs --only-swf-text-6600`.

### Marca da tela de boot/loading 6600 (logo "Bombom", "DEVELOP BY ASUNA")
O boot do 6600 (antes do `language.txt` carregar) tinha a marca do servidor turco de origem — logo "Bombom"
(com molde de barra de progresso) e a legenda solta "DEVELOP BY ASUNA". `tools/remaster/brand-6600.mjs`
troca pela logo DDTank Reborn (`apps/web/public/play/logo.webp`), escrevendo em
`apps/api/assets/flash6600/<mesmo caminho relativo ao pack>`:
- `Loading.swf` (chid 26), `DDT_Loading.swf` (chid 42), `DDT_Loading1.swf` (chid 42) — a imagem inteira é só
  "logo + moldura da barra de progresso" (fundo transparente); o script corta no y certo, troca só a logo
  (contain, centralizada) e preserva a moldura decorativa de baixo intacta. Texto "Yükleniyor" (chid 18/31 em
  Loading.swf; chid 18/47 nos DDT_Loading*) → "Carregando" via `ffdec -replace` nativo (fonte embutida já se
  chama "Arial", então o FFDec acha glifo que falta sem precisar do truque de `swf-font-rename.mjs`).
- `ui/turkey/swf/loading.swf` (tela "Bombom II" com os personagens de Natal, chid 18 = moldura/janela 533x515,
  chid 34 = cena cheia 1000x600): aqui a logo está pintada dentro da arte (sem transparência atrás), não dá
  pra só recortar — o script achata a imagem contra uma cor aproximada do fundo local, borra forte pra apagar
  as letras, recorta só a área do logo com máscara de cantos suaves **E** multiplicada pelo alfa original (pra
  não virar um retângulo opaco onde a arte era transparente — moldura arredondada/arco), e põe a logo nova por
  cima menor que a área (sobra uma margem borrada ao redor). Texto desse arquivo já estava em chinês
  ("正在加载"), não turco — fora do escopo (a tarefa só pede tradução de texto turco tipo "Yükleniyor").
  SWF final fica bem maior que o vendor (~249KB → ~2MB: as duas imagens 533x515/1000x600 viram PNG sem perda
  dentro do tag `DefineBitsJPEG3`, que é o que o FFDec CLI faz quando a entrada tem canal alfa mesmo pedindo
  formato `jpeg3` — testado, sem ganho de tamanho real). Aceitável pra uma tela de loading secundária.
- `smallNote.txt` — fica em `WebSimple/` (**um nível acima** do pack `Flash_6600_v040`, igual
  `md5.xml`/`characterDefine.xml`; ver fallback `top` na rota `/flash6600/*` em
  `apps/api/src/routes/static.ts`), não dentro do pack. Conteúdo é só `DEVELOP BY ASUNA`, carregado via
  `URLLoader` por algum SWF de boot e mostrado como legenda solta (não é um `DefineText` de nenhum SWF
  testado). O overlay (`apps/api/assets/flash6600/smallNote.txt`) é resolvido *antes* desse fallback pro
  vendor, então basta um arquivo vazio pra sumir com o crédito.
- Checados e sem marca, não precisam de patch: `22.swf` (só ABC/código do jogo, 0 imagens), `22.png` (apesar
  do mesmo tamanho de `22.swf`, os bytes são completamente diferentes e não abre como SWF — provavelmente
  lixo/binário não usado pelo boot; não mexe, risco > benefício), `1.png` (launcher de criação de personagem,
  sem Bombom/ASUNA), `ui/turkey/swf/firstcore.swf` (ícones de UI do hall — VIP, botões, tooltips — sem logo),
  `newhandopencartoon.swf` (diálogo do tutorial em turco, é história do jogo — piratas/tesouro —, não marca
  do servidor, fora do escopo deste patch; tradução geral do cliente 6600 segue outra frente, não esta).
- Rerodar: `node tools/remaster/brand-6600.mjs` (opção `--sheet` gera o contact-sheet antes/depois em
  `research/6600/brand-review.jpg`, olhe antes de confiar — a cena 1000x600 em particular é um remendo
  borrado, não um recorte limpo). Precisa de `vendor/` linkado e `tools/remaster/node_modules` instalado
  (`sharp`) + `vendor/_tools/ffdec/ffdec-cli.jar` (Java). Idempotente: sempre reconstrói a partir do vendor
  original, nunca de uma cópia já patchada.
