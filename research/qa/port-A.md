# Bloco A — Ferreiro avançado (status final, 2026-10-09)

Continuação de um agente anterior + outra IA (que já tinha corrigido `ItemInfo.isValidLatentEnergy`
e criado `test/latent-energy.test.ts`). Ao assumir o bloco, `handlers/forge-extra.ts`,
`db/gemstone.ts` e a reescrita de `handlers/forge.ts` (slots nomeados, `forgeAutoArrange`,
hook de auto-split) já estavam escritos e registrados em `handlers/index.ts`. Este arquivo
documenta o estado encontrado/verificado, não um porte do zero.

Verificação feita nesta sessão: `npx tsc --noEmit -p apps/game` limpo; suite completa
`apps/game` (vitest run) → **29 arquivos / 199 testes, todos verdes**, incluindo os 6 arquivos
específicos da forja (`forge-advanced`, `forge-autoarrange`, `forge-autosplit-live`,
`forge-persist`, `fusion-autosplit`, `latent-energy`) e `persist-all.test.ts` (o `it` de
95 NECKLACE_STRENGTH já estava como `it()` normal, não `it.fails` — confirmado passando).

## Por código

- **138 ITEM_ADVANCE** — DONE. `forge-extra.ts:itemAdvance`. Porta `ItemAdvanceHandler.cs`: pedra do
  Despertar (`EXALT_ROCK=11150`) no slot 0 tenta subir `StrengthenLevel` do slot 1; replica o bug
  original de divisão inteira (`StrengthenExp/oldLv` truncado antes de virar double).
- **95 NECKLACE_STRENGTH** — DONE. `forge-extra.ts:necklaceStrength`. Porta `NecklaceStrengthHandler.cs`;
  grava `p.info.necklaceExp/necklaceExpAdd` (já em `SAVED_DETAIL_COLUMNS`, `game/player-info.ts:114`).
  Teste de persistência em `persist-all.test.ts` (linha 290) passa com `it()` normal.
- **133 LATENT_ENERGY** — DONE. `forge-extra.ts:latentEnergy`. Porta `LatentEnergyHandler.cs`; usa
  `ItemInfo.isValidLatentEnergy`/`canLatentEnergy`/`resetLatentEnergy` (já existentes em `game/item.ts`).
  Resposta reconstruída do LEITOR do cliente (`LatentEnergyManager.as`), não do escritor C# — o
  `ConsolePacketLib` do build fornecido nunca implementou esse pacote (ver nota abaixo sobre 209).
- **209 FIGHT_SPIRIT** — DONE. `forge-extra.ts:figSpiritUpGrade` + `db/gemstone.ts` (tabela
  `Sys_User_Gemstone`, já migrada em `packages/db/drizzle/0000_init.sql`). Porta `FigSpiritUpGradeHandler.cs`;
  mesma ressalva: a resposta C# (`SendPlayerFigSpiritUp`) é `throw new NotImplementedException()` no único
  `IPacketLib` do build (`ConsolePacketLib.cs:606`), então o formato de saída foi reconstruído do leitor
  real do cliente (`GemstoneManager.as:292-322`) para funcionar de fato.
- **295 STORE_FINE_SUIT, 391 EQUIP_GHOST, EQUIP_BRING_UP (308), ITEM_CELL_IS_LOCKED (313)** — STUB
  (decisão documentada, não pendência). Nenhum handler de pacote existe em
  `vendor/DDTank41/Game.Server` nem `vendor/DDT-6600`, e o enum do servidor (`Packets/ePackageType.cs`)
  não declara esses códigos — é recurso do cliente (`store/fineStore/**`, `FineBringUpController.as`)
  que nunca foi ligado no servidor original. Portar seria inventar comportamento sem fonte; registrados
  como stub explícito em `registerForgeExtra` com a citação completa no cabeçalho do arquivo.
- **110/111 ITEM_REFINERY / ITEM_REFINERY_PREVIEW** — STUB (decisão documentada). O handler só existe no
  doador `vendor/DDTank4.1` (build diferente), amarrado a um `RefineryMgr.Refinery` com tabela de fórmula
  própria que não existe nos dados deste projeto — que já usa `Item_Refinery` para o 120 ITEM_TREND
  (portado em `forge.ts`). Implementar aqui inventaria dados.
- **compose (58 ITEM_COMPOSE) / embed (121 ITEM_INLAY, 125 ITEM_EMBED_BACKOUT)** — DONE (já existiam,
  revisados nesta sessão: `compose()` com nomes de slot/variável legíveis via `FORGE_SLOT`/
  `COMPOSE_ATTRIBUTE_BY_PROPERTY`; inlay/embed mantidos como estavam em `forge.ts`).
- **Forno "Gia Công"/ForgeMainView (Dourar=wishbead 106, Evolução=exalt/138, potencial/133, gemstone/209)**
  — DONE, todos cobertos pelos itens acima; `wishBeadEquip` (106) e `transfer` (61 ITEM_TRANSFER)
  continuam em `forge.ts`.
- **Auto-split da bancada (fusão 1-4 e fortalecer 0-2)** — mantido e generalizado: `autoSplitSlots`
  faz divisão igualitária genérica, `autoSplitFusionSlots` (fusão) e `forgeAutoArrange` (detecta aba
  via `forgeTabFromBench` e também reorganiza fortalecer) chamam ela. `installFusionAutoSplitHook`
  resolve a causa raiz documentada no código: o cliente só manda o pacote de fusão quando os 4 slots
  já estão preenchidos, então o hook em `onSlotsChanged` reage ao drop de uma pilha única e reemite
  pacotes 64 (GRID_GOODS) já divididos, fazendo o cliente perceber e pedir o preview sozinho.

## Packet coverage restante (fora do escopo deste bloco)

`node tools/qa/packet-coverage.mjs` depois desta sessão: nenhum código de Bloco A aparece em MISSING
ou STUB fora dos 6 já documentados acima (110, 295, 391, 308, 313 — e 138/95/133/209 não aparecem mais,
confirmando que saíram de stub). O que resta na lista (ACTIVE_PULLDOWN, COLLECTINFO, FIGHT_NPC,
QUESTION_REPLY, CARD_LOTTERY, LUCK_LOTTERY, LITTLEGAME_COMMAND, CHURCH_MOVIE_OVER,
HOTSPRING_ROOM_CREATE, USE_CONSORTIA_REWORK_NAME, USE_CHANGE_COLOR_SHELL, USER_RELOAD_GIFT,
CID_CHECK, GOTO_CARD_LOTTERY, LIGHTROAD_SYSTEM, GUILDMEMBERWEEK_SYSTEM, ACTIVITY_SYSTEM, SEll_GOODS,
135) pertence a outros blocos (B/C/D/E/F no `port-plan.md`).

## Arquivos tocados/possuídos

- `apps/game/src/handlers/forge.ts` — revisado (slots nomeados, auto-arrange genérico).
- `apps/game/src/handlers/forge-extra.ts` — verificado, sem mudanças de código.
- `apps/game/src/db/gemstone.ts` — verificado, sem mudanças.
- `apps/game/src/handlers/index.ts` — já tinha a linha de registro (`registerForgeExtra`).
- Testes: `forge-advanced.test.ts`, `forge-autoarrange.test.ts`, `forge-autosplit-live.test.ts`,
  `forge-persist.test.ts`, `fusion-autosplit.test.ts`, `latent-energy.test.ts`, `persist-all.test.ts`
  (seção 95 NECKLACE_STRENGTH) — todos verdes.
