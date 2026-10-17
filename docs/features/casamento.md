# Casamento (Igreja)

## 1. O que é no jogo
A **Igreja** (menu "Casamento"): um jogador propõe casamento a outro, os dois
aceitam, e o casal pode comprar/alugar uma **sala de casamento** (capela) pra
celebrar a cerimônia — convidar amigos, soltar fogos, usar a lareira, trocar
anel. Dá pra **divorciar** depois. Fora da sala tem o **mural de casamentos**
(propostas publicadas, tipo "quadro de recados" com pedidos de noivado) e o
**tempo juntos online** (bônus por ficar logado junto com o cônjuge).

## 2. Onde fica no código
`apps/game/src/handlers/casamento/` com 1 arquivo por ação do jogo (nome = o
que o jogador vê na tela): `infra.ts` (sem tela própria, infra compartilhada),
`pedir-casamento.ts`, `divorcio.ts`, `status.ts` (consultas sem tela própria),
`mural.ts`, `capela.ts`, `cerimonia.ts` (dentro da sala), `stubs.ts`, `index.ts`.

| Ação (cliente AS3) | Pacote | Servidor TS | C# original | Tabelas |
|---|---|---|---|---|
| `sendMarryStatus` — ver se um jogador é casado | 246 MARRY_STATUS | [`marryStatus`](../../apps/game/src/handlers/casamento/status.ts#L16) `status.ts:16` | — | `player."Sys_Users_Detail"` |
| `sendMarryApply` — propor casamento | 247 MARRY_APPLY | [`marryApply`](../../apps/game/src/handlers/casamento/pedir-casamento.ts#L17) `pedir-casamento.ts:17` | — | — |
| `sendMarryApplyReply` — aceitar/recusar proposta | 250 MARRY_APPLY_REPLY | [`marryApplyReply`](../../apps/game/src/handlers/casamento/pedir-casamento.ts#L46) `pedir-casamento.ts:46` | — | `player."Sys_Users_Detail"` (grava cônjuge) |
| `sendUnmarry` — divorciar | 248 DIVORCE_APPLY | [`divorceApply`](../../apps/game/src/handlers/casamento/divorcio.ts#L16) `divorcio.ts:16` `DivorceApplyHandler.cs` | `player."Sys_Users_Detail"` |
| `sendMateTime` — tempo online junto | 85 MATE_ONLINE_TIME | [`mateOnlineTime`](../../apps/game/src/handlers/casamento/status.ts#L26) `status.ts:26` `MateTimeHandler.cs` | `player."Sys_Users_Extra"` |
| Publicar pedido no mural | 236 MARRYINFO_ADD | [`marryInfoAdd`](../../apps/game/src/handlers/casamento/mural.ts#L20) `mural.ts:20` | — | `game."Marry_Info"` (ou equivalente) |
| Ver detalhe de um pedido do mural | 235 MARRYINFO_GET | [`marryInfoGet`](../../apps/game/src/handlers/casamento/mural.ts#L32) `mural.ts:32` | — | — |
| Editar seu próprio pedido (board) | 237 MARRYINFO_UPDATE | [`marryInfoUpdate`](../../apps/game/src/handlers/casamento/mural.ts#L40) `mural.ts:40` | — | — |
| Apagar pedido do mural | 234 MARRYPROP_GET | [`marryInfoDelete`](../../apps/game/src/handlers/casamento/mural.ts#L52) `mural.ts:52` `MarryInfoDeleteHandler` | — | — |
| `sendMarryRoomLogin` — entrar na tela da capela | 240 MARRY_SCENE_LOGIN | [`marrySceneLogin`](../../apps/game/src/handlers/casamento/capela.ts#L21) `capela.ts:21` `UserEnterMarrySceneHandler.cs` | — |
| `sendCreateRoom` — comprar/criar sala de casamento | 241 MARRY_ROOM_CREATE | [`marryRoomCreate`](../../apps/game/src/handlers/casamento/capela.ts#L28) `capela.ts:28` `MarryRoomCreateHandler.cs` | `Marry_Room_Info` |
| `sendEnterRoom` — entrar na sala (própria ou de outro casal) | 242 MARRY_ROOM_LOGIN | [`marryRoomLogin`](../../apps/game/src/handlers/casamento/capela.ts#L62) `capela.ts:62` `MarryRoomLoginHandler.cs` | — |
| `sendExitRoom` — saír da sala | 244 PLAYER_EXIT_MARRY_ROOM | [`playerExitMarryRoom`](../../apps/game/src/handlers/casamento/capela.ts#L74) `capela.ts:74` `UserLeaveMarryRoom.cs` | — |
| `sendSceneChange` — trocar de cenário dentro da capela | 233 MARRY_SCENE_CHANGE | [`marrySceneChange`](../../apps/game/src/handlers/casamento/capela.ts#L82) `capela.ts:82` `MarrySceneChangeHandler.cs` | — |
| `sendCurrentState` — estado atual da sala | 251 SCENE_STATE | [`sceneState`](../../apps/game/src/handlers/casamento/capela.ts#L92) `capela.ts:92` `MarryStateHandler.cs`, `"partial"` | — |
| `sendModifyChurchDiscription` — editar nome/senha/descrição da sala | 253 MARRY_ROOM_INFO_UPDATE | [`marryRoomInfoUpdate`](../../apps/game/src/handlers/casamento/capela.ts#L100) `capela.ts:100` `MarryRoomInfoUpdateHandler.cs` | `Marry_Room_Info` |
| Movimento/convite/cerimônia dentro da sala (sub-router) | 249 MARRY_CMD | [`marryCmdRouter`](../../apps/game/src/handlers/casamento/cerimonia.ts#L16) `cerimonia.ts:16`, registro em `index.ts` `"partial"` | `MarryDataHandler.cs` | — |
| `sendChurchMovieOver` — cinemática de casamento terminou | 167 CHURCH_MOVIE_OVER | [`churchMovieOver`](../../apps/game/src/handlers/casamento/stubs.ts#L16) `stubs.ts:16` | **dead code em ambos** (ver nota) | — |

`249 MARRY_CMD` é um guarda-chuva (`marryCmdRouter()`, `cerimonia.ts:16`) com
sub-ações: `MOVE(1)`/`POSITION(10)` (andar na sala), `HYMENEAL(2)` (iniciar
cerimônia), `CONTINUATION(3)`, `INVITE(4)` (convidar amigo pra sala),
`LARGESS(5)` (presentear/doar na festa), `USEFIRECRACKERS(6)` (fogos),
`KICK(7)`, `FORBID(8)`, `GUNSALUTE(11)` (salva de tiro/confete).

> **167 CHURCH_MOVIE_OVER é dead code confirmado em ambos os lados**: nenhum
> arquivo AS3 em `Source Flash/src` chama esse pacote, e o C# só declara o
> código no enum `ePackageType.cs:66` sem nenhuma classe handler registrada.
> O port adiciona um stub seguro (lê os bytes, loga, não faz nada) só pra
> `packet-coverage.mjs` não listar como `MISSING` — não existe comportamento
> real pra espelhar. Ver `research/qa/port-D.md` e cabeçalho de `stubs.ts`.

## 3. Fluxo passo a passo

### Propor e aceitar
1. Jogador A clica em "Propor casamento" no outro jogador: `247 MARRY_APPLY`
   com `targetId` + mensagem/manifesto. `marryApply` (`pedir-casamento.ts:17`)
   confere que nenhum dos dois já é casado e manda a notificação pro jogador B
   (`applyNoticePacket`, `infra.ts:84`).
2. Jogador B responde: `250 MARRY_APPLY_REPLY` com `accept`. Se `true`,
   `marryApplyReply` (`pedir-casamento.ts:46`) grava `SpouseID`/`IsMarried`
   em `Sys_Users_Detail` dos dois (via `marryPropPacket`, `infra.ts:75`).

### Comprar e usar a sala (capela)
1. Casal entra na tela da igreja: `240 MARRY_SCENE_LOGIN`
   (`marrySceneLogin`, `capela.ts:21`).
2. Um dos dois compra sala própria: `241 MARRY_ROOM_CREATE`
   (`marryRoomCreate`, `capela.ts:28`) — cria linha em `Marry_Room_Info`,
   vira `ChapelRoom` em memória (`rooms()`, `infra.ts:47`).
3. Casal e convidados entram: `242 MARRY_ROOM_LOGIN` com o `roomId` (`0` =
   sala própria) e senha opcional (`marryRoomLogin`, `capela.ts:62`).
4. Dentro da sala: `249 MARRY_CMD` sub `2` (`HYMENEAL`) inicia a cerimônia
   (`hymenealPacket`, `infra.ts:98`); sub `4` (`INVITE`) convida mais
   gente; sub `6`/`11` tocam efeitos (fogos/salva); sub `1`/`10` movem o
   personagem na cena — tudo em `cerimonia.ts`.
5. `251 SCENE_STATE` (`sceneState`, `capela.ts:92`) devolve o estado atual
   pra quem acabou de entrar/reconectar (`roomInfoPacket`, `infra.ts:64`).
6. Saír: `244 PLAYER_EXIT_MARRY_ROOM` (`playerExitMarryRoom`, `capela.ts:74`).

### Mural de casamentos (board)
1. Publicar pedido: `236 MARRYINFO_ADD` (`marryInfoAdd`, `mural.ts:20`).
2. Ver detalhe de um pedido de outro jogador: `235 MARRYINFO_GET`
   (`marryInfoGet`, `mural.ts:32`).
3. Dono edita o próprio: `237 MARRYINFO_UPDATE` (`marryInfoUpdate`,
   `mural.ts:40`) — **não confundir com `253 MARRY_ROOM_INFO_UPDATE`**, que
   edita a sala/capela (`capela.ts:100`); o port documenta e corrige uma
   colisão do C# original, que ligava os dois a um único código `237` (ver
   `research/qa/port-D.md` e cabeçalho de `mural.ts`/`index.ts`).
4. Apagar: `234 MARRYPROP_GET` (`marryInfoDelete`, `mural.ts:52`).

### Divórcio e tempo online junto
1. `248 DIVORCE_APPLY` (`divorceApply`, `divorcio.ts:16`) com `discount` (se
   usa item de desconto na taxa). Confirma casamento, zera
   `SpouseID`/`IsMarried` dos dois, aplica taxa salvo desconto.
2. `85 MATE_ONLINE_TIME` (`mateOnlineTime`, `status.ts:26`) é consultado
   periodicamente enquanto os dois estão online ao mesmo tempo — acumula em
   `Sys_Users_Extra` pro bônus de "tempo juntos".

## 4. Quero mudar…
- **Preço/taxa de divórcio**: `PRICE_DIVORCED`/`PRICE_DIVORCED_DISCOUNT`
  (`infra.ts`, lidas via `ctx.templates.cfgInt`) usadas dentro de
  `divorceApply` (`divorcio.ts:16`) — `discount` troca a taxa normal por uma
  com item.
- **Preço da sala de casamento**: `PRICE_MARRY_ROOM()` (`infra.ts`) usada
  dentro de `marryRoomCreate` (`capela.ts:28`).
- **Limite de nível pra casar/comprar sala**: `limitLevel()`
  (`infra.ts:30`) — confere `Grade` mínimo por `index` de ação.
- **Mensagens/textos do mural**: tabela usada por `MARRYINFO_*`
  (`mural.ts`) — ler o corpo pra identificar a tabela/coluna exata.
- **Corrigir a colisão 237 (board vs capela)** só existe no C# original — o
  port já separa os dois corretamente (`mural.ts` vs `capela.ts`); não
  precisa mexer, só saber que é por isso que `237` e `253` fazem coisas
  diferentes aqui.

## 5. Testes
- `apps/game/test/marriage-farm-auction.test.ts` (compartilhado com
  [fazenda.md](./fazenda.md) e [leilao.md](./leilao.md) — citando só os
  blocos de casamento):
  - `describe("248 DIVORCE_APPLY")`.
  - `describe("247/250 MARRY_APPLY / MARRY_APPLY_REPLY")`.
  - `describe("85 MATE_ONLINE_TIME")`.
- Status: **OK** (`"partial"` só no registro de `249 MARRY_CMD` e `251
  SCENE_STATE` porque algumas respostas de sub-código da capela são
  "melhor esforço" — o comportamento de dinheiro/estado/banco está testado e
  correto; a renderização visual exata de alguns sub-replies da capela não
  foi confirmada contra o leitor AS3, ver nota em `research/qa/port-D.md`).
  `167 CHURCH_MOVIE_OVER` é dead code documentado, não uma lacuna.
