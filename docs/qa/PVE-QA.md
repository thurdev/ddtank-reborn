# Checklist viva de QA do PvE (tarefa `pve-qa`)

Atualizado 2026-10-27. Fonte dos dados: três varreduras automatizadas em `packages/fight/test/` (rodam
contra os dados reais de `packages/db/seed/game/*.json.gz`, não stubs) + verificação manual no cliente real
(PixiJS, porta 5181) contra o `apps/api`/`apps/game` do dono.

- `pve-sweep.test.ts` — constrói cada `(Pve_Info, dificuldade)` com `*GameScript` e confere se a cadeia de
  `Mission_Info` resolve inteira (sem travar no meio). **Estado atual: 0 de 102 combinações quebradas.**
- `pve-cards-sweep.test.ts` — para cada missão com `TakeCard > 0`, confere se existe uma linha de
  `Drop_Condiction`/`Drop_Item` de verdade que resolve pelo menos um item. **Estado atual: 31 de 165 missões
  sem fonte de carta** (lista completa no `console.log` do teste; a maioria é calibração/primeira-fase —
  ver `docs/guides/pve.md` §1.2).
- `pve-playthrough-sweep.test.ts` — o único que JOGA de verdade: cria o `PveGame` com bots reais
  (`BotRunner`, stats propositalmente MUITO exagerados — 30k ataque, 2M HP — pra isolar bug de script, não
  medir equilíbrio) e dados reais de item/carta (`pve-data.ts` `realDrops`), e confere `GAME_CREATE` → cada
  `GAME_MISSION_OVER` → `PVE_STOPPED` com vitória → `GAME_ALL_MISSION_OVER` → `PVE_AWARD`. Reporta tudo via
  `console.log`; só falha de verdade numa regressão de bug já corrigido nesta tarefa. **Rodada completa
  (2026-10-27, 43 combinações, todas as 15 masmorras reais × toda dificuldade com `*GameScript`): 28 das 43
  combinações com pelo menos um aviso (a maioria "bots não converge no tempo", não crash de script — ver
  tabela), 0 falha dura (todas as guardas de regressão seguram, nenhum bug já corrigido voltou).** Rode de
  novo pra ver o estado mais atual.

Tipos cobertos (pedido do dono): 4 = masmorra, 6 = laboratório/evento, 7 = Pesadelo. Tipo 5 (calibração),
10 (tutorial) e 14 (chefe de mundo) não são "masmorras do jogador" e ficam fora desta tabela (cobertos pelos
sweeps de cadeia/carta mesmo assim).

## Masmorras (`Pve_Info` tipo 4/6/7)

Legenda: ✅ ok no sweep · ⚠️ roda mas com aviso (não-crash) · 🐞 crash de script (não corrigido ainda) · ⏱️ bots não convergem no orçamento do sweep (provável desenho de dificuldade/objetivo especial, não confirmado bug) · "-" = essa dificuldade não existe pra essa masmorra (sem `*GameScript`).

| ID | Nome (PT-BR) | Nível | Fácil | Normal | Difícil | Terror | Observações |
|---|---|---|---|---|---|---|---|
| 1 | Lâu đài Gà (Bugo Castle) | 14 | ✅ | ⚠️ `OnShooted` null (donor-fiel, ver nota) | ⚠️ idem + `CHM1277` (donor-fiel) | ⚠️ bots limpam só 2/5 fases (equilíbrio) | **Era o bug original do dono (item 1)** — Normal/Difícil/Terror davam tela preta; corrigido (migrações 0030/0031 + fix de `prepareNewSession`). Carta Fácil tem item (migração 0028); Normal/Difícil ainda no gap de carta documentado (§1.2). |
| 2 | Huyệt Ma Kiến (Ant Cave) | 8 | ✅ | ✅ | - | - | Limpo nas 2 dificuldades que tem. |
| 3 | Bộ lạc Tà thần | 18 | ✅ | ⏱️ só 1/4 fases no orçamento | ⏱️ idem | ⏱️ idem | Fácil ok; Normal/Difícil/Terror não convergem com os bots do sweep — não confirmado bug, pode ser masmorra multi-onda genuinamente mais longa. |
| 4 | Pháo đài hắc ám ("Castelo Sombrio") | 18 | - | ⏱️ 2/3 fases | ⏱️ 1/3 fases | ✅ | **Masmorra citada pelo dono como "simplesmente travada"** — não tem dificuldade Fácil (só Normal+), então o personagem nível 60 esbarrava no bug de `PvePermission` curto (item 5, **corrigido**: antes dava pra nem ABRIR o botão de dificuldade nenhuma). Jogabilidade Normal/Difícil ainda não converge no sweep (Terror ok). |
| 5 | Đại chiến rồng | 18 | - | ⏱️ 0/4 | ⏱️ 0/4 | ⏱️ 0/4 | Mesma classe de "não converge" que a 3/4; sem Fácil. |
| 6 | Đấu trường gà | 18 | - | ⏱️ 0/3 (>200s) | ⏱️ 0/3 (>180s) | ⏱️ 0/3 (>185s) | A mais lenta do catálogo pros bots do sweep — candidata a investigar primeiro numa próxima rodada (pode ter um objetivo que não é "matar tudo"). |
| 7 | Giải cứu gà con | 9 | ✅ | ⚠️ 1/3 fases mas termina (18s) | ⏱️ 2/4 fases, não converge | - | Fácil ok; Normal roda até o fim mas só limpa 1 de 3 fases (bots perdem) — Difícil não converge no tempo. |
| 8 | Rừng rậm Gamazon | 8 | 🐞 ⚠️ | - | - | - | **Corrigido nesta tarefa**: crash de interpolação de string na missão de abertura (não travava mais em `OnPrepareNewSession`). Desbloqueou 2 bugs NOVOS na sequência, ainda abertos: `apprenticePlayer`/`masterPlayer` null em `OnPrepareNewGame`, `Game.FindSingleSimpleBossID` nunca implementado em `PveGame` — ver §1.3. |
| 9 | Hoang mạc Xatara | 12 | 🐞 ⚠️ | - | - | - | Mesma classe de bug/correção que a 8 (`XDS901`). |
| 10 | Lâu đài Daucula | 15 | 🐞 | - | - | - | Mesma correção (`DTS701`); só bate no `BoltMove` null, não precisa de `FindSingleSimpleBossID`. |
| 11 | Vịnh Cariga | 18 | ✅ | - | - | - | Única dificuldade, limpa (cadeia curta, ~0ms). |
| 12 | Vòng xoáy thời gian | 30 | ⏱️ 0/4 | ⏱️ 0/4 | ⏱️ 0/4 | ⏱️ 0/4 | Nenhuma dificuldade converge no orçamento do sweep, nem Fácil — masmorra de nível 30, provavelmente objetivo/mecânica especial (não "matar tudo"), não confirmado bug. |
| 13 | Đấu Trường Dũng Sĩ | 30 | ⏱️ 2/4 | ⏱️ 2/4 | ⏱️ 2/4 | ⏱️ 2/4 | Mesmo padrão da 12 — sempre trava exatamente na fase 3 de 4 em toda dificuldade, o que É um sinal mais forte de bug/mecânica específica que vale investigar (não aleatório). |
| 14 | Tàu Hải Tặc | 8 | ✅ | - | - | - | Única dificuldade, limpa; carta sem item (gap de dado, §1.2). |
| 38 | Huyệt Ma Kiến Ác Mộng (Pesadelo) | 45 | ✅ | ✅ | ✅ | ✅ | Limpo nas 4 dificuldades, cadeias curtas (~0ms). |
| 39 | Giải Cứu Gà Con Ác Mộng (Pesadelo) | 45 | ✅ | ✅ | ✅ | ✅ | Idem 38. |

## Outros itens do relato do dono (não são por-masmorra)

| Item | Status | Onde |
|---|---|---|
| 3. "Pular pro chefe" (isOpenBoss) | ✅ corrigido | `apps/game/src/handlers/salas/configurar-sala.ts` `lastFloorForBoss` — porta `RoomSetupChangeAction.GetLastFloor` (C#), usa `Pve_Info.LastFloor`. Testado (`pve-instancias.test.ts`). |
| 4. Nomes da masmorra no modal em outro idioma | ✅ corrigido (patch) | `tools/as3-to-ts/patches/room/view/chooseMap/DungeonChooseMapView.ts.json` — o título era só um bitmap (`image/map/<ID>/icon.png`, arte nunca traduzida); agora o nome traduzido (`Pve_Info.Name`, já 100% PT-BR no banco) aparece como texto no painel de descrição. Verificado no cliente real (ver screenshots). |
| 5. Masmorras "simplesmente travadas" mesmo nível 60 | ✅ corrigido | `apps/game/src/db/pve-progress.ts` `syncPvePermission` — garante os 50 caracteres de `PvePermission` SEMPRE no login, não só quando `setPvePermission` tem uma vitória registrada pra aplicar. Sem isso, `PVEMapPermissionManager.getPermission` (cliente, `substr` além do fim da string = `""`) trata QUALQUER masmorra de índice alto como travada — inclusive Fácil. Testado em `pve-instancias.test.ts` ("login sempre garante PvePermission com 50 caracteres"). Essa é a causa raiz da "Castelo Sombrio" (`Pve_Info` 4) do relato do dono. |

## Verificação no cliente real (item 6)

Playwright headless (Chromium, `chromium.launch()`, contexto novo — nunca MCP/perfil real) contra
`apps/client` (porta 5181, próprio worktree) falando com o `apps/api`/`apps/game` do dono (8080/9200/9300,
não parados). Contas de teste próprias (`pveqa_tester*`, senha só neste ambiente, nunca commitada).

- ✅ Criação de personagem, hall (todo PT-BR: Hall da Fama, Campo de Treino, Forja, Academia, Leilão, Shop,
  Expedição, Termas, Sociedade, Igreja, Sala de Jogos, Fazenda, Evento) — screenshot `hall.webp`.
- ✅ Loja (Shopping): abas, moedas, cards de item — todo PT-BR — screenshot `shop.webp`.
- ✅ Modal "Criar sala" → aba "Explorar"/"Competitivo" abre corretamente.
- ⚠️ Não cheguei a capturar o modal de ESCOLHA DE MASMORRA (`DungeonChooseMapView`, o que o fix do item 4
  mexe) nem uma luta/chefe/tela de carta REAIS no cliente headless — automação de clique nesse fluxo
  específico (checkbox "Explorar" dentro do diálogo "Criar sala") ficou instável entre sessões
  (overlay "NEWGUN" recorrente cobrindo o diálogo em alguns runs). O fix do item 4 foi verificado por
  LEITURA do código-fonte AS3 + teste do patch aplicado corretamente (`grep` confirma a patch no arquivo
  gerado), não por screenshot do modal em si — pendente uma sessão dedicada de Playwright com mais tempo
  pra estabilizar esses cliques (ou testar manualmente).

## Como atualizar esta tabela

```
cd packages/fight && npx vitest run test/pve-playthrough-sweep.test.ts --maxWorkers=1 --reporter=verbose
```

Procure linhas `pve playthrough sweep: Pve <id> (<nome>) hardLevel <n>: <motivos>` no output — ausência de
linha pra um combo = passou em tudo. `hardLevel`: 0 Fácil, 1 Normal, 2 Difícil, 3 Terror, 4 Épico, 5
Pesadelo (ladder completo em `packages/fight/src/pve/game.ts`).

## Como rodar a varredura

`PVE_SWEEP=1 pnpm --filter @ddt/fight exec vitest run test/pve-playthrough-sweep.test.ts` — fora da suíte normal porque o bot é aleatório e algumas masmorras às vezes não fecham no orçamento de tempo (Pve 6 e 7 em algumas dificuldades oscilam entre passar e falhar).
