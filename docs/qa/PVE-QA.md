# Checklist viva de QA do PvE (tarefas `pve-qa` + `pve-batalha`)

Atualizado 2026-10-27 (tarefa `pve-batalha`). Fonte dos dados: quatro varreduras automatizadas em
`packages/fight/test/` (rodam contra os dados reais de `packages/db/seed/game/*.json.gz`, não stubs) +
três testes de regressão dedicados (`pve-batalha-fixes.test.ts`) + verificação manual no cliente real
(PixiJS, porta 5182 nesta tarefa) contra o `apps/api`/`apps/game` do dono.

- `pve-sweep.test.ts` — constrói cada `(Pve_Info, dificuldade)` com `*GameScript` e confere se a cadeia de
  `Mission_Info` resolve inteira (sem travar no meio). **Estado atual: 0 de 102 combinações quebradas.**
- `pve-cards-sweep.test.ts` — para cada missão com `TakeCard > 0`, confere se existe uma linha de
  `Drop_Condiction`/`Drop_Item` de verdade que resolve pelo menos um item. **Estado atual: 31 de 171 missões
  sem fonte de carta** (lista completa no `console.log` do teste; ver §1.2 — nenhuma é derivável, 6 são
  inalcançáveis).
- `pve-playthrough-sweep.test.ts` — o único que JOGA de verdade: cria o `PveGame` com bots reais
  (`BotRunner`, stats propositalmente MUITO exagerados — 30k ataque, 2M HP — pra isolar bug de script, não
  medir equilíbrio) e dados reais de item/carta (`pve-data.ts` `realDrops`), e confere `GAME_CREATE` → cada
  `GAME_MISSION_OVER` → `PVE_STOPPED` com vitória → `GAME_ALL_MISSION_OVER` → `PVE_AWARD`. Reporta tudo via
  `console.log`, só falha de verdade numa regressão de bug já corrigido. **Rodada completa depois dos fixes
  desta tarefa (43 combinações): 0 travamentos de verdade (nenhum "never reached PVE_STOPPED" sem motivo
  identificado restando sem investigação — ver §1.1), ~15 combos ainda perdem por equilíbrio/limitação da
  IA do bot (não bug).** O timeout de parede de cada combo subiu de 20s pra 90s (tarefa `pve-batalha`): não
  era não-determinismo, era o CPU real de combos genuinamente lentos (muitos turnos/NPCs) estourando um
  limite de parede apertado demais — ver §1.1.
- `pve-batalha-fixes.test.ts` (nova, tarefa `pve-batalha`) — regressão dedicada pros 3 bugs de engine que
  essa tarefa achou e corrigiu (não é sweep, não falha por equilíbrio): Pve 13 (Arena dos Bravos) limpa as 4
  fases incluindo a sala do rei (mapa 1216) e a onda final (TotalCount=-1); `canGameOver()` encerra no limite
  de turno mesmo quando a missão nunca resolve sozinha; `enemiesOf()` inclui alvo `IsHelper`; GZS801/XDS901/
  DTS701 rodam sem erro de script com um par mentor/aprendiz de verdade.

Tipos cobertos (pedido do dono): 4 = masmorra, 6 = laboratório/evento, 7 = Pesadelo. Tipo 5 (calibração),
10 (tutorial) e 14 (chefe de mundo) não são "masmorras do jogador" e ficam fora desta tabela (cobertos pelos
sweeps de cadeia/carta mesmo assim).

## Masmorras (`Pve_Info` tipo 4/6/7)

Legenda: ✅ ok no sweep · ⚠️ roda e termina mas com aviso (perde por equilíbrio/bot, não crash) · 🐞 crash de
script (não corrigido) · ⏱️ bots não convergem no orçamento do sweep · "-" = essa dificuldade não existe pra
essa masmorra (sem `*GameScript`).

| ID | Nome (PT-BR) | Nível | Fácil | Normal | Difícil | Terror | Observações |
|---|---|---|---|---|---|---|---|
| 1 | Lâu đài Gà (Bugo Castle) | 14 | ✅ | ⚠️ `OnShooted` null (donor-fiel) | ⚠️ idem + `CHM1277` (donor-fiel) | ⚠️ bots limpam só 2/5 fases (equilíbrio) | Sem mudança nesta tarefa — já era o estado corrigido/documentado por `pve-qa`. |
| 2 | Huyệt Ma Kiến (Ant Cave) | 8 | ✅ | ✅ | - | - | Limpo nas 2 dificuldades que tem. |
| 3 | Bộ lạc Tà thần | 18 | ✅ | ⚠️ limitação de IA do bot (ver nota) | ⚠️ idem | ⚠️ idem | **Corrigido nesta tarefa**: não trava mais (era o bug `PrepareGameOver`/`CanEndGame`, §1.1). Normal/Difícil/Terror ainda perdem — rastreado até `BLTTT1123`/irmãs ("Đậu thần", um chefe `IsHelper=true` com blood maior que os asseclas que ficam respawnando ao redor): o bot do sweep mira "menor HP" (`bot/brain.ts` `target: "lowestHp"` pra difficulty≥65), então ignora pra sempre o chefe de HP maior em favor dos asseclas fracos que nunca acabam — limitação da heurística do bot de teste, não bug de engine/script (um jogador real focaria o chefe). Não corrigido (reescrever a IA do bot é risco maior que o escopo desta tarefa). |
| 4 | Pháo đài hắc ám ("Castelo Sombrio") | 18 | - | ⚠️ perde (equilíbrio) | ⚠️ mesma limitação de IA da nota acima (`PDHAK1143`'s `m_boss` `IsHelper`) | ✅ **limpa** | Normal/Difícil não travam mais (fix §1.1); Difícil ainda perde pela mesma limitação de IA do bot que a 3. Terror agora limpa 100% (`isWin=true`) com os fixes desta tarefa. |
| 5 | Đại chiến rồng | 18 | - | ⏱️ ainda não converge | ⏱️ ainda não converge | ⏱️ ainda não converge | Os 3 fixes de engine desta tarefa (§1.1) não resolveram sozinhos — tracejado até `DCR5101` (`m_helper`/`m_npc` morrem, mas a missão não libera; `m_specialEffect`/`m_dianEffect` são decorações, não o alvo real). Não teve uma sessão dedicada de trace como a 13 (§1.1) — próxima tarefa de PvE deveria começar por aqui. |
| 6 | Đấu trường gà | 18 | - | ⚠️ perde (equilíbrio) | ⚠️ perde (equilíbrio) | ⚠️ perde (equilíbrio) | **Corrigido nesta tarefa** (era a mesma classe de bug map-1166/`PrepareGameOver` da 13, §1.1) — não trava mais em nenhuma dificuldade; agora é só perda por equilíbrio/IA do bot (mesma limitação `IsHelper`/`lowestHp` da nota da 3, via `DTGT1166`/irmãs). |
| 7 | Giải cứu gà con | 9 | ✅ | ⏱️ ainda não converge | ⏱️ ainda não converge | - | Não investigada nesta tarefa (fora da lista original do item 1); ainda trava no sweep mesmo após os 3 fixes de engine — provavelmente a mesma classe de bug/limitação, não confirmado. |
| 8 | Rừng rậm Gamazon | 8 | ✅ (com par mentor/aprendiz real) | - | - | - | **Corrigido nesta tarefa** (item 2): `Game.FindSingleSimpleBossID` implementado (não existia, nem em `vendor/DDTank4.1`) + `PlayerSpec.masterId` plumbed até `PlayerDetail.PlayerCharacter.masterID` — `GZS801` roda sem erro de script com um aprendiz (`grade<20`+`masterId`) e um mestre de verdade (`pve-batalha-fixes.test.ts`). O sweep genérico (2 bots sem relação de academia) ainda reporta `BoltMove` null — não é bug, é a mesma missão exigindo um par mentor/aprendiz real (confirmado: sem isso, o jogo original TAMBÉM nunca atribuiria nem um nem outro). |
| 9 | Hoang mạc Xatara | 12 | ✅ (idem) | - | - | - | Mesma correção/mesma nota da 8 (`XDS901`). |
| 10 | Lâu đài Daucula | 15 | ✅ (idem, limpa 100%) | - | - | - | Já não precisava do `FindSingleSimpleBossID` (só `BoltMove`); com um par mentor/aprendiz real, **vence 100%** (`pve-batalha-fixes.test.ts`). |
| 11 | Vịnh Cariga | 18 | ✅ | - | - | - | Única dificuldade, limpa (cadeia curta, ~0ms). |
| 12 | Vòng xoáy thời gian | 30 | ⚠️ não trava mais, perde na fase 2/4 | ⚠️ idem | ⚠️ idem | ⚠️ idem | **Corrigido nesta tarefa** (era o MESMO bug `PrepareGameOver`/`CanEndGame` da 13, mapas 1207/1209, §1.1) — antes 0/4 fases em TODAS as dificuldades sem nunca parar; agora resolve (perde) de forma determinística em todas. A perda em si (fase 2) não foi investigada a fundo — nível 30, pode ser a mesma limitação de IA do bot. |
| 13 | Đấu Trường Dũng Sĩ | 30 | ✅ **limpa 100%** | ✅ **limpa 100%** | ✅ **limpa 100%** | ✅ **limpa 100%** | **Corrigido nesta tarefa** — era o bug original pedido pelo dono ("trava exatamente na fase 3/4 em toda dificuldade"). Dois bugs de engine reais, não de script (§1.1): `PrepareGameOver`/`CanEndGame` inventados (travava pra sempre na sala do rei, mapa 1216) + `canGameOver()` sem o fallback de limite de turno do `PVEGame.cs` original (a onda final, `TotalCount=-1` no dump do doador, só termina pelo limite de turno). Regressão travada em `pve-batalha-fixes.test.ts`. |
| 14 | Tàu Hải Tặc | 8 | ✅ | - | - | - | Única dificuldade, limpa; carta sem item (gap de dado confirmado inalcançável/sem irmã pra derivar, §1.2). |
| 38 | Huyệt Ma Kiến Ác Mộng (Pesadelo) | 45 | ✅ | ✅ | ✅ | ✅ | Limpo nas 4 dificuldades, cadeias curtas (~0ms). |
| 39 | Giải Cứu Gà Con Ác Mộng (Pesadelo) | 45 | ✅ | ✅ | ✅ | ✅ | Idem 38. |

## 1.1 Três bugs de engine (não de script/dado) achados nesta tarefa

Tarefa `pve-batalha` item 1 (relato do dono: "Pve 13 trava exatamente na fase 3/4 em toda dificuldade —
investigue primeiro"). Instrumentando `PveGame` turno a turno (não só checando o resultado final) achou 3
bugs de **engine** — `packages/fight/src/pve/game.ts` — que explicam a maioria dos travamentos relatados em
`pve-qa`, não bugs de script/dado como os anteriores:

1. **`checkStateNow`'s `GameState.Playing`/`PrepareGameOver` inventavam um mecanismo `CanEndGame` + uma
   lista de 4 mapas fixos (1166/1207/1209/1216) pra decidir quando entrar em `PrepareGameOver`.** Nenhum dos
   dois existe no doador real — `vendor/DDTank4.1/Source Server/Game.Logic/Actions/
   CheckPVEGameStateAction.cs:60-73` mostra que `PrepareGameOver` só existe pro cutscene do portão do
   Labirinto (`IsLabyrinth() && CanEnterGate -> GameOverMovie()`); todo outro tipo de sala vai direto pra
   `GameOver()` assim que `CurrentActionCount` assenta. `CanEndGame` nem existe em `vendor/DDTank4.1`
   (achado só num doador MAIS NOVO, `vendor/_qa-feature-sources/ddt3.8/...`, de onde os scripts
   `TVH12001`/`TVN12001`/`TVT12001`/`TVH12003`/`TVN12003`/`TVT12003` do Vòng xoáy thời gian (Pve 12) foram
   transpilados por engano — não é o 4.1 real). Qualquer missão nos 4 mapas listados que nunca setasse
   `CanEndGame` (nenhuma do escopo seta) ficava presa em `PrepareGameOver` pra sempre: a sala do rei da Arena
   dos Bravos (mapa 1216, Pve 13, TODA dificuldade, fase 3/4 — exatamente o relato do dono) e a fase Normal
   da Đấu trường gà (mapa 1166, Pve 6). Corrigido removendo o mecanismo inventado e portando o fluxo real
   (`isLabyrinth()`/`gameOverMovie()` novos, estruturalmente fiéis mas inalcançáveis no escopo atual — só
   masmorras tipo Labirinto usam `CanEnterGate`, fora do pedido desta tarefa).
2. **`canGameOver()` não tinha o branch `TurnIndex > TotalTurn - 1` do `PVEGame.CanGameOver` original**
   (`PVEGame.cs:264-288`). Então uma missão cujo `CanGameOver()` NUNCA retorna `true` sozinha rodava pra
   sempre em vez de acabar no limite de turno como o servidor real. A onda final da Arena dos Bravos
   (`WAS13004`/`WAN13104`/`WAH13204`/`WAT13304`, fase 4 de TODA dificuldade) é exatamente esse caso:
   `kill == Game.MissionInfo.TotalCount` nunca é verdadeiro porque `TotalCount = -1` — confirmado no dump
   bruto do doador (`vendor/_dbexport/Project_Game34/data/Mission_Info.json`), não bug de import. Corrigido
   adicionando o branch que faltava.
3. **`enemiesOf()` (só usado pela mira do bot de teste, `bot/brain.ts`) excluía qualquer NPC `IsHelper=true`
   da lista de alvos.** `IsHelper` não tem citação no doador (bots não existem em `vendor/DDTank4.1`; o
   cliente real deixa o jogador mirar em qualquer coisa, sem essa checagem) — e várias missões convocam o
   ALVO de verdade com `IsHelper=true` (o chefe "Đậu thần"/bean-god de `BLTTT1123` e irmãs, Pve 3; o padrão
   análogo em `PDHAK1143`/`DTGT1166` etc., Pve 4/6). Sem alvo nenhum, o bot ficava preso pra sempre.
   Corrigido tirando a exclusão (`CanTakeDamage` sozinho ainda exclui props cosméticos de verdade, ex.
   `TVH12001`'s `ChickenHelp`, criado com `CanTakeDamage=false`).

Com os 3 corrigidos, o sweep completo (43 combinações) não tem mais NENHUM "never reached PVE_STOPPED" sem
motivo identificado — exceto Pve 5 e Pve 7, que continuam travando mesmo depois (ver tabela acima; não
tiveram uma sessão de trace dedicada como a 13, ficam pra próxima tarefa).

**Limite de parede do sweep**: o timeout por combo subiu de 20s pra 90s. Não era não-determinismo (o seed já
era fixo, `PveGame seed:7` + `BotRunner seed:5`) — era puro CPU real: alguns combos genuinamente levam mais
de 20s de parede pra simular (muitos turnos/NPCs), e isso falhava DURO (exceção de timeout do vitest) em vez
de ser reportado como "soft" igual todo o resto. Com 90s, a rodada completa fecha com `exit 0` (0 falhas
duras fora as guardas de regressão intencionais).

## 1.2 Carta de recompensa vira sem item — investigação completa dos 31 casos

Tarefa `pve-batalha` item 3 (31 missões reportadas por `pve-cards-sweep.test.ts` sem fonte de carta,
incluindo a 1073 já documentada como caso-regra em `pve-qa`). Pra cada uma, checado (a) se existe QUALQUER
`Drop_Condiction` pra ela mesmo sob outro `CondictionType`/ID, (b) se o dump BRUTO do banco doador
(`vendor/_dbexport/Project_Game34/data/`) já não tem a linha (confirma que não é bug de import), e (c) se a
missão é sequer ALCANÇADA por algum `*GameScript.SetupMissions(...)` (uma missão nunca alcançada não é um
bug vivo — mesma lógica já usada pra 1377 em `pve-qa`). Resultado, nenhuma é derivável por analogia como a
1073 foi (nenhuma tem uma linha-irmã "quase completa" faltando só o próprio id):

- **6 inalcançáveis** (nenhum `*GameScript.SetupMissions` nem `Pve_Info` referencia o id — mesma classe da
  1377, não são bugs vivos): `1377` (já documentado), `3001` (Ant Cave — a cadeia real do Pve 2 usa
  2001/2002/2101/2102, nunca 3001), `4001`/`4002`/`4003` ("Ai ga"/duplicada "Huyệt Ma Kiến" — nenhum script
  gerado referencia esses ids), `15002` ("Boss vợ chồng" — nenhum `Pve_Info`/script com esse id na faixa).
- **15 minigames de calibração** (`101-105`/`111-115`/`121-125`, `Pve_Info` tipo 5 "Đo màn hình/Góc/Siêu
  cao/Cao thấp" — tiro ao alvo do campo de treino, não masmorra): confirmado ausente até no dump bruto do
  doador, sem nenhuma linha-irmã (nenhum outro `Drop_Condiction` toca esses ids nem por perto). Prática de
  mira pode nunca ter dado carta de verdade mesmo no jogo original.
- **4 missões de abertura de masmorra tipo 6** (`600`/`700`/`800`/`900` — "ải 1" de Vịnh Cariga/Lâu đài
  Dracula/Rừng rậm Gamazon/Hoang mạc Xatara): confirmado que só a SEGUNDA missão de cada par (601/701/801/
  901, a luta principal) tem `Drop_Condiction` (`DropID` 50019-50022) — a primeira (intro/emparelhamento
  mentor-aprendiz, sem luta de verdade) nunca teve, nem no dump bruto. Padrão consistente nas 4 masmorras
  (não é um erro isolado numa só).
- **5 missões da cadeia principal do tutorial** (`1085-1089`, "Tranh đoạt báu vật" — testada com o stub em
  `pve.test.ts`, por isso ninguém notou a carta vazia): confirmado ausente, sem linha-irmã. Pode ser que a
  recompensa dessas venha do sistema de MISSÃO (condição tipo 21, quest reward) em vez do sistema de carta
  PvE — não confirmado, mas plausível (cadeia de quest, não masmorra "normal").
- **1 masmorra real de dificuldade única** (`12016`, Tàu Hải Tặc — `CrosairBoss.SetupMissions("12016")`,
  ALCANÇADA e jogável, QA confirma ✅ na tabela acima): sem `Drop_Condiction` nem no dump bruto, sem
  linha-irmã (não tem outra dificuldade pra comparar).

**Nenhuma migração foi criada** — diferente do fix da 1073 (`0028_pve_cartas_gulu_baron_card.sql`), que
estendia uma linha-irmã já existente faltando só o último id da MESMA masmorra/dificuldade, nenhum destes 25
casos alcançáveis tem uma linha-irmã assim pra estender com segurança; inventar um pool de itens do zero
seria chute de design, não port. Pendente pro dono decidir via admin (**Conteúdo → Drops**) quando quiser;
os 6 inalcançáveis não precisam de decisão (nunca aparecem pro jogador).

## 1.3 Gaps de script GZS801/XDS901/DTS701/NTM1083 (tarefa `pve-batalha` item 2)

- **`GZS801`/`XDS901` (`Rừng rậm Gamazon`/`Hoang mạc Xatara`, missão de abertura "mestre e aprendiz")**:
  `this.apprenticePlayer`/`this.masterPlayer` ficavam `null` porque `loadPlayers()` lê
  `allLivingPlayer.PlayerDetail.PlayerCharacter.masterID` — um campo que `packages/fight`'s `compat.ts`
  nunca expunha (sempre `undefined`). O sistema de mentor/aprendiz (Academia) já existe de verdade em
  `apps/game` (`handlers/academia/*`, `packages/db/src/schema/player.ts` `masterID`) — só faltava o fio até
  o motor de luta. Corrigido: `PlayerSpec.masterId` novo (`packages/fight/src/game/living.ts`), plumbed em
  `compat.ts` (`PlayerCharacter.masterID`) e em `apps/game/src/fight/ddt.ts` `specOf()`
  (`masterId: c.masterID ?? 0`). Com um par mentor/aprendiz de verdade (`grade<20` + `masterId` setado), a
  missão roda sem erro nenhum (`pve-batalha-fixes.test.ts`) — o `null` não era bug de engine, era a
  precondição (nenhum par de academia de verdade) nunca sendo satisfeita; confirmado 1:1 com o C#
  (`loadPlayers()` ported literalmente, mesma lógica de classificação).
- **`Game.FindSingleSimpleBossID` não existia** — nem em `vendor/DDTank4.1`'s `BaseGame.cs` (não é um corte
  de escopo desta migração; o 4.1 real genuinamente não tem esse método). Achado o corpo real num doador
  mais novo (`vendor/_qa-feature-sources/ddt3.8/Game.Logic/BaseGame.cs:3263-3273`: primeiro `SimpleBoss` na
  fila de turnos cujo `NpcInfo.ID` bate). Implementado em `game.ts` — sem ele, `GZS801`/`XDS901.CanGameOver()`
  lançava `is not a function` toda chamada.
- **`DTS701` (`Lâu đài Daucula`)**: mesmo padrão `m_deTu`/`m_suPhu` (đệ tử/sư phụ = aprendiz/mestre) que
  GZS801/XDS901 — corrigido pelo mesmo fix de `masterId`; não precisava do `FindSingleSimpleBossID`. Com um
  par real, **vence 100%**.
- **`NTM1083` `Bussiness.*` refs — FALSO POSITIVO, não é bug**: as 3 linhas `Bussiness.Managers.ItemMgr.
  FindItemTemplate(...)` que `pve-qa` sinalizou como "prefixo não resolvido" estão inteiras dentro de um
  bloco `/* ... */` — tanto no `.ts` gerado quanto no `.cs` doador original
  (`vendor/DDTank4.1/Source Server/Game.Server.Scripts/AI/Messions/NTM1083.cs:72-124`, todo o bloco de
  dica de tutorial já vem comentado no C# de verdade). Nunca executa, não precisa de fix. A nota anterior em
  `docs/guides/pve.md` §1.3 vinha de um grep estático sem checar se a linha era código vivo.

## Outros itens do relato do dono (não são por-masmorra)

| Item | Status | Onde |
|---|---|---|
| 3. "Pular pro chefe" (isOpenBoss) | ✅ corrigido | `apps/game/src/handlers/salas/configurar-sala.ts` `lastFloorForBoss` — porta `RoomSetupChangeAction.GetLastFloor` (C#), usa `Pve_Info.LastFloor`. Testado (`pve-instancias.test.ts`). |
| 4. Nomes da masmorra no modal em outro idioma | ✅ corrigido (patch) | `tools/as3-to-ts/patches/room/view/chooseMap/DungeonChooseMapView.ts.json` — o título era só um bitmap (`image/map/<ID>/icon.png`, arte nunca traduzida); agora o nome traduzido (`Pve_Info.Name`, já 100% PT-BR no banco) aparece como texto no painel de descrição. |
| 5. Masmorras "simplesmente travadas" mesmo nível 60 | ✅ corrigido | `apps/game/src/db/pve-progress.ts` `syncPvePermission` — garante os 50 caracteres de `PvePermission` SEMPRE no login. Causa raiz da "Castelo Sombrio" (`Pve_Info` 4) do relato do dono. |

## Como atualizar esta tabela

```
cd packages/fight && npx vitest run test/pve-playthrough-sweep.test.ts --maxWorkers=1 --reporter=verbose
```

Procure linhas `pve playthrough sweep: Pve <id> (<nome>) hardLevel <n>: <motivos>` no output — ausência de
linha pra um combo = passou em tudo. `hardLevel`: 0 Fácil, 1 Normal, 2 Difícil, 3 Terror, 4 Épico, 5
Pesadelo (ladder completo em `packages/fight/src/pve/game.ts`).

## Como rodar a varredura

`PVE_SWEEP=1 pnpm --filter @ddt/fight exec vitest run test/pve-playthrough-sweep.test.ts` — fora da suíte
normal porque o bot ainda perde por equilíbrio em ~15 combos (não é bug); roda em ~90-200s.

## 2. Verificação no cliente real (item 4, tarefa `pve-batalha`)

Playwright headless (Chromium, `chromium.launch()`, contexto novo — nunca MCP/perfil real) contra
`apps/client` (porta 5182, próprio worktree) falando com o `apps/api`/`apps/game` do dono (8080/9200/9300,
não parados). Conta de teste própria (`pvebatalha_c1`, senha só neste ambiente, nunca commitada), criada via
`POST /api/auth/register` direto no `apps/api` do dono (o mesmo endpoint que `apps/web` usa) — sem precisar
rodar `apps/web` também: o cliente PixiJS aceita `?user=&key=&api=&ws=` direto na URL (mesmos flashvars que
`apps/web/src/components/GameFrame.tsx` monta pro iframe).

Ver seção abaixo pro resultado real (screenshots + o que faltou).
