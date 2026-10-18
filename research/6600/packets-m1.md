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
| 7 | 64 | GRID_GOODS | `ddt/manager/PlayerManager.as:228` `__updateInventorySlot` | `ddt/manager/PlayerManager.as:288` `__updateInventorySlot` | Round 2 bloqueador 1: +5 campos por item | `packets/out.ts` `inventorySlots` (+ `writeItemMagicTail`) |
| 8 | 142 | KING_BLESS_MAIN | *(código não existe na 4.1)* | `kingBless/KingBlessManager.as:240` `updateAllData` | Round 2 bloqueador 2: nunca mandado, 6600-only | `packets/out.ts` `kingBlessClosed` (novo) |
| 9 | 216 | CARDS_DATA | `ddt/manager/PlayerManager.as:1110` `__getCards` | `ddt/manager/PlayerManager.as:1475` `__getCards` | Round 2: cabeçalho +1 int, item 14→12 campos reordenados | `packets/out.ts` `cardData` / `playerCardData` |
| 10 | 178 | QUEST_UPDATE | `ddt/manager/TaskManager.as:559` `__updateAcceptedTask` | `ddt/manager/TaskManager.as:764` `__updateAcceptedTask` | Round 2: +3 campos/estruturas por quest | `packets/out.ts` `updateQuests` |

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

## Pacotes do burst de login verificados e OK (sem fix necessário, Round 1)

Verificado por leitura cruzada dos readers 4.1/6600 citados em `MIGRACAO-6600.md` §1.1 ("códigos
idênticos") e por não aparecerem nos stack traces do dono: `weaklessGuild` (15), `dateTime`(5), `dailyAward`
(13), `userRanks`(34), `openVip`(92), `enthrallLight`(227), `leagueNotice`(42), `guildMemberWeek`(145),
`necklace`(95), `inviteLoginPacket`(107/5), `friendState`(160/165). Não re-verificados campo a campo nesta
sessão (fora do escopo — só o que o dono reportou quebrando). **Round 2 encontrou diferenças reais em 3
pacotes que esta lista marcou como "OK" por engano** (`216`/`68`/`178` — eram só "não apareceram no stack
trace ainda", não "verificados"): ver §Round 2 abaixo. Qualquer EOF novo reportado depois deve seguir o
mesmo método: achar o reader 6600 pelo nome do manager no stack trace, comparar com o reader 4.1 linha a
linha, citar os dois no fix — não assumir "código igual" = "layout igual".

## Como testamos (Round 1)

`apps/game/test/client-6600.test.ts`: login completo via `FakeClient` (harness real, PGlite + protocolo de
verdade) com `createCharacter(db, { client: "6600" })` grava a coluna nova; depois lemos os pacotes
capturados (`c.received`) campo a campo **na mesma ordem que o AS3 6600 lê** (um `readInt`/`readString`/...
por vez, usando o `GSPacket` já parseado) e exigimos `pkt.offset === pkt.length` no final — exatamente o
"no EOF / sem bytes sobrando" que o Flash real cobraria com `Error #2030`. Rodado em paralelo com
`client: "41"` (mesmo teste, reader 4.1) pra pinar os dois layouts e travar regressão.

---

## Round 2 (`feature/m1-socket-2`) — 3 bloqueadores do dono + mais pacotes

Depois do merge do Round 1, o cliente 6600 passa do login e começa a montar o hall
(`HallStateView.initHall()` roda), mas trava em 3 pontos novos + mais diferenças de pacote achadas ao
continuar o scan.

### Bloqueador 1 — 64 GRID_GOODS, item-info compartilhado (bag/equip)

`PlayerManager.as __updateInventorySlot` (4.1:228-297 vs 6600:288-402): até `isGold`/`goldBeginTime` e
`latentEnergyCurStr/NewStr/EndTime` os dois são **idênticos**. Depois disso o 6600 lê **+5 campos por
item**, sempre (o branch `EquipType.isMagicStone` só decide onde o cliente GUARDA os dois primeiros, não
se ele lê): `MagicAttack`(int), `MagicDefence`(int), `goodsLock`(bool), `MagicExp`(int), `MagicLevel`(int)
— sistema de dano mágico por item (`MIGRACAO-6600.md` §2.2), não implementado → zero/false.
Fix: `writeItemMagicTail(p, full)` novo em `packets/out.ts`, chamado por `inventorySlots()` (64, `full:
true`) quando `clientKind==="6600"`.

Outros writers que serializam o MESMO bloco de item (citados pelo pedido do dono) e o diff real:
- **74 ITEM_EQUIP** (`userEquip()`, ver equipamento de outro jogador — NÃO faz parte do burst automático de
  login/hall, só roda via `ver-equipamento.ts` sob pedido do cliente): `__itemEquip` (4.1:909-1029 vs
  6600:452-617) tem o MESMO +1 campo (`MagicLevel` só, sem o resto) depois de `latentEnergyEndTime`
  (confirmado contra `AbstractPacketLib.cs:1050`) — **mas o CABEÇALHO desse pacote (antes da lista de
  itens) tem ~15 campos diferentes/reordenados** no 6600 (`isOpenKingBless`, `LastLoginDate` real em vez de
  `DateTime.Now.AddDays(-2)` fixo, `DailyLeagueFirst/LastScore`, `totemId`/`necklaceExp`,
  `curHorseLevel`...) — gap maior, deixado **não corrigido** nesta rodada (não bloqueia o hall). Registrar
  se o dono reportar erro em `__itemEquip`/`PlayerTool` ao abrir a ficha de outro jogador.
- **195 AUCTION_REFRESH** (`auctionRefresh()`, leilão): bloco de item ainda mais truncado (nem `isGold`)
  mesmo na 4.1 — não tocado, fora do escopo de hall.
- "shop"/"mail": nenhum writer de item dedicado encontrado além dos três acima — presentes de correio/loja
  usam os mesmos bags (GRID_GOODS) quando entram na mochila, então já herdam o fix de `inventorySlots`.

### Bloqueador 2 — 142 KING_BLESS_MAIN nunca inicializado

Código **só existe no 6600** (`ePackageType.as`: `KING_BLESS_MAIN=142`; não existe esse valor na 4.1 —
zero risco de colisão). `GamePlayer.cs` (6600) manda `Out.SendKingBlessMain(Extra)` todo login
(`AbstractPacketLib.cs:2299-2315`: int `KingBlessIndex`, date `KingBlessEnddate`, e só se
`KingBlessIndex>0` um int `count` + `count*(int,int)`). Nosso servidor nunca mandava nada nesse código →
`KingBlessManager._endTime` (AS3) ficava `null` pra sempre → `TypeError #1009` na primeira leitura
(`getRemainTimeTxt()`, chamado por `PlayerTool/initView()` dentro de `HallStateView.initHall()`).
Fix: `Out.kingBlessClosed()` novo (`KingBlessIndex=0`, `KingBlessEnddate=MIN_DATE` — os dois juntos batem
no mesmo "early return" de `getRemainTimeTxt()`, `KingBlessManager.as:173`), mandado só pra 6600
(`session/login.ts`, depois de `leagueNotice`).

### Bloqueador 3 — API: `.ashx` já implementados não ganhavam zlib pro 6600

`routes/request.ts` já tinha `COMPRESS_ASHX_6600` (lista de `.ashx` que o loader do 6600 espera em zlib),
mas só era consultada no branch `!ep` ("endpoint desconhecido" → zlib forçado). Um `.ashx` **já
implementado** (`ep` existe — ex. `IMListLoad.ashx`, usado pela lista de amigos) pulava esse branch e
respondia texto puro pro loader `COMPRESS_REQUEST_LOADER` do 6600, que tenta `ByteArray.uncompress()` e
estoura `Error #2058` (visto logo depois de `REQ /request6600/imlistload.ashx` no console do Ruffle).
Fix: depois de `await ep.handle(rc)`, se `is6600 && out.kind === "xml" && !out.zlib &&
COMPRESS_ASHX_6600.has(lower)`, reembala em zlib antes de mandar. Cobre `IMListLoad.ashx` (amigos),
`LoadUserMail.ashx`/`MailSenderList.ashx` (correio) e os outros da lista de uma vez — nenhum precisou de
código próprio. `dailyloglist.ashx` já mandava zlib por si (`xml(..., true)`) pros dois clientes; o `!
out.zlib` evita comprimir duas vezes.

### Mais pacotes corrigidos (continuando o scan bag/buffs/quests/friends/mails/pets/cards/beads)

- **216 CARDS_DATA** (`cardData()` cartas próprias, `playerCardData()` GET_PLAYER_CARD de outro jogador):
  `PlayerManager.as __getCards` (4.1:1110-1150 vs 6600:1475-...). Cabeçalho: 6600 insere `player.ZoneID`
  (+1 int) entre `userId` e `count`. Por carta, o 6600 **reduz** o conjunto de campos (14→12) e reordena:
  `CardID, CardType(novo, não rastreado→0), UserID, Place, TemplateID, isFirstGet(movido pra cá), Attack,
  Defence, Agility, Luck, Damage, Guard` — `Count` e `Level`/`CardGP` **somem** desse pacote especificamente
  no 6600 (confirmado contra `AbstractPacketLib.cs:1731-1757` `SendCards`/`SendPlayerCardInfo`/
  `SendGetCard`, todas com o mesmo cabeçalho `ID, ZoneID, count`). Nenhuma carta é mandada pra uma conta
  nova (`flushCards` só manda se `places.length>0`), então o burst de login de um char novo nunca exercita
  isto — testado direto com fixture sintética (ver abaixo), não via login completo.
- **178 QUEST** (`updateQuests()`, `questInv.sendAll()`/`flush()`): `TaskManager.as __updateAcceptedTask`
  (4.1:559-616 vs 6600:764-834+). Por quest, depois de `IsExist` o 6600 lê +3 campos/estruturas:
  `QuestLevel`(int, não rastreado→0), um array `Condition5-8` de tamanho **fixo 4** (o próprio C# usa
  `new int[4]`) como pares índice/valor (não rastreamos Condition5-8→0), `isGet`/`IsAccept`(bool→`true`,
  sempre aceita quando chega aqui). O byte array `states` no final (`loadQuestLog(readByteArray())`) não
  muda. Confirmado contra `AbstractPacketLib.cs:2649-2681`. Também sem quests numa conta nova — testado com
  fixture sintética.
- **68 PET** (`updateUserPet()`), **186/185 BUFF_OBTAIN/UPDATE** (`bufferList()`), **228/231 ACHIEVEMENT**
  (`achievementRecords()`/`achievementData()`), **95 NECKLACE_STRENGTH** (`necklace()`): lidos campo a
  campo nos dois lados (`PlayerManager.as __updatePet`, `__buffObtain`, `EffortManager.as
  __initializeAchievement(Data)`, `__necklaceStrengthInfoUpadte`) — **idênticos**, nenhum fix.
- "friends"/"mails" do pedido do dono: não há pacote de socket dedicado pra lista de amigos/correio no
  login — essas listas vêm via HTTP (`IMListLoad.ashx`, `LoadUserMail.ashx`, `MailSenderList.ashx`), já
  cobertos pelo Bloqueador 3.
- "beads": `BEAD_HOLE_INFO` (abrir buraco de conta na forja) só dispara sob ação do jogador, não no burst
  de login/hall — não verificado nesta rodada (não bloqueia o hall).

### Como testamos (Round 2)

Mesmo método do Round 1 (`apps/game/test/client-6600.test.ts`, agora também cobrindo 64/142), mais um
padrão novo pros pacotes que uma conta nova nunca exercita no login (216/178): chamar o builder
(`Out.cardData`/`Out.playerCardData`/`Out.updateQuests`) direto com uma fixture sintética, ler de volta
campo a campo e conferir `offset === length`. Para o tail `states` de 178 (bytes crus, sem length-prefix
próprio — tanto `readBytes()` do nosso protocolo quanto o `readByteArray()` do AS3 leem "o resto do
pacote"), a asserção real não é só "ofereceu tudo" (isso seria verdade mesmo com um campo errado no meio,
só deslocando a fronteira) — é conferir que **sobram exatamente os 200 bytes** de `QuestInventory.states`
antes de consumir o tail, aí sim qualquer campo a mais/menos no loop por quest estoura essa checagem.

---

## Round 3 (`feature/m1-pacotes-acao`) — pacotes disparados por ação do jogador + fix de broadcast misto

Tarefa `m1-pacotes-acao` (`docs/plan/TASKS.md`): depois do Round 2 (hall abre), agora os pacotes que só
disparam quando o jogador FAZ algo (ver equipamento de outro, leilão, amigos, sala) — e o bug de fundo que
os Rounds 1/2 não tinham: **pacotes broadcast pra vários jogadores com clientKind diferente compartilhavam
o mesmo buffer**, construído no layout de quem disparou a ação, não de cada destinatário.

### Pacote 1 — 74 ITEM_EQUIP (`userEquip()`, ver equipamento de outro jogador)

`PlayerManager.as __itemEquip` (4.1:321-515 vs 6600:452-754), confirmado contra
`AbstractPacketLib.cs:952-1114` `SendUserEquip` (6600). Igual ao suspeitado no Round 2, mas o diff real é
maior que "~15 campos": o 6600 adiciona um **novo bloco "BeadBag" inteiro** depois da lista de itens, que a
4.1 não tem.
1. Cabeçalho: +1 int `player.ZoneID` logo depois de `player.ID`, antes do `NickName` (mesmo stub `zoneId=0`
   que `cardData`/`playerCardData` já usam — sem canais ainda).
2. +1 bool `isOpenKingBless` entre `VIPLevel` e `Win` (6600-only, sempre fechado — mesmo estado de
   `kingBlessClosed()` → `false`).
3. +1 int `curHorseLevel`/`MountLv` depois de `necklaceExp`, antes da contagem de itens (Montaria,
   `m1-schema`-only por enquanto → `0`).
4. Por item: +1 int `MagicLevel` no fim (mesma cauda `writeItemMagicTail(p, false)` que o 64 já usa, mas só
   o campo sozinho — confirma o que o Round 2 já tinha achado).
5. Cauda nova depois da lista de itens (4.1 só tem `gemSoul count=0` ali): `beadItems.Count`(0 — BeadBag,
   sistema de runas/beads não portado), `UserGemStone.Count`(0 — mesmo formato do fim da 4.1),
   `player.evolutionGrade`/`evolutionExp` (valores REAIS, já rastreados — ver `publicPlayer`),
   `player.MagicAttack`/`MagicDefence` (0, não implementado), `magicStones.Count`(0),
   `player.MountsType`(0, Montaria de novo).
6. **Checado contra o C# e CORRIGIDO um engano do Round 2**: `LastLoginDate` (`DateTime.Now.AddDays(-2)`) e
   `DailyLeagueFirst`/`DailyLeagueLastScore` (`false`/`0`) são hardcoded **exatamente igual** no C# 6600
   também — a nota do Round 2 dizendo que esses campos "ficam reais" no 6600 estava errada (lia só o AS3
   sem cruzar com o C#); não mudar esses dois campos.
7. `apprenticeshipState`/`masterID`/`masterOrApprentices`/`graduatesCount`/`honourOfMaster` também são
   enviados como dummy (`0`/`0`/`""`/`0`/`""`) pelo C# 6600 — mesmo precedente do Detalhe A (`loginSuccess`):
   mantivemos os valores REAIS, o cliente só olha o tipo do campo.

Fix: `userEquip()` ganhou `clientKind`/`zoneId`; chamador (`handlers/bolsa/ver-equipamento.ts`) passa o
clientKind de QUEM PEDIU (o viewer, `p`), não do jogador visto — o layout da resposta depende de quem lê.

### Pacote 2 — 195 AUCTION_REFRESH — VERIFICADO IDÊNTICO, sem fix

`AuctionHouseController.as __updateAuction` (4.1:266-330 vs 6600:330-392): comparado campo a campo, byte a
byte — **sem nenhuma diferença**. O bloco de item aqui é o mesmo "truncado" nos dois lados (termina em
`Hole6Exp`, nunca lê `isGold`/`latentEnergy`/`MagicLevel`). `handlers/leilao/comum.ts` `auctionRefresh()`
não precisou de `clientKind`.

### Pacote 3 — BEAD_HOLE_INFO — confirmado não-bloqueante, sistema fora de escopo

`CrazyTankSocketEvent.BEAD_HOLE_INFO` (6600-only, `ddt/events/CrazyTankSocketEvent.as:785`) chega via
código 121 `RUNE_COMMAND` → sub-byte `RUNE_SENDINFO_TOCLIENT` (`beadSystemManager.as handleBeadPkg`) → lido
em `PlayerManager.as __onOpenHole` (6600:1305-1323), que só preenche `BeadModel.drillInfo`. Esse campo já
nasce inicializado (`static var drillInfo:DictionaryData = new DictionaryData()`,
`beadSystem/model/BeadModel.as:21`) — diferente do `KingBlessManager._endTime` (que nascia `null` e
estourava `TypeError #1009`), nunca mandar `BEAD_HOLE_INFO` não deixa nada null-ref. Sistema de
runas/beads inteiro não portado (fora do escopo desta rodada); nenhum fix necessário pro hall/ações atuais.

**Achado novo, não documentado nos Rounds anteriores**: código **121 colide entre as duas versões** —
4.1 `ITEM_INLAY=121` vs 6600 `RUNE_COMMAND=121` (`ddt/data/socket/ePackageType.as`; `ITEM_INLAY` nem existe
mais no enum 6600). Mesmo tipo de colisão do Detalhe D (259). Fix: `handlers/forja/montar.ts` `inlay()`
agora SUPRIME o envio da resposta 121 quando `p.clientKind === "6600"` (o estado do servidor muda igual; só
o ack visual não vai, pra não alimentar `handleBeadPkg` com bytes de outro protocolo). `embedBackout()`
(125) e `openFiveSixHole()` (217) não colidem — confirmado mesmo valor numérico nos dois enums e reader
idêntico.

### Pacote 4 — 18 SCENE_ADD_USER (hall, lista de espera)

`RoomListController.as __addWaitingPlayer` (4.1:166-194 vs 6600:200-229): 6600 lê +1 bool `isOld` no fim
(mesmo stub card-soul do `loginSuccess`). Fix: `sceneAddPlayer()` ganhou `clientKind`.

### Pacote 5 — 94/4 SendRoomPlayerAdd (entrar numa sala)

`RoomManager.as __addPlayerInRoom` (4.1:333-453 vs 6600:637-754): 6600 lê +1 bool `isOld` logo depois de
`DailyLeagueLastScore`, antes do loop de pets (mesmo stub). Fix: `roomPlayerAdd()` ganhou `receiverKind`
(nome diferente de propósito — o campo que varia é do RECEPTOR do pacote, não do jogador descrito por `v`).

### Pacote 6 — 94/9 ROOMLIST_UPDATE (lista de salas) e 21 SCENE_REMOVE_USER — VERIFICADOS IDÊNTICOS

`RoomListController.as __addRoom` e `RoomManager`/sub-dispatch de remoção: comparados campo a campo —
sem diferença nos dois. `GameRoomPackageType`/`IMPackageType` (sub-códigos) também batem nos dois enums
(0-15 idênticos; o 6600 só ACRESCENTA sub-códigos novos 17-20, sem colidir). Nenhum fix.

### Pacote 7 — 160/160 SendAddFriend (pedido de amizade aceito)

`PlayerManager.as __friendAdd` (4.1:655-726 vs 6600:867-940): 6600 lê +1 bool `isOld` e +1 date
`LastLoginDate` (valor REAL — usamos `PlayerInfo.LastDate`, mesmo campo do `loginSuccess`/`openVip`) logo
depois de `IsMarried`. Fix: `addFriend()` ganhou `clientKind`. `160/165 FRIEND_STATE` seguiu verificado
idêntico (já estava na lista "OK" do Round 1, agora confirmado também pelo código do sub-dispatch).

### Pacote 8 — 128/1 SendConsortiaUserPass (entrar numa sociedade) — VERIFICADO IDÊNTICO, sem fix

`ConsortionModelControl.as __consortiaResponse` case 1 (4.1:179-230 vs 6600:197-258): campo a campo —
sem diferença. `handlers/sociedade/comum.ts` `userPassPacket()` não precisou de `clientKind` (mas o
broadcast `for (const o of m.online(...)) o.send(pkt)` continua compartilhando um buffer — como o layout é
idêntico nos dois clientKinds isso não é bug, só registrado aqui pra não reabrir a investigação se outro
campo 128/* divergir no futuro).

### Fix de fiação — broadcasts mistos (o pedido explícito do dono: "at most 2 variants per broadcast")

Os pacotes 4 e 5 acima (18 e 94/4) são mandados em BROADCAST pra vários jogadores ao mesmo tempo
(`rooms/room-mgr.ts` sala de espera do hall; `rooms/room.ts` sala de partida) — se a sala/hall tiver uma
mistura de clientes 4.1 e 6600, reusar o MESMO `PacketOut` pra todo mundo manda o layout errado pra quem não
é do clientKind de quem disparou a ação.
- `game/player.ts` `RoomMember`: ganhou `readonly clientKind: ClientKind` (GamePlayer já tinha o campo;
  `bots/bot.ts` `Bot` ganhou um getter fixo `"41"` — bot nunca passa por `session/login.ts`/
  `app.LoginSessions.Client`).
- `rooms/room-mgr.ts`: novo `sendToWaitingByKind(build, except?)` (constrói no máximo 2 variantes, uma por
  clientKind REALMENTE presente na sala de espera) substitui `sendToWaiting` nos 3 pontos que mandam
  `sceneAddPlayer` em broadcast (`waitingAdd`, os dois ramos de `enterWaitingRoom`).
- `rooms/room.ts`: novo `sendToAllByKind(build, except?)` (mesma ideia) substitui o `sendToAll(add, p)` do
  `roomPlayerAdd` em `addPlayer`. `roomPlayerRemove`/`roomSetupChange`/`roomList`/etc. seguem num buffer só
  — confirmados sem campo sensível a clientKind.
- Pacotes PlayerInfo/ItemInfo que SÃO sempre mandados 1-a-1 pro próprio solicitante (não broadcast) só
  ganharam o parâmetro `clientKind` no chamador (74 ver-equipamento, 160/160 adicionar-amigo) — não
  precisam do helper de broadcast.

### Escopo verificado vs fora de escopo

- **Confirmado**: nenhum outro writer de `ItemInfo` existe fora de `packets/out.ts` (`inventorySlots`/
  `userEquip`) e `handlers/leilao/comum.ts` (`auctionRefresh`) — bolsa/loja/correio usam exclusivamente o
  64 GRID_GOODS (já com fix 6600 desde o Round 2) quando um item entra na mochila; loja (`44 BUY_GOODS`) e
  correio (`112`/`113`/`114`/`116`/`117`/`118`) só mandam acks simples (int/bool), sem bloco de `ItemInfo`
  ou `PlayerInfo` — não verificados campo a campo nesta rodada por não carregarem esse tipo de dado (risco
  baixo, mesmo padrão observado em toda colisão real encontrada até agora).
- **Fora de escopo** (registrar pra não reabrir): `91/101 GAME_CREATE`/`91/103 GAME_LOAD` (partida em si,
  `eFightPackageType`) pertence à tarefa `m2-batalha`, não a esta; sistema de beads/runas (`BEAD_HOLE_INFO`,
  `RUNE_COMMAND`) seguem não portados.

### Como testamos (Round 3)

Novo arquivo `apps/game/test/client-6600-actions.test.ts`, mesmo método dos Rounds 1/2
(`describe.each(["41","6600"])`, ler campo a campo na ordem exata do reader AS3 citado acima, `offset ===
length` no final) — mas chamando os builders DIRETO com um `GamePlayer` real (via `loggedIn()`) em vez de
esperar o burst de login, já que estes pacotes só disparam sob ação. Cobre 74 (com `uncompressPacket`,
igual ao `pkg.deCompress()` do AS3), 18, 94/4 e 160/160 nos dois clientKinds, mais 195 (um reader só, já que
é idêntico nos dois lados). `pnpm --filter @ddt/game test`: 39 arquivos / 280 testes, todos verdes.
