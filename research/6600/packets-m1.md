# M1 — pacotes que mudaram de layout entre 4.1 e 6600 (login/hall)

> Tarefa `m1-socket` (`docs/plan/TASKS.md`, `docs/plan/MIGRACAO-6600.md` §5 M1). Cliente 6600 já conecta no
> `apps/game` e completa o handshake RSA/login (mesmo código de handshake — ver §1.4 do plano), mas quebra
> (AVM2 `Error #2030`/EOF) nos primeiros pacotes pós-login porque o código do pacote é IGUAL entre as duas
> versões mas o **layout de campos mudou** (ou, num caso, o código colidiu com outro pacote). Este arquivo
> mapeia cada pacote: código, layout 4.1 (nosso writer + fonte), layout 6600 (fonte 6600), e o fix aplicado.

## Detecção de cliente (pré-requisito)

O pacote 1 LOGIN em si **não serve de sinal**: comparado byte a byte
(`vendor/DDTank41/"Source Flash"/src/ddt/manager/GameSocketOut.as:49-74` vs
`vendor/DDT-6600/Flash_Project/DDT660/src/ddt/manager/GameSocketOut.as:103-128`), `Version.Build` (ambos
`5498628`, `ddt/Version.as`) e `DesktopManager.desktopType` (ambos default `1`) são **idênticos** nos dois
clientes — o 6600 é um fork do 4.1 que não tocou nessa parte do protocolo.

Sinal usado (já parcialmente existente, de `feat(6600): /request6600 path...`): `apps/api` já sabe qual swf
fez o boot via `ReqCtx.client` (`"41"|"6600"`, `apps/api/src/request/types.ts`, setado em
`apps/api/src/routes/request.ts` pelo `REQUEST_PATH` — `/request6600/` pro pack 6600). Esse mesmo contexto
chega em `Login.ashx` (`apps/api/src/request/endpoints/Login.ts`), que agora grava `client` na coluna nova
`app."LoginSessions"."Client"` (migration `packages/db/drizzle/0012_yummy_scourge.sql`, default `"41"`) via
`consumeWebKey(..., { client })` (`packages/auth/src/index.ts`).

A socket LOGIN (`apps/game/src/session/login.ts` `handleLogin`) lê essa coluna de volta depois de validar o
ticket: `TicketValidator.clientKindFor?(user)` (novo método opcional em `session/context.ts`,
implementado em `dbTicketValidator` via `getSession(db, user)`) retorna `s.Client ?? "41"`. O valor fica em
`GamePlayer.clientKind` (`apps/game/src/game/player-info.ts` `ClientKind = "41" | "6600"`, default `"41"`)
e em `PlayerView.clientKind` (`packets/out.ts`), lido por todo writer que precisa branchar o layout.

Por que não um switch de URL/env como mecanismo principal: um launcher desktop (TCP direto) não passa por
URL nenhuma — só HTTP (`Login.ashx`) e socket. A coluna fica gravada no momento do HTTP login (que todo
cliente, desktop ou browser, sempre faz antes de abrir o socket) e é lida de volta puramente pelo
`user,password` da socket LOGIN, sem depender de porta/URL da conexão TCP em si. Fallback de dev: nenhuma
env var adicionada — contas sem linha em `LoginSessions` (bots, DEV_ALLOW_ANY_TICKET sem HTTP login) caem no
default `"41"` (comportamento antigo, zero regressão).

## Tabela de pacotes

| # | Código | Nome | Reader AS3 4.1 | Reader AS3 6600 | Diferença | Writer (apps/game) |
|---|---|---|---|---|---|---|
| 1 | 1 | LOGIN reply | `ddt/manager/ServerManager.as:211` `__onLoginComplete` | `ddt/manager/ServerManager.as:294` `__onLoginComplete` | Ver detalhe A | `packets/out.ts` `loginSuccess` |
| 2 | 38 | UPDATE_PRIVATE_INFO | `ddt/manager/PlayerManager.as:1557` `__updatePrivateInfo` | `ddt/manager/PlayerManager.as:1991` `__updatePrivateInfo` | Ver detalhe B | `packets/out.ts` `privateInfo` |
| 3 | 67 | UPDATE_PLAYER_INFO | `ddt/manager/PlayerManager.as:1658` `__updatePlayerInfo` | `ddt/manager/PlayerManager.as:2088` `__updatePlayerInfo` | Ver detalhe C | `packets/out.ts` `publicPlayer` |
| 4 | 259 | FIRSTRECHARGE (4.1) / CONSUME_RANK (6600) | `ePackageType.as:458 FIRSTRECHARGE=259` | `ePackageType.as:600 CONSUME_RANK=259` | **Colisão de código**, não layout — ver detalhe D | `packets/out.ts` `firstRecharge` (4.1) / `consumeRankClosed` (6600, novo) |
| 5 | 102/0 | WORLDBOSS_CMD sub OPEN | `worldboss/WorldBossManager.as:151` `__initWorldBoss` | `worldboss/WorldBossManager.as:138` `__init` | Ver detalhe E | `packets/out.ts` `openWorldBoss` + `handlers/eventos/boss-mundial.ts` `worldBossOpen` |
| 6 | 137 | LEFT_GUN_ROULETTE type 1/TYPEI_ISOPEN 1 | `roulette/LeftGunRouletteManager.as:79` `__openRoulett` | `roulette/LeftGunRouletteManager.as:88` `__openRoulett` | Ver detalhe F (não é layout, é um guard de valor) | `packets/out.ts` `leftGunRouletteOpen` |

Confirmado também: `ePackageType` 1/38/67/137/102(WORLDBOSS_CMD) têm o **mesmo valor numérico** nas duas
versões (`ePackageType.as` 4.1 linhas 102/84/182/462/484 vs 6600 linhas 102/84/174/432/486) — só o 259
colide com nomes diferentes. Isso bate com o §1.1 do `MIGRACAO-6600.md` ("Códigos idênticos... LOGIN=1").

### Detalhe A — 1 LOGIN reply (94 campos no total)

Comparação campo a campo entre `ServerManager.as` 4.1 (linhas 211-343) e 6600 (linhas 294-415):

1. Depois de `Money`: 4.1 lê só `medal` (1 int) antes de `Score`; 6600 lê `BandMoney` + um int descartado
   (`pkg.readInt()` sem atribuição, linha 319) — **+1 int**. `BandMoney` é moeda nova do 6600 (não
   implementada → `0`).
2. Depois de `lastLuckNum`: 6600 insere `isOld`(bool)/`CardSoul`(int)/`GetSoulCount`(int)/
   `uesedFinishTime`(int) antes de `totemId` — **+4 campos**, nenhum implementado (card-soul não existe
   ainda) → `false`/`0`/`0`/`0`.
3. O trio do BossBox (`receiebox`/`receieGrade`/`needGetBoxTime`, nossos `BoxProgression`/`GetBoxLevel`/
   `AlreadyGetBox`) **muda de posição**: na 4.1 vem logo depois de `userGuildProgress` (antes de
   `LastSpaDate`); no 6600 vem bem depois, logo depois de `accumulativeAwardDays` (mesmos valores reais,
   só reordenados).
4. Cauda nova no 6600 (depois do trio movido): `isFirstDivorce`(int)/`PveEpicPermission`(UTF)/
   `MountsType`(int)/`PetsID`(int)/`horseRaceCanRaceTime`(int) — **+5 campos**, sistemas 6600-only
   (Montaria/PvE épico/divórcio/corrida de cavalos) ainda não implementados → `0`/`""`/`0`/`0`/`0`.
5. `fineSuitExp` (último campo da 4.1) **não existe** no 6600 (a cauda nova toma o lugar).

Confirmado contra o C# real do 6600: `vendor/DDT-6600/Source/Game.Server/Game.Base.Packets/
AbstractPacketLib.cs:450-552` `SendLoginSuccess` — mesma ordem/597 campos que o AS3 leu, inclusive os
campos "burros" que o próprio 6600 manda fixos (`apprenticeshipState`/`masterID`/
`masterOrApprentices`/`graduatesCount`/`honourOfMaster` sempre `0`/`0`/`""`/`0`/`""` no C# original — aqui
mantivemos os valores reais porque o cliente só olha o *tipo* do campo, não um valor específico, e nosso
servidor já tem esse dado de verdade).

### Detalhe B — 38 UPDATE_PRIVATE_INFO

`PlayerManager.as` 4.1:1557-1574 vs 6600:1991-2008. Campos: `Money, medal|BandMoney[+discard], Score, Gold,
Gift|badLuckNumber, damageScores, [petScore condicional], myHonor/hardCurrency (ordem trocada)`.
4.1: `Money, medal, Score, Gold, Gift, damageScores, petScore?, hardCurrency, myHonor`.
6600: `Money, BandMoney, <discard>, Score, Gold, badLuckNumber, damageScores, petScore?, myHonor,
hardCurrency` — **+1 int** (o discard) e os **últimos dois campos trocados de ordem**.
`petScoreEnable` é uma flag de `ServerConfig.xml` (`ServerConfigManager.instance.petScoreEnable`), não do
cliente — não depende de `clientKind`, só do config (já igual nas duas versões no nosso ambiente).

### Detalhe C — 67 UPDATE_PLAYER_INFO

`PlayerManager.as` 4.1:1658-1780 vs 6600:2088-2253.
- +2 ints depois de `Luck` (`MagicAttack`/`MagicDefence`) e antes de `hp` — "dano mágico por item"
  (`MIGRACAO-6600.md` §2.2, coluna nova em `Sys_Users_Goods`/`Sys_Users_Extra`), não implementado → `0`/`0`.
- +1 int depois de `honor` (`honorId`) — já temos esse campo real (`PlayerInfo.honorId`), não é stub.
- +1 int depois de `weeklyGameCount` (`leagueMoney`) — não implementado → `0`.
- +1 string antes de `evolutionGrade` (`PveEpicPermission`) — não implementado → `""`.

### Detalhe D — 259 FIRSTRECHARGE vs CONSUME_RANK (colisão de código, não layout)

`ePackageType.as`: 4.1 `FIRSTRECHARGE = 259`; 6600 `CONSUME_RANK = 259` — **mesmo número, sistemas
diferentes**. O 6600 despacha o pacote 259 direto pro `ConsumeRankManager.__updateInfo`
(`SocketManager.as:904-906`, sem sub-byte) que lê `actId:UTF, isOpen:bool` e, se `isOpen=false`, retorna
**sem ler mais nada** (`consumeRank/ConsumeRankManager.as:58-59`). Preservamos `firstRecharge()` intacto
pra 4.1 e criamos `consumeRankClosed()` (2 campos, fecha a ranking) pra 6600 — nunca mandar `firstRecharge`
pra um cliente 6600. Chamadores trocados: `session/login.ts` (burst de login) e
`handlers/eventos/primeira-recarga.ts` (claim manual do presente).
Não verificado: sentido cliente→servidor do código 259 (o 6600 pode usar 259 pra outra coisa nessa direção
também — fora do escopo do M1, que é só "chegar no hall").

### Detalhe E — 102/0 WORLDBOSS_CMD OPEN

`worldboss/WorldBossManager.as` 4.1:151-209 (`__initWorldBoss`) vs 6600:138-206 (`__init`, nome de método
diferente — bate com o stack trace do dono: `WorldBossManager/__init()`).
- `total_Blood`: 4.1 `readInt()` (4 bytes), 6600 `readLong()` (8 bytes, linha 148) — **tamanho de campo
  diferente**, não só posição. Fix: `writeLong` em vez de `writeInt` pro 6600.
- +3 ints depois de `reviveMoney` (`reFightMoney`/`addInjureBuffMoney`/`addInjureValue`, linhas 169-171),
  não lidos na 4.1 — sistemas de revive/refight premium ainda não implementados → `0`/`0`/`0`.
- Dois writers têm esse pacote: `packets/out.ts` `openWorldBoss()` (variante "fechado", usada quando não
  há boss ativo) e `handlers/eventos/boss-mundial.ts` `worldBossOpen()` (variante "aberto", com a janela
  viva) — os dois precisaram do mesmo fix.

### Detalhe F — 137 LEFT_GUN_ROULETTE (não é diferença de layout)

`roulette/LeftGunRouletteManager.as` 4.1:79-123 vs 6600:88-135 — **os campos lidos são idênticos** (`type
int, typeI int, isOpen bool, [count int, result UTF, 20 ints]`). O bug é um **guard de valor**: com
`count<=0`, a 4.1 retorna direto (`if(_loc5_ <= 0) return`, linha 102); o 6600 exige as duas condições
(`if(count <= 0 && result == "0") return`, linha 112). Nosso writer manda `result=""` (string vazia) nos
dois casos — pra 4.1 não importa (só olha `count`), mas pro 6600 `"" !== "0"` falha o guard e o cliente
tenta ler o array de 20 ints que nunca foi mandado → EOF. Fix: mandar `"0"` em vez de `""` quando o cliente
é 6600 (mesmo caminho de "fechado" dos dois lados).

## Pacotes do burst de login verificados e OK (sem fix necessário)

Verificado por leitura cruzada dos readers 4.1/6600 citados em `MIGRACAO-6600.md` §1.1 ("códigos
idênticos") e por não aparecerem nos stack traces do dono: `weaklessGuild` (?), `dateTime`(5), `dailyAward`
(13), `userRanks`, `openVip`, `flushCards`/`flushPets`(216/68), `enthrallLight`, `avatarCollect`(402),
`bufferList`, `achievementData`(228), `leagueNotice`, `guildMemberWeek`, `necklace`, `inviteLoginPacket`
(107/5), `friendState`(160/165), `questInv.sendAll()`(178). Não re-verificados campo a campo nesta sessão
(fora do escopo — só o que o dono reportou quebrando); qualquer EOF novo reportado depois deve seguir o
mesmo método: achar o reader 6600 pelo nome do manager no stack trace, comparar com o reader 4.1 linha a
linha, citar os dois no fix.

## Como testamos

`apps/game/test/client-6600.test.ts`: login completo via `FakeClient` (harness real, PGlite + protocolo de
verdade) com `createCharacter(db, { client: "6600" })` grava a coluna nova; depois lemos os pacotes
capturados (`c.received`) campo a campo **na mesma ordem que o AS3 6600 lê** (um `readInt`/`readString`/...
por vez, usando o `GSPacket` já parseado) e exigimos `pkt.offset === pkt.length` no final — exatamente o
"no EOF / sem bytes sobrando" que o Flash real cobraria com `Error #2030`. Rodado em paralelo com
`client: "41"` (mesmo teste, reader 4.1) pra pinar os dois layouts e travar regressão.
