# 3. Referência de API do servidor (estilo Javadoc)

Assinaturas tiradas direto do código (`apps/game/src/**`, `packages/fight/src/**`). Quando o
método espelha um original C#, o comentário do próprio arquivo já cita o arquivo/linha —
procure por esse comentário se precisar confirmar comportamento exato. **Não invente
assinatura**: se o método que você precisa não está aqui, abra o arquivo citado — a lista
abaixo é um recorte dos mais usados, não o arquivo inteiro.

## `GamePlayer` (`apps/game/src/game/player.ts`)

Representa um jogador logado (equivalente ao `GamePlayer.cs` original). Acessível em todo
handler como o 2º argumento de `r.player(code, name, (ctx, p, pkt) => ...)`.

| Membro | Assinatura | O que faz |
|---|---|---|
| `info` | `PlayerInfo` | Linha de `player."Sys_Users_Detail"` em memória (`Gold`, `Money`, `Grade`, `NickName`...). Mudar aqui e chamar `updateProperties()`/`beginChanges()+commitChanges()` quando precisar recalcular stats. |
| `addGold(v)` | `(v: number): void` | Soma ouro (`Gold`), satura em `I32_MAX`, chama `updateProperties()`. |
| `addMoney(v)` | `(v: number): void` | Soma cupom (`Money`). |
| `removeMoney(v)` | `(v: number): void` | Debita cupom (`player.ts:450`). |
| `addGiftToken(v)` | `(v: number): void` | Soma medalha de presente (`GiftToken`). |
| `addHonor(v)` | `(v: number): void` | Soma Honra (totem). |
| `addMedal(v, find)` | `(v: number, find: (id)=>ItemTemplate\|undefined): void` | Soma medalhas convertendo item. |
| `addHardCurrency(v)` | `(v: number): void` | Moeda "forte" (evento). |
| `addGP(v, useMultiple?)` | `(v: number, useMultiple = true): void` | XP (GP); `useMultiple` aplica bônus de evento/VIP. |
| `addTemplateToBag(item, bagType, count)` | `(item: ItemInfo, bagType: number, count: number): boolean` | Insere item na bolsa (`BagType` 0=equip,1=prop,5=caddy,11=clã...), `false` se não achou espaço. |
| `getInventory(bagType)` | `(bagType: number): PlayerInventory \| null` | Acessa uma bolsa pra ler/mover slots. |
| `setPvePermission(copyId, hardLevel, notify?)` | `(copyId: number, hardLevel: number, notify = true): boolean` | Libera dificuldade de uma masmorra (`PvePermission`). |
| `sendMessage(type, msg)` | `(type: number, msg: string): void` | Manda `Out.message` (chat de sistema, código 3). |
| `send(pkt)` | `(pkt: GSPacket \| PacketOut): void` | Manda um pacote qualquer já montado. |
| `updateProperties()` | `(): void` | Recalcula e reenvia stats (ataque/defesa/vida...) pro cliente. |
| `beginChanges()` / `commitChanges()` | `(): void` | Agrupa várias mudanças (ex. abrir caixa) num só save/update. |
| `questInv?.onUsingItem(templateId)` | — | Avisa o sistema de missões que um item foi usado (condição "usar item X"). |

Exemplo real (`apps/game/src/handlers/bolsa/abrir-caixa.ts:91-97`):

```ts
p.beginChanges();
if (tot.gold) p.addGold(tot.gold);
if (tot.money) p.addMoney(tot.money);
p.commitChanges();
```

## Salas (`apps/game/src/rooms/room-mgr.ts`, `room.ts`)

| Membro | Assinatura | O que faz |
|---|---|---|
| `RoomMgr.createRoom` | `(p: RoomMember, name: string, password: string, roomType: number, timeType: number): void` | Acha uma sala livre, configura (PvE seta `HardLevel`/`LevelLimits`) e entra o criador. Espelha `CreateRoomAction.cs`. |
| `RoomMgr.enterRoom` | `(p: RoomMember, roomId: number, pwd: string, hallType: number): void` | Entra numa sala existente (checa arma equipada, senha). |
| `BaseRoom.updateRoom` | `(name, password, roomType, timeType, ...): void` | Atualiza config de uma sala. |
| `BaseRoom.start()` / `.addPlayer(p)` | — | Ciclo de vida da sala. |

`RoomType` (constantes de tipo de sala) e o fluxo completo de criar/entrar/começar estão em
[`04-receitas/salas.md`](./04-receitas/salas.md).

## Motor de luta (`packages/fight/src/game/*.ts`, `packages/fight/src/pve/*.ts`)

| Classe | Arquivo | Papel |
|---|---|---|
| `BaseGame` | `game/game.ts:74` | Motor genérico de partida (turnos, física, pacotes). |
| `PvpGame` | `game/game.ts:874` | Partida PvP (extends `BaseGame`, sem mais nada — toda regra é da base). |
| `PveGame` | `pve/game.ts` | PvE: carrega fase (`Mission_Info`), roda scripts, NPCs, cartas. Porta de `PVEGame.cs`. |
| `Living` | `game/living.ts:46` | Corpo vivo genérico (jogador ou NPC): posição, vida, dano. |
| `Player` | (via `game/game.ts`) | Um jogador dentro da partida (turno, bolsa de luta, bombas). |
| `SimpleNpc` | `pve/livings.ts:103` | Monstro comum — age na "fase dos NPCs" (sem turno próprio). |
| `SimpleBoss` | `pve/livings.ts:164` | Chefe — turno próprio (como um jogador). |

### API de script PvE (mesmos nomes do C#, `packages/fight/src/pve/script.ts`/`compat.ts`)

Classes base pra herdar: `AMissionControl` (fase), `APVEGameControl` (masmorra), `ABrain`
(IA de NPC/chefe). Dentro delas, `this.Game` é a `PveGame` e `this.Body` é o `Living` (só em
`ABrain`). Métodos mais usados:

| Assinatura | Onde (classe) | O que faz |
|---|---|---|
| `Game.SetMap(mapId: number): boolean` | `pve/game.ts:1212` | Define o mapa da fase (precisa existir em `packages/fight/data/maps`). |
| `Game.LoadResources(ids: number[]): void` | `:1227` | Pré-carrega o `.swf` dos NPCs antes da fase começar. |
| `Game.LoadNpcGameOverResources(ids): void` | — | Imagem usada na tela de cartas no fim da fase. |
| `Game.CreateNpc(npcId, x, y, type, ...rest): SimpleNpc` | `:1274` | Cria um monstro comum (linha de `NPC_Info`). |
| `Game.CreateBoss(npcId, x, y, direction, type, ...rest): SimpleBoss` | `:1292` | Cria um chefe (turno próprio). |
| `Game.RemoveLiving(a: number\|Living, send?): void` | `:1375` | Remove um corpo da partida. |
| `Game.GetLivedLivings(): CsList<Living>` | `:1467` | Lista de corpos vivos (usar em `CanGameOver`). |
| `Game.GetAllFightPlayers(): CsList<Player>` | `:1396` | Jogadores ativos na partida. |
| `Game.FindNearestPlayer(x, y): Player \| null` | `:1420` | Jogador mais perto de um ponto (IA simples). |
| `Game.FindRandomPlayer(max?)` | `:1404` | Jogador aleatório (pra mirar/sincronizar atraso). |
| `Game.Random.Next(min, max)` | — | Mesmo `System.Random` do .NET — use sempre, nunca `Math.random()` (determinismo). |
| `Body.Say(msg, type, delay, finish?): void` | `pve/compat.ts:39` | Fala (balão) — assíncrono, agenda pro `delay` ms. |
| `Body.MoveTo(x, y, action, ...rest): boolean` | `:25` | Anda até um ponto. |
| `Body.ChangeDirection(a: number\|Living, delay): void` | `:32` | Vira pra um alvo/direção. |
| `Body.Beat(target, action, dmg, crit, delay, livingCount?, attackEffect?): boolean` | `:34` | Ataque corpo-a-corpo. |
| `Body.ShootPoint(x, y, ballId, minTime, maxTime, bombCount, time, delay, cb?): boolean` | `:37` | Dispara um projétil (bala `ballId`). |
| `Body.PlayMovie(action, delay, movieTime, cb?): void` | `:38` | Toca uma animação do corpo. |
| `Body.AddDelay(v): void` | `:75` | Atraso de sincronização de turno (ex. 2º chefe entra "atrasado"). |
| `Body.IsLiving: boolean` (getter) | `pve/livings.ts` | **Sempre cheque antes de acessar outro corpo** — ver o bug do tutorial [05](../guia-dev/05-tutorial-bugou-normal.md). |

Ganchos de fase (`AMissionControl`): `OnPrepareNewSession`, `OnStartGame`,
`OnNewTurnStarted`, `OnBeginNewTurn`, `CanGameOver`, `OnGameOver`, `UpdateUIData`. Ganchos de
NPC/chefe (`ABrain`): `OnCreated`, `OnBeginNewTurn`, `OnStartAttacking`, `OnStopAttacking`,
`OnAfterTakeDamage`, `OnDie`, `OnShooted`. Guia completo com exemplos:
[`docs/guides/pve.md`](../guides/pve.md).

## Templates (`apps/game/src/db/templates.ts`, classe `Templates`)

Cache em memória de toda tabela de template (recarregado por `/reload-templates`).

| Membro | Assinatura | O que faz |
|---|---|---|
| `tpl.findItem` | `(id: number) => ItemTemplate \| undefined` | Busca um item de `game."Shop_Goods"` pelo `TemplateID`. |
| `tpl.shop.get(shopId)` | `Map<number, ShopRow>` | Oferta de loja (`game."Shop"`) pelo `ID`. |
| `tpl.isOnShop(shopId)` | `(id: number) => boolean` | Se a oferta está disponível agora. |
| `tpl.itemBoxes.get(templateId)` | `Map<number, ItemBoxRow[]>` | Pool de recompensa de uma caixa (`Shop_Goods_Box`). |
| `tpl.pveDrop()` / `findDropCondition()` | — | Resolve `Drop_Condiction`/`Drop_Item` (cartas/drops de masmorra). |

## Pacotes de saída — `Out.*` (`apps/game/src/packets/out.ts`, 126 funções)

Cada função monta um `PacketOut` pronto pra `p.send(...)`. Exemplos:

```ts
export function message(type: number, msg: string): PacketOut            // 3  SYS_MESSAGE
export function inventorySlots(ownerId, bag, slots, now?, clientKind?): PacketOut // bolsa
export function playerProperty(id: number): PacketOut                     // stats
export function updateQuests(id, states, quests, clientKind?): PacketOut  // missões
export function bufferList(playerId, buffs): PacketOut                   // buffs ativos
export function loginSuccess(v, extra, now?): PacketOut                  // 1 LOGIN burst inicial
```

## i18n — `ctx.lang.t()` (`apps/game/src/util/lang.ts`, classe `LanguageMgr`)

Porta de `Bussiness/LanguageMgr.cs`: arquivo `key:value` (`apps/game/data/Language-vn.txt`),
`{0}`/`{1}` são substituídos pelos argumentos; chave ausente retorna a própria chave (nunca
quebra).

```ts
ctx.lang.t("CardUseHandler.Success")
ctx.lang.t("GPDanUser.Success", gp)   // "{0}" -> gp
```

## Testes — `loggedIn()`/`FakeClient` (`apps/game/test/helpers.ts`)

```ts
const server = await startServer();                 // GameServer real, portas efêmeras, PGlite em memória
const { c, player } = await loggedIn(server);        // cria conta + personagem + login completo
c.out(44, (p) => { p.writeInt(1); /* ... */ });       // manda um pacote (code=44)
const r = await c.code(44);                           // espera a resposta desse código
```

Detalhe completo (como criar personagem com ouro/arma específica, esperar um sub-código,
testar via TCP/WS real): [`04-receitas/testes.md`](./04-receitas/testes.md).
