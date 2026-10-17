# Lobby

## 1. O que é no jogo
Tela principal depois do login: o personagem parado no salão, com os ícones de
eventos ao redor (baú da galinha, roleta, boss mundial, VIP...), o botão **Prêmio
diário** e os botões de entrar em **Sala/Lista de salas**. É a "home" de onde o
jogador abre todas as outras janelas.

## 2. Onde fica no código
| Cliente (AS3) | Pacote | Servidor TS | C# original | Tabelas |
|---|---|---|---|---|
| `hall/HallStateView.as` → `sendSceneLogin` | 16 SCENE_LOGIN | [`sceneLogin`](../../apps/game/src/handlers/basico/cena.ts#L12) `handlers/basico/cena.ts:12` | `UserEnterSceneHandler.cs` | `player."Sys_Users_Detail"` |
| `hall/HallStateView.as` → `sendDailyAward` | 13 DAILY_AWARD | [`DAILY_AWARD`](../../apps/game/src/handlers/events.ts#L560) `handlers/events.ts:560` | `DailyAwardHandler.cs` | `game.Daily_Award`, `player."Sys_Users_Detail"` |
| `hall/HallStateView.as` → `createUserGuide` | 94 GAME_ROOM | [`rr`](../../apps/game/src/handlers/rooms.ts#L151) `handlers/rooms.ts:151` | `GameRoomHandler.cs` | — (salas são em memória) |
| Ícones de evento do lobby (`hallIcon/view/HallRightIconView.as`) | 15 USER_ANSWER | não portado (ver nota) | `UserAnswerHandler.cs` | — |

Cada ícone individual (baú da galinha, roleta, boss mundial, VIP, calendário...) é
sua própria feature — ver [eventos.md](./eventos.md), [boss-mundial.md](./boss-mundial.md),
[vip.md](./vip.md).

> Nota sobre `15 USER_ANSWER` ("FALTA PORTAR" no mapa): é o heartbeat anti-cheat
> (`syncWeakStep`/`syncStep`, checagem de passo do minigame de captcha do hall) — não
> afeta gameplay além de detectar bot; aparece "FALTA PORTAR" em quase toda tela porque
> o botão existe em várias janelas (`docs/MAPA-DO-JOGO.md` lista uma linha por arquivo
> AS3 que chama a função).

## 3. Fluxo passo a passo
1. Login termina (ver [login-conta.md](./login-conta.md)) → cliente entra no hall e
   manda `16 SCENE_LOGIN` com `hall=1` (estado "Manual") ou `2` ("Away").
2. `basico/cena.ts:12` muda `p.playerState` e chama `ctx.rooms.enterWaitingRoom(p)` — o
   jogador passa a aparecer pra outros na lista de jogadores do hall.
3. Clicar **Prêmio diário** manda `13 DAILY_AWARD` sub `5` → `events.ts` confere se já
   recebeu hoje, dá a recompensa de `game.Daily_Award`, marca `player."Sys_Users_Detail".LastAward`.
4. Clicar **Sala**/**Criar sala** manda `94 GAME_ROOM` → `rooms.ts:151` cria/entra numa
   sala em memória (ver [salas-batalha.md](./salas-batalha.md)).

## 4. Quero mudar…
- **O que o prêmio diário dá**: tabela `game."Daily_Award"` (seed
  `packages/db/seed/game/Daily_Award.json.gz`). Ainda sem recurso dedicado no admin —
  edite via SQL ou crie um `ResourceDef` em `apps/admin/src/resources/event-systems.ts`
  (já tem `dailyAward` registrado lá, nome `daily-award`, rota `/api/admin/daily-award`).
- **Quais abas/ícones aparecem no hall**: isso é layout do cliente Flash
  (`hall/HallStateView.as`), não dá pra mudar sem editar/recompilar o SWF.

## 5. Testes
- `apps/game/test/handlers.test.ts` (`describe("login")`, `describe("ping / sync / speed check")`) cobre entrada no hall e SCENE_LOGIN.
- Prêmio diário/eventos: ver [eventos.md](./eventos.md) seção 5.
- Status: **OK** (login/entrada no hall, prêmio diário); ícones individuais variam (ver docs próprios).
