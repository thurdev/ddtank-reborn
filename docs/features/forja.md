# Forja (Ferraria + Forno)

## 1. O que é no jogo
A bancada da Forja (bolsa especial `Store`, `BagType` 12) é compartilhada por duas
abas:
- **Ferraria**: `Fortalecer` (sobe nível do equipamento com pedra de força),
  `Montar`/incrustar gema (`Inlay`), `Compor` (combina pedra+equipamento pra subir
  atributo), `Transferir` (troca os bônus acumulados entre dois itens da mesma
  categoria por 10000 ouro), `Fundir` (junta 4 pedras do mesmo tipo pra tentar virar
  uma pedra melhor).
- **Forno**: `Dourar` (usa um Grânulo do Desejo pra tentar "dourar" uma arma/
  chapéu/roupa, efeito visual + bônus), `Evolução` (pedra do Despertar sobe nível
  de outro item), `Energia latente`/potencial, `Gemas` (Fig Spirit), `Espírito do
  equipamento`, `Aprimorar` e `Refinar conjunto` — todas **já portadas** (as
  últimas 3 vieram de fontes externas, ver seção 3 "Telas sem C# original");
  só a Refinaria (110/111) fica como design próprio (sem fonte C#, ver seção 4).

## 2. Onde fica no código
Desde a refatoração de legibilidade, `forge.ts`/`forge-extra.ts` viraram uma pasta
`apps/game/src/handlers/forja/` com 1 arquivo por ação do jogo (nome = o que o jogador
vê na tela). `forja/index.ts` tem a tabela completa de registro (código → função → aba).

| Ação | Pacote | Servidor TS | C# original | Tabelas |
|---|---|---|---|---|
| Fortalecer | 59 ITEM_STRENGTHEN | [`strengthen`](../../apps/game/src/handlers/forja/fortalecer.ts#L90) `forja/fortalecer.ts:90`, chance em [`strengthenChance`](../../apps/game/src/handlers/forja/fortalecer.ts#L41) `:41` | `ItemStrengthenHandler.cs:41-112` | `game."Item_Strengthen"`, `game."Item_Strengthen_Goods"` |
| Compor | 58 ITEM_COMPOSE | [`compose`](../../apps/game/src/handlers/forja/compor.ts#L60) `forja/compor.ts:60`, chance em [`composeChance`](../../apps/game/src/handlers/forja/compor.ts#L29) `:29` | `ItemComposeHandler.cs:58-118` | — |
| Fundir | 78 ITEM_FUSION | [`fusion`](../../apps/game/src/handlers/forja/fundir.ts#L129) `forja/fundir.ts:129` (regras em [`fusionCandidates`](../../apps/game/src/handlers/forja/fundir.ts#L37)/[`fusionPreview`](../../apps/game/src/handlers/forja/fundir.ts#L63)/[`fusionRoll`](../../apps/game/src/handlers/forja/fundir.ts#L81)) | `FusionMgr.cs` | `game."Item_Fusion"` |
| Incrustar gema (Montar) | 121 ITEM_INLAY | [`inlay`](../../apps/game/src/handlers/forja/montar.ts#L34) `forja/montar.ts:34` | `ItemInlayHandle` | — |
| Remover gema | 125 ITEM_EMBED_BACKOUT | [`embedBackout`](../../apps/game/src/handlers/forja/montar.ts#L78) `forja/montar.ts:78` | `ItemEmbedBackOutHandler.cs` | — |
| Abrir 5º/6º buraco (broca) | 217 OPEN_FIVE_SIX_HOLE | [`openFiveSixHole`](../../apps/game/src/handlers/forja/montar.ts#L116) `forja/montar.ts:116` | `OpenFiveSixHoleHandler.cs` | — |
| Transferir atributos | 61 ITEM_TRANSFER | [`transfer`](../../apps/game/src/handlers/forja/transferir.ts#L38) `forja/transferir.ts:38` | `ItemTransferHandler.cs` | `game."GoldEquipTemplateLoad"` |
| Trocar variante (tendência — NÃO confundir com "Refinar conjunto" abaixo) | 120 ITEM_TREND | [`itemTrend`](../../apps/game/src/handlers/forja/stubs.ts#L27) `forja/stubs.ts:27` | `ItemTrendHandle`/`RefineryMgr.RefineryTrend` | — |
| Dourar (Forno) | 106 WISHBEADEQUIP | [`wishBeadEquip`](../../apps/game/src/handlers/forja/dourar.ts#L29) `forja/dourar.ts:29` | `WishBeadEquipHandler.cs` | — |
| Limpar bancada | 122 CLEAR_STORE_BAG | [`clearStoreBag`](../../apps/game/src/handlers/forja/bancada.ts#L75) `forja/bancada.ts:75` | `StoreClearItemHandler.cs` | — |
| Evolução (pedra do Despertar sobe nível de outro item) | 138 ITEM_ADVANCE | [`itemAdvance`](../../apps/game/src/handlers/forja/evolucao.ts#L41) `forja/evolucao.ts:41` | `ItemAdvanceHandler.cs` | — |
| Energia latente/potencial | 133 LATENT_ENERGY | [`latentEnergy`](../../apps/game/src/handlers/forja/energia-latente.ts#L30) `forja/energia-latente.ts:30`, usa `ItemInfo.isValidLatentEnergy`/`canLatentEnergy`/`resetLatentEnergy` em `game/item.ts` | `LatentEnergyHandler.cs` | `ItemInfo.latentEnergy*` |
| Colar (energia do colar) | 95 NECKLACE_STRENGTH | [`necklaceStrength`](../../apps/game/src/handlers/forja/colar.ts#L36) `forja/colar.ts:36` | `NecklaceStrengthHandler.cs` | `Sys_Users_Detail.necklaceExp`/`.necklaceExpAdd` |
| Gemas (Fig Spirit) | 209 FIGHT_SPIRIT | [`figSpiritUpGrade`](../../apps/game/src/handlers/forja/espirito-de-luta.ts#L42) `forja/espirito-de-luta.ts:42` + modelo de dados em `forja/gemas.ts` + `db/gemstone.ts` | `FigSpiritUpGradeHandler.cs` | `Sys_User_Gemstone` |
| Trava de slot (cadeado) | 313 ITEM_CELL_IS_LOCKED | [`itemCellIsLocked`](../../apps/game/src/handlers/forja/trava-slot.ts) `forja/trava-slot.ts` | sem C# em `vendor/`; fonte externa trivial (`barrydevp/ddt3.4server`, `ItemCellIsClockedHandler.cs`) | `ItemInfo.cellLocked` (coluna já existente) |
| Espírito do equipamento | 391 EQUIP_GHOST | [`equipGhost`](../../apps/game/src/handlers/forja/espirito-do-equipamento.ts) `forja/espirito-do-equipamento.ts` | sem C# em `vendor/`; porte de `barrydevp/ddt3.8` (`EquipGhostHandler.cs`/`SpiritMgr.cs`) | `app."SpiritInfo"` (tabela nova, seed `0010_forja_specs_seed.sql`), `Sys_Users_Detail.GhostEquipList` (coluna já existente) |
| Aprimorar (devorar cartas) | 308 EQUIP_BRING_UP | [`equipBringUp`](../../apps/game/src/handlers/forja/aprimorar.ts) `forja/aprimorar.ts` | sem C# em `vendor/`; porte de `barrydevp/ddt3.4server` (`EquipBringUpHandler.cs`) | — (reusa `FusionType`/`Property1-4` dos templates de equipamento) |
| Refinar conjunto | 295 STORE_FINE_SUIT | [`forgeSuit`](../../apps/game/src/handlers/forja/refinar-conjunto.ts) `forja/refinar-conjunto.ts` | sem C# em `vendor/`; porte de `barrydevp/ddt3.4server` (`FineStoreSuitHandler.cs`) | `game."Sets_Build_Temp"` (JÁ existia no catálogo original, nunca tinha sido carregada), `Sys_Users_Detail.fineSuitExp` (coluna já existente) |
| Refinaria (sobe `StrengthenRefineryLevel`) | 110 ITEM_REFINERY (4.1) / **210** no 6600 (valor trocado, `m3-item-refinery`) / 111 ITEM_REFINERY_PREVIEW (igual nos dois) | [`refinery`/`refineryPreview`](../../apps/game/src/handlers/forja/refinaria.ts) `forja/refinaria.ts` — **design próprio, sem fonte C#** | `GameSocketOut.sendItemLianhua` do cliente nunca é chamado por nenhuma view em nenhum dos dois clientes (código morto dos dois lados) | — (usa coluna já existente, sem migration) |
| Comprar gema na loja de gemas | 44 BUY_GOODS (view `GemstoneObtainView.as`) | mesmo fluxo de [loja.md](./loja.md) | — | `game."Shop_Goods"` |

## 3. Fluxo passo a passo

### Fortalecer
1. Jogador arrasta equipamento + 1-6 pedras de força pro slot 0 da `StoreBag`.
2. Cliente manda `59 ITEM_STRENGTHEN`.
3. `strengthen()` lê as pedras, chama `strengthenChance()` (`forja/fortalecer.ts:41`): soma
   `STRENGTHEN_RATE_ITEMS[nívelDaPedra]` de cada pedra, soma bônus de pedra da sorte
   (`Property2/100`), bônus de ferreiro da guilda (`smithLevel * 10%`) e bônus VIP
   (`+30%` se `vip`), compara contra sorteio `0..9999`.
4. Sucesso: `StrengthenLevel++`. Falha: pode quebrar/perder nível conforme regra do
   item (ver corpo de `strengthen()`).
5. Responde `59` com sucesso/falha; item fica marcado sujo pra salvar depois.

### Fundir (exemplo mais rico)
1. Jogador coloca 4 pedras do mesmo `FusionType` nos slots 1-4.
2. `fusionCandidates()` junta os 4 `FusionType` ordenados numa chave (ex. `"3333"`),
   busca a receita em `game."Item_Fusion"`, soma `FusionRate`/`FusionNeedRate` das 4
   pedras, calcula até 2 prêmios candidatos (nível da pedra mais forte +1/+2 e o
   mesmo nível) — `max` é o prêmio bom, `min` a consolação.
3. `fusionPreview()` é o que o cliente mostra ANTES de confirmar (% de cada prêmio).
4. `fusionRoll()` sorteia de fato — **trava anti-frustração**: se o prêmio sorteado
   já está na própria bancada, a fusão falha (não dá pro jogador "ganhar" o que já
   tinha).

### Dourar
1. Jogador coloca a arma/chapéu/roupa + um Grânulo do Desejo (`TemplateID` 11560
   arma / 11561 chapéu / 11562 roupa) certo pra aquela categoria.
2. `wishBeadEquip()` confere categoria compatível, se já não está dourado
   (`goldValidDate`), limite de nível opcional (`IsWishBeadLimit` + `WishBeadLimitLv`).
3. Sorteia contra `WishBeadRate` (por mil, padrão 8 = 0,8%). Sucesso: `isGold=true`,
   validade de 3 dias, item fica vinculado, e manda um aviso **pra todo o servidor**
   (`Out.message` broadcast).

## 4. Quero mudar…
- **Chance de fortalecer por nível de pedra**: array `STRENGTHEN_RATE_ITEMS = [0.75,
  3.0, 12.0, 48.0, 240.0, 768.0]` (índice 0 = pedra nível 1) em `forja/fortalecer.ts:20`.
  Bônus VIP: `VIP_STRENGTHEN_EX = 0.3` (`:22`).
- **Chance de compor por qualidade de pedra**: array `COMPOSE_RATE = [0.8, 0.5, 0.3,
  0.1, 0.05]` em `forja/compor.ts:18`.
- **Receita/prêmio de fusão**: tabela `game."Item_Fusion"` (seed `Item_Fusion.json.gz`
  / `Items_Fusion_List.json.gz`) — sem recurso admin dedicado ainda; editar via SQL
  ou criar `ResourceDef` novo.
- **Preço de incrustar gema**: config `InlayGoldPrice` (padrão 2000 ouro),
  `forja/montar.ts` (`ctx.templates.cfgInt("InlayGoldPrice", 2000)`, dentro de `inlay()`).
- **Chance e limite de Dourar**: config `WishBeadRate` (por mil, padrão 8),
  `IsWishBeadLimit` + `WishBeadLimitLv` (padrão nível 12) — todas lidas de
  `ctx.templates.serverConfig`/`cfgInt` em `wishBeadEquip()` (`forja/dourar.ts:29+`). Ver
  tabela de config do servidor (`Server_Config`).
- **Custo de Transferir**: constante `mustGold = 10000` em `transfer()`
  (`forja/transferir.ts:38`).
- **Chance/custo de Evolução (pedra do Despertar)**: lógica em `itemAdvance()`
  (`forja/evolucao.ts`) — replica de propósito o bug original do C# (divisão inteira
  de `StrengthenExp/oldLevel` truncada antes de virar double); ver `research/qa/port-A.md`.
- **Energia latente/Fig Spirit (gemas)**: `latentEnergy()` (`forja/energia-latente.ts`)
  e `figSpiritUpGrade()` (`forja/espirito-de-luta.ts`, modelo de dados em `forja/gemas.ts`)
  — as respostas de rede desses dois pacotes foram reconstruídas
  a partir do **leitor do cliente** (`LatentEnergyManager.as`, `GemstoneManager.as`),
  porque o `ConsolePacketLib.cs` do build original nunca implementou essas duas
  respostas (`throw new NotImplementedException()`). Se o formato parecer errado em
  algum caso, confira esses dois arquivos `.as` antes de mudar o código.
- **Custo/chance da Refinaria (110/111, design próprio)**: arrays `REFINERY_COST`
  (800/1600/2800/4400/6400 Ouro) e `REFINERY_CHANCE` (90/70/50/30/15%) em
  `forja/refinaria.ts`. Sem pedra/consumível (só Ouro) e sem quebrar o item na falha —
  é um sink cosmético de longo prazo (só aparece no selo de combate `weaponRefineryLevel`
  e no tooltip de comparar item), detalhe em `research/qa/feature-designs.md`.

## 5. Testes
- `apps/game/test/formulas.test.ts` — `describe("Strengthen / compose rates (ItemStrengthenHandler, ItemComposeHandler)")`.
- `apps/game/test/fusion-autosplit.test.ts` — `describe("autoSplitFusionSlots (Reborn: pilha inteira num slot só)")`.
- `apps/game/test/forge-advanced.test.ts` — `describe("RefineryMgr.RefineryTrend (120 ITEM_TREND)")`, `describe("Templates.shopByTemplate...")`.
- `apps/game/test/forge-autoarrange.test.ts`, `forge-autosplit-live.test.ts` — organização automática da bancada.
- `apps/game/test/forge-persist.test.ts` — `describe("Forja grava no banco")`
  (inclui "110/111 ITEM_REFINERY").
- `apps/game/test/latent-energy.test.ts`, `persist-all.test.ts` (seção 95
  NECKLACE_STRENGTH) — energia latente e colar.
- `apps/game/test/forge-ghost.test.ts` — 391 EQUIP_GHOST (sucesso/falha via `rnd`
  injetado, save-quit-reload de `GhostEquipList`).
- `apps/game/test/forge-bringup.test.ts` — 308 EQUIP_BRING_UP (devorar carta,
  carta travada, evolução de template, compra de EXP com Money + persistência).
- `apps/game/test/forge-fine-suit.test.ts` — 295 STORE_FINE_SUIT (consumo parcial,
  `count=0` usar tudo + troco acima do teto, sem item na bolsa, save-quit-reload).
- Status: **OK** — fortalecer/compor/fundir/incrustar/dourar/transferir/limpar
  bancada/trocar variante/evolução/energia latente/colar/gemas (Fig Spirit)/trava de
  slot/espírito do equipamento/aprimorar/refinar conjunto/refinaria (110/111, design
  próprio) todos portados/implementados e testados.
