# Missões

## 1. O que é no jogo
A janela **Missões** (`TaskMainFrame`, botão de missão no HUD) lista as missões ativas
do jogador, mostra o progresso de cada condição e deixa clicar em **Concluir** quando
tudo está pronto para pegar a recompensa. É o sistema de quest tradicional: aceitar,
progredir jogando/comprando/forjando, e resgatar.

Duas telas relacionadas que **não** são tratadas aqui:
- **Campo de treino** (boneco de treino / `FightLib`) e **trainer** (`WeakGuildManager`/
  `TrainerGameView`, tutorial dos primeiros passos) são um submodo de sala de batalha —
  ver [salas-batalha.md](./salas-batalha.md).
- `InfoCollectView` (tela de "verificar celular/SMS" que aparece em algumas missões) manda
  o pacote `32 COLLECTINFO`, mas a validação real vai por HTTP (`SendActiveKeySystem.ashx`,
  **não portado** — precisaria de um gateway de SMS de verdade); o servidor só lê e
  descarta esse pacote.

## 2. Onde fica no código
| Ação | Pacote | Servidor TS | C# original | Tabelas |
|---|---|---|---|---|
| Aceitar missão(ões) | 176 QUEST_ADD | [`aceitarMissoes`](../../apps/game/src/handlers/missoes/aceitar-missao.ts#L13) `missoes/aceitar-missao.ts:13` → [`QuestInventory.add`](../../apps/game/src/game/quests.ts#L130) `game/quests.ts:130` | `vendor/DDTank41/Game.Server/Packets/Client/QuestAddHandler.cs` | `game."Quest"`, `game."Quest_Condiction"`, `game."Quest_Goods"` |
| Abandonar missão | 177 QUEST_REMOVE | [`abandonarMissao`](../../apps/game/src/handlers/missoes/abandonar-missao.ts#L11) `missoes/abandonar-missao.ts:11` → [`QuestInventory.remove`](../../apps/game/src/game/quests.ts#L251) `game/quests.ts:251` | `vendor/DDTank41/Game.Server/Packets/Client/QuestRemoveHandler.cs` | — |
| Concluir/resgatar missão | 179 QUEST_FINISH | [`entregarMissao`](../../apps/game/src/handlers/missoes/entregar-missao.ts#L20) `missoes/entregar-missao.ts:20` → [`QuestInventory.finish`](../../apps/game/src/game/quests.ts#L270) `game/quests.ts:270` | `vendor/DDTank41/Game.Server/Packets/Client/QuestFinishHandler.cs` | `player."QuestData"` |
| Progresso de condição controlada pelo cliente (`ClientModifyCondition`, tipo 20) | 181 QUEST_CHECK | [`progressoMissao`](../../apps/game/src/handlers/missoes/progresso-missao.ts#L13) `missoes/progresso-missao.ts:13` → [`QuestInventory.clientModify`](../../apps/game/src/game/quests.ts#L361) `game/quests.ts:361` | `vendor/DDTank41/Game.Server/Packets/Client/QuestCheckHandler.cs` | — |
| Verificação de SMS/celular (`InfoCollectView`) | 32 COLLECTINFO | [`registerMissoesStubs`](../../apps/game/src/handlers/missoes/stubs.ts#L23) `missoes/stubs.ts:23` — **stub**, lê e descarta | — | — |
| Modelo de estado em memória de todas as missões do jogador | — | [`QuestInventory`](../../apps/game/src/game/quests.ts#L41) `game/quests.ts:41` (classe inteira) | `Game.Server/Quests/QuestInventory.cs` + `BaseQuest.cs` + `BaseCondition.cs` | `player."QuestData"` |

> `docs/MAPA-DO-JOGO.md` tem a seção `## Missões` com a visão "tela do cliente → pacote",
> gerada automaticamente a partir do AS3 (`quest/TaskMainFrame.as`, `quest/InfoCollectView.as`).

## 3. Fluxo passo a passo

### Aceitar uma missão
1. O cliente manda `176 QUEST_ADD` com a lista de ids que ele acha que pode aceitar
   (o cliente decide quando mostrar o botão "Aceitar"; o servidor é quem valida de
   verdade — o cliente pode mandar uma lista errada sem risco).
2. `aceitarMissoes` (`missoes/aceitar-missao.ts:13`) lê `n` + `n` ints e chama
   `p.questInv.add(id)` para cada um.
3. `QuestInventory.add` (`game/quests.ts:130`) confere, na ordem: a missão existe
   (`t.quests.get(questId)`), janela de tempo (`TimeMode`/`StartDate`/`EndDate`),
   nível mínimo/máximo (`NeedMinLevel`/`NeedMaxLevel`), pré-requisito (`PreQuestID`,
   lista separada por vírgula — toda precisa estar em `isQuestFinish`), requisito de
   guilda/casamento (`IsOther` 1 = precisa estar em guilda, 2 = precisa ser casado), se
   já está ativa ou já foi concluída (e se pode repetir, se ainda tem `RepeatFinish`
   sobrando no ciclo). Qualquer falha retorna uma chave de erro (`Game.Server.Quests.*`)
   e a missão não é aceita — nenhum pacote de erro específico é mandado (o cliente só
   não atualiza a lista).
4. Se passou tudo: cria/reaproveita a linha `QuestDataRow`, zera as condições
   (`reset()`, que seta `Condition1..4` conforme `Para2` de cada `Quest_Condiction` —
   exceto tipo 20 `ClientModifyCondition`, que começa em `1`), e marca a missão como
   "mudou" (`touch`/`flush`).
5. `flush()` manda `178` (pacote interno, não tem handler de entrada — é só saída) com
   as missões que mudaram + o bitmap de "já concluídas" (`states`). O cliente usa isso
   pra desenhar a lista.

### Progredir uma missão (durante o jogo)
As condições **não** são todas verificadas da mesma forma — `condCompleted()`
(`game/quests.ts:180`) tem um `switch` por `CondictionType`:
- **Checadas "na hora"** (ex. nível `1`, item equipado `2`, item possuído `14/15`,
  casado `17`, guilda/riqueza/forja/loja/banco `18`): a cada vez que `canCompleted`
  roda, ele olha o estado atual do jogador (`p.info.Grade`, `p.equipBag`, etc.) — não
  precisa de nenhum gancho externo.
- **Contadores que descem até 0** (vitórias, kills, uso de item, fortalecer, fusão,
  compor, incrustar gema, casamento, equipar peça nova...): algum outro handler chama
  um método `onX` de `QuestInventory` quando o evento acontece, e esse método decrementa
  o `Condition` daquela missão com `dec()`. Ganchos existentes:
  - `onGameOver` (`:386`) — fim de partida PvP/PvE: vitórias (`5/6/23/24`), kills
    (`4/22`), partidas 2v2 (`30/34`). Chamado pelo motor de luta via `GamePlayer`.
  - `onMissionOver` (`:406`) — missão PvE concluída dentro do turno limite (`21`).
  - `onPaid` (`:414`) — gasto em dinheiro/ouro/offer/giftToken/item na loja (`10`).
  - `onItemStrengthen`/`onItemCompose`/`onItemFusion`/`onUsingItem`/`onItemInsert`/
    `onMarried`/`onNewGear` — chamados pelos handlers de forja (`forge.ts`), uso de
    item, casamento (`marriage.ts`) e equipar item novo (`player.ts:125`).
- **`ClientModifyCondition` (tipo 20)**: o próprio cliente manda `181 QUEST_CHECK` com
  o valor calculado localmente (ex. progresso de um minigame). O servidor só grava o
  valor, sem validar — é o único tipo de condição onde o cliente decide.
- Qualquer `CondictionType` fora dessa lista cai no `default: return false` — a condição
  nunca progride (comportamento igual ao `UnknowQuestCondition` do C#, documentado no
  topo de `game/quests.ts`).

### Concluir e resgatar a recompensa
1. Cliente manda `179 QUEST_FINISH` com `{id, selectedItem}` (`selectedItem` é qual
   prêmio escolher quando a missão tem recompensas opcionais).
2. Handler (`missoes/entregar-missao.ts:20`) tem um throttle de 1s por jogador
   (`lastFinish`) pra não processar clique duplicado.
3. `QuestInventory.finish` (`:270`) confere bolsa com espaço, `canCompleted()` (todas as
   condições obrigatórias com `0`, ou condições opcionais suficientes conforme
   `NotMustCount`), monta os itens de `Quest_Goods` (filtrando por sexo/`IsSelect`),
   entrega ouro/dinheiro/giftToken/offer/GP/riqueza de guilda/buff (`RewardBuffID`), e —
   se a missão não é repetível — remove da lista ativa; se é repetível, decrementa
   `RepeatFinish` e reseta as condições pro próximo ciclo.
4. Responde `179 {id}` só em caso de sucesso — se não pôde concluir, o cliente não
   recebe nada e o botão simplesmente não reage.
5. **Salva imediatamente** (`await p.saveIntoDatabase(ctx.db.db)`), não espera o
   autosave de ~10 min — junto com resgate de correio e pagamento de guilda, é
   tratado como "mesma classe de risco de duplicação em caso de crash" (ver comentário
   no topo de `missoes/entregar-missao.ts`).

## 4. Quero mudar…
- **O que uma missão exige / dá de recompensa**: tabela `game."Quest"` (linha da
  missão: `NeedMinLevel`, `NeedMaxLevel`, `RewardGold`, `RewardGP`, `RewardOffer`,
  `RewardGiftToken`, `RewardRiches`, `RewardBuffID`/`RewardBuffDate`, `CanRepeat`,
  `RepeatInterval`, `RepeatMax`...) — editável no admin em **Missões**
  (`apps/admin/src/resources/content.ts:59`, recurso `quests`, rota
  `/api/admin/quests`).
- **As condições de uma missão** (o que precisa fazer): tabela `game."Quest_Condiction"`
  — admin **Condições de missão** (`content.ts:99`, recurso `quest-conditions`). Cada
  linha tem `CondictionType` (ver a lista comentada em `game/quests.ts:1-14` pra saber o
  que cada tipo verifica) + `Para1`/`Para2` (parâmetros, o significado depende do tipo).
- **Os itens que a missão dá**: tabela `game."Quest_Goods"` — admin **Prêmios de missão**
  (`content.ts:120`, recurso `quest-goods`).
- **Adicionar um novo gancho de progresso** (ex. uma condição de tipo ainda não ligado
  a nenhum evento real, caída no `default` de `condCompleted`): achar onde o evento
  acontece no handler certo (forja, loja, farm, pets...) e chamar o método `onX`
  correspondente de `QuestInventory` — ou criar um novo método seguindo o padrão de
  `onItemStrengthen`/`onMarried` se o evento ainda não tem gancho.
- **Throttle de QUEST_FINISH**: constante `1000` (ms) inline em
  `missoes/entregar-missao.ts` (`(lastFinish.get(p) ?? 0) + 1000 > now`).
- **Mensagem de bolsa cheia ao concluir**: chave de tradução
  `Game.Server.Quests.BagFull`, lida em `finish()` (`game/quests.ts:276` e `:306`).

## 5. Testes
- `apps/game/test/quests.test.ts` — `describe("quests (176/177/179/181)")`: aceita
  missão por `QUEST_ADD`, progride por `onGameOver`, resgata por `QUEST_FINISH` (com
  throttle de 1s testado), confere persistência em `player."QuestData"`; mais dois
  testes de regressão específicos — missão de guilda repetível (riqueza + GP + ouro +
  offer + medalha) e recompensa de buff (`RewardBuffID`/`RewardBuffDate`).
- Status: **OK** — aceitar/abandonar/progredir (a maioria dos tipos de condição
  listados no topo de `game/quests.ts`)/concluir/persistir. **Falta**: `32 COLLECTINFO`
  (depende de gateway de SMS externo, fora do escopo do servidor de jogo) e as
  condições cujo gatling ainda não foi plugado no motor de luta/módulos não portados
  (monster kill tipo `13`, pets, farm, casamento avançado, achievements — ver lista
  "Other condition types" no topo de `game/quests.ts`), que ficam visíveis na UI mas
  nunca progridem (`UnknowQuestCondition`, mesmo comportamento do C# original pra
  módulo não implementado).
