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
