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

---

## M2 salas (`feature/m2-salas`) — fluxo de sala completo até a tela de carregamento da batalha

Tarefa `m2-salas` (`docs/plan/TASKS.md`, `docs/plan/MIGRACAO-6600.md` §5 M2). Escopo: hall → criar/entrar sala
→ pronto/time/lugar/expulsar/convidar → iniciar → `91/101 GAME_CREATE` + `91/103 GAME_LOAD` (ponto exato onde
o cliente troca pra tela de carregamento da batalha — a luta em si, `eFightPackageType`, é `m2-batalha`).
Método: comparar `apps/game/src/handlers/salas/*`/`rooms/room.ts`/`rooms/room-mgr.ts`/`packets/out.ts` contra
`ddt/manager/GameInSocketOut.as` + `GameSocketOut.as` (client→server) e `room/RoomManager.as` +
`roomList/pvpRoomList/RoomListController.as` + `game/GameManager.as` (server→client) dos dois clientes, cada
diff confirmado contra o C# 6600 (`Game.Server.GameRoom.Handle/*.cs`, `Game.Logic/BaseGame.cs`,
`Game.Server.Packets.Packets/AbstractPacketLib.cs`).

### Pacotes corrigidos (server→client)

| # | Código | Nome | Diff 6600 | Fix |
|---|---|---|---|---|
| 1 | 94/4 | SendRoomPlayerAdd | +1 int `activityTanabataNum` (`player.Actives.Info.activityTanabataNum`) entre `zoneID` e `ID` — Coleta/Tanabata, não portado → `0`. Confirmado contra `AbstractPacketLib.cs` `SendRoomPlayerAdd`: `WriteInt(player.Actives.Info.activityTanabataNum)` logo depois de `WriteInt(player.ZoneId)`. O Round 3 já tinha achado o `isOld` deste pacote mas não este campo (estava escondido mais acima no corpo, não no final). | `Out.roomPlayerAdd` ganhou o campo condicional, mesmo parâmetro `receiverKind` de antes |
| 2 | 94/0 | SendRoomCreate | +1 bool `isShowGameLoading` no final (6600 C# manda sempre `false` — `AbstractPacketLib.SendRoomCreate` `WriteBoolean(false)`). Sem o campo, o cliente 6600 estoura EOF (`Error #2030`) em TODO create/enter de sala, porque é mandado logo depois do `94/1`/`94/0` de criar/entrar — bloqueador real pro hall. | `Out.roomCreate` ganhou `clientKind`; chamadores em `rooms/room-mgr.ts` (`createRoom`, `enterRoom` ×2) passam `p.clientKind` |
| 3 | 91/101 | GAME_CREATE | Por jogador: **(a)** +1 int `pvpBadgeId` (sempre `0` no C# 6600 também) entre o 2º arma e `Nimbus`; **(b)** os 6 ints de "addition" (GM/Auncher Exp/Offer/Riches, lidos como `/100`) são `5` no C# 6600 em vez de `0` da 4.1 — diferença de VALOR, não de layout, mas de graça pra bater; **(c)** +1 int `HorseSkillEquip.Length` (+N ints) no final de cada jogador (Montaria, não portado → `0`). Confirmado campo a campo contra `GameManager.as createGameInfo` (4.1:505-692 vs 6600:893-1141) e contra `Game.Logic/BaseGame.cs` (`SendCreateGame`/`method_?`, obfuscado mas com os mesmos literais `WriteInt(0)`/`WriteInt(5)×6`/`WriteInt(player.HorseSkillEquip.Length)`). | `Out.gameCreate` ganhou `clientKind`; é mandado em BROADCAST pra uma partida (pode misturar 4.1/6600 num pareamento de Match) — `fight/ddt.ts` ganhou `sendGameCreate()` (mesmo padrão `sendToAllByKind` de `rooms/room.ts`), chamado no lugar do `serialize()`/`send()` genérico só pra este evento |
| 4 | 91/103 | GAME_LOAD | **Verificado idêntico** — `GameManager.as __beginLoad` 4.1:771-810 vs 6600:1241-1275, mesmos campos (`maxTime, mapIndex, count+[type,path,classPath], petSkillCount+[pic,effect]`). Sem fix, mas agora coberto por teste nos dois clientKinds. | — |

### Pacotes verificados idênticos (sem fix)

- **94/9** `SendUpdateRoomList` (lista de salas): layout idêntico; única diferença é o CAP de entradas por página
  (4.1 até 9, 6600 até 8, `AbstractPacketLib.cs` `SendUpdateRoomList`) — não é bug de protocolo (o `count`
  mandado é sempre o mesmo que o loop usa), só uma diferença de UX/paginação. Decidido não portar o cap: essa
  lista é compartilhada entre clientKinds misturados no hall (`sendUpdateRoom`/`sendUpdateCurrentRoom`) e
  diferenciar o cap exigiria o mesmo padrão `sendToWaitingByKind` só por esse detalhe cosmético — não vale o
  custo. Registrado como gap conhecido, não bloqueador.
- **94/1** `SendRoomLoginResult`, **94/2** `SendGameRoomSetupChange`, **94/5** `SendRoomPlayerRemove`, **94/6**
  `SendRoomPlayerChangedTeam`, **94/10** `SendRoomUpdatePlacesStates`, **94/11/13** pickup cancel/start,
  **70** `GAME_INVITE` (convite recebido) — comparados campo a campo contra `AbstractPacketLib.cs` 4.1 e 6600
  e contra os readers AS3 citados acima: sem diferença nenhuma.
- **94/12** `SendRoomType` (troca de estilo da sala pra Guilda): o C# 6600 manda `game.GameStyle` onde o 4.1
  manda `game.GameType` — nomes diferentes, mas no nosso `BaseRoom.updateGameStyle()` os dois campos são
  sempre setados em lockstep com o MESMO valor numérico (`GameStyle=1,GameType=Guild=1` ou `GameStyle=0,
  GameType=Free=0`), então o byte mandado é idêntico na prática. Não alterado (ver `room.ts` `updateGameStyle`).

### Pacotes client→server verificados (criar/entrar/configurar sala)

- **94/0** `GAME_ROOM_CREATE` (`sendCreateRoom`): 6600 adiciona +1 bool `isDouble` no final — nem o C# 6600
  (`GameRoomCreate.cs`) lê esse campo de volta (só lê os 4 de sempre: `roomType, timeType, name, password`).
  `criar-sala.ts` agora lê e descarta esse bool quando `clientKind==="6600"` (documentação/paridade, não
  muda comportamento — é o último campo do pacote, framing não depende disso).
- **94/2** `GAME_ROOM_SETUP_CHANGE` (`sendGameRoomSetUp`): 6600 adiciona +1 int `tempID` no final. Confirmado
  contra `Game.Server.GameRoom.Handle/GameRoomSetupChange.cs:28`: o PRÓPRIO servidor 6600 original faz
  `packet.ReadInt();` e descarta — não afeta preço/dificuldade/mapa. `configurar-sala.ts` lê e descarta
  quando `clientKind==="6600"`.
- **94/1** `GAME_ROOM_LOGIN` (`sendGameLogin`/entrar sala): verificado idêntico (`GameSocketOut.as` é o mesmo
  arquivo/método nos dois clientes pra esse pacote) — `bool isInvite, int hall, int isRnd, [int roomId, str
  pass]`. Sem fix.
- **94/6** `GAME_TEAM`, **94/3** `GAME_ROOM_KICK`, **94/10** `GAME_ROOM_UPDATE_PLACE`, **94/5**
  `GAME_ROOM_REMOVEPLAYER`, **94/15** `GAME_PLAYER_STATE_CHANGE`, **94/7** `GAME_START`, **82**
  `GAME_MISSION_START`, **94/9** `ROOMLIST_UPDATE` (request): todos verificados idênticos campo a campo
  contra `GameInSocketOut.as`/`GameSocketOut.as` 4.1 vs 6600. Sem fix.

### PvE: dificuldade Épico/Pesadelo (`game.Pve_Info`)

`Game.Logic/eHardLevel.cs`: o valor numérico `5` é o MESMO slot do enum nas duas versões, mas com nome
diferente — 4.1 chama de `Simple` (Campo de treino/FightLab), 6600 renomeia pra `Nightmare`
("Pesadelo", nova dificuldade de masmorra PvE acima de `Epic=4`). `game."Pve_Info"` já tem a coluna
`NightmareGameScript` desde a migration do `m1-schema`, mas `packages/fight/src/pve/game.ts`
`PveGame.scriptFor()` não tinha o `case` pra ela — caía no `default` e rodava `SimpleGameScript` (dificuldade
errada) pra uma masmorra Pesadelo. Fix: `eHardLevel.Nightmare=5` (alias do mesmo número) + `case
eHardLevel.Nightmare` que só usa `NightmareGameScript` quando `roomType===Dungeon` (Freshman/FightLab
continuam lendo `Simple` no mesmo valor 5, igual ao C# original — não há ambiguidade real porque nenhuma
masmorra chega em `hardLevel=5` fora do tipo Dungeon). O pacote de rede (`94/2 GAME_ROOM_SETUP_CHANGE`,
campo `hardLevel`/`permission`, 1 byte) não muda — é só um valor 0-5 que já passava sem validação; o gap era
inteiramente dentro do motor PvE, não no protocolo. Preço de entrada da masmorra (`GetPrice(hardLevel)` +
`RemoveTemplate(201531, ...)`, `GameRoomSetupChange.cs:38-50`) **não está implementado** em nenhuma das
duas versões do nosso servidor (gap pré-existente, não específico do 6600) — dungeons são de graça hoje;
registrado como gap conhecido, não bloqueador pro hall/battle-loading.

### Como testamos (M2 salas)

Dois arquivos novos:
- `apps/game/test/client-6600-rooms.test.ts`: `FakeClient` real (PGlite + protocolo de verdade) +
  `DdtFightEngine` (`manualClock`, `botFallbackSec=0`) — fluxo completo **criar sala → `94/0` → `94/4` →
  `GAME_START` → (pareamento com bot) → `91/101 GAME_CREATE` → `91/103 GAME_LOAD`**, decodificado campo a
  campo na ordem exata dos readers AS3 citados acima, `offset === length` no final, nos dois clientKinds
  (`describe.each`). Mais um teste de sala MISTA (host 4.1 + convidado 6600 numa sala `Freedom`, os dois
  ficam prontos e o anfitrião inicia): confirma que `GAME_CREATE` chega com o layout certo pra CADA
  receptor, não um buffer compartilhado errado (mesmo tipo de bug que os Rounds 1-3 já tinham achado em
  `18`/`94/4`).
- `packages/fight/test/pve.test.ts`: 2 testes novos (`eHardLevel` Nightmare) — `Pve_Info.NightmareGameScript`
  escolhido pra uma sala Dungeon em `hardLevel=5`, e `SimpleGameScript` mantido pra uma sala não-Dungeon no
  mesmo `hardLevel=5` (confirma que o valor reciclado do enum não quebra o comportamento 4.1 original).

`pnpm --filter @ddt/game test`: 40 arquivos / 287 testes. `pnpm --filter @ddt/fight test`: 9 arquivos / 197
testes. `pnpm -w typecheck`: 11/12 projetos (todos exceto um sem script), limpo. Todos verdes.

### Gaps conhecidos pra `m2-batalha`

- `91/101`/`91/103` em si estão corrigidos (é o limite deste task), mas TODO o resto do stream de
  `eFightPackageType` (turnos, tiro, dano, cartas, GAME_OVER...) ainda usa um `PacketOut` ÚNICO compartilhado
  pra toda a partida (`fight/ddt.ts` `serialize()`/`send()`) — se algum desses pacotes divergir entre 4.1 e
  6600 (não auditado nesta tarefa, propositalmente fora de escopo), vai precisar do mesmo padrão
  `sendToAllByKind`/`sendGameCreate` aplicado aqui.
- Preço de entrada de masmorra (`GetPrice`/`RemoveTemplate(201531,...)`) não implementado (ver seção PvE
  acima) — afeta 4.1 e 6600 igualmente, não é regressão desta tarefa.
- Cap de paginação da lista de salas (8 no 6600 vs 9 na 4.1, `94/9`) não replicado — cosmético, documentado
  acima.
- Sistema de "sala dupla" (`isDouble` do `94/0 GAME_ROOM_CREATE`) e o campo morto `tempID` (`94/2
  GAME_ROOM_SETUP_CHANGE`) são lidos e descartados, sem funcionalidade nova — nenhum dos dois é usado pelo
  C# 6600 original tampouco.

## M2 loja/correio (`feature/m2-loja`) — 44 BUY_GOODS, loja barata/desconto, 116 SEND_MAIL

Tarefa `m2-loja` (`docs/plan/TASKS.md`). Depois do M1 (hall abre, ações básicas OK), verificado campo a
campo tudo que a loja e o correio trocam com o cliente 6600: `GameSocketOut.as` (client→server) contra
`UserBuyItemHandler.cs`/`UserSendMailHandler.cs` (6600, decompilados em `vendor/DDT-6600/Source`), e os
analyzers AS3 do lado servidor→cliente (`ShopItemDisCountAnalyzer`, `AllEmailAnalyzer`/`SendedEmailAnalyze`).
Metodologia extra usada aqui (além do "ler campo a campo"): toda vez que um pacote ganhava um campo NOVO no
6600 cujo destino não era óbvio por nome, procuramos o `.cs` REAL do handler (quando existe decompilado no
vendor) em vez de assumir — foi assim que achamos que o "extra" do 44 é um seletor de tabela (loja barata),
não um flag solto, e que o "extra" do 116 é um limite de 1 anexo (não 4) com corte de pilha.

### 44 BUY_GOODS — +2 campos por linha, 1 deles muda a FONTE do item (loja barata/desconto)

`GameSocketOut.as sendBuyGoods` 4.1 (linhas 129-169) vs 6600 (linhas 203-264), confirmado contra
`Game.Server.Packets.Client/UserBuyItemHandler.cs` (6600, decompilado por completo — raro, a maioria dos
handlers de `Request`/`.ashx` do 6600 só tem o markup). Por linha do carrinho:
- 4.1: `goodsId(int), type(int), color(UTF), dress(bool), skin(UTF), place(int)` — 6 campos, igual ao que
  `handlers/loja/comprar.ts` já lia.
- 6600: **+1 int ANTES de goodsId** (`goodsType`, 1=loja normal/2=loja barata — `num2` no C#, decide
  `ShopMgr.GetShopItemInfoById` vs `ShopMgr.GetShopItemDisCountById`) e **+1 bool DEPOIS de place**
  (`isBand`/"pagar com moeda vinculada" — `packet.ReadBoolean();` sem atribuição no C#, **lido e
  descartado**: quem decide o vínculo é sempre o servidor, nunca o cliente). Depois do loop, `buyFrom(int)`
  uma vez só — igual nas duas versões, não lido por nenhum dos dois lados do nosso handler (nem antes nem
  depois desta tarefa) porque não é usado.
- Sem o fix, um cliente 6600 comprando qualquer coisa desalinhava TODOS os campos a partir do 2º item do
  carrinho (o 1º campo extra desloca goodsId pra type, type pra color via `readString()` de um int = lixo).

**Loja barata/desconto (`goodsType===2`)**: `ShopMgr.GetShopItemDisCountById` (Bussiness/Managers/
ShopMgr.cs:169) busca por ID numa tabela SEPARADA, `Shop_Cheap_Items` (46 linhas, confirmada no
`research/6600/db-diff.md` desde `m1-schema`, já tinha schema Drizzle mas NUNCA tinha sido lida por nada —
achado nesta tarefa). Reshape pro `ShopItemInfo` normal: `ShopID` forçado a `3`, `Beat=1`. Cuidado achado
e corrigido durante o teste: o C# original copia o preço pros "slots" 1/2/3 de cada tier (`APrice3 =
APrice2 = APrice1 = shopCheapItemsInfo.APrice`) — mas isso é preenchimento defensivo do struct pro
`ShopMgr.SetItemType` real (não decompilado), e nosso `setItemType`/`getItemPrice` (`handlers/loja/
preco.ts`, mirror de `ItemInfo.SetItemType`) SOMA os 3 slots como custos combináveis — copiar o preço nos
3 daria cobrança 3x (pego pelo teste, ver abaixo). `toShopItemFromCheap` (`apps/game/src/db/templates.ts`)
preenche só o slot 1 por tier, 2/3 em 0. `ShopMgr.IsOnShop` (mesmo arquivo) troca a checagem de `showList`
por `EndDate > Now` quando o ID existe em `Shop_Cheap_Items` — replicado em `comprar.ts` (branch dedicado,
sem passar por `tpl.isOnShop`/`showList` pra IDs de loja barata).

Fix: `handlers/loja/comprar.ts` `buyGoods()` lê `goodsType` (só se `p.clientKind==="6600"`, senão fixo `1`)
e o bool extra (descartado); roteia pro `tpl.shopCheap` (novo `Map` em `Templates`, carregado de
`game.Shop_Cheap_Items`) quando `goodsType===2`, checando `EndDate` em vez de `isOnShop`.

**Endpoint HTTP irmão, mesmo achado**: `shopcheapitemlist.ashx` (`apps/api/src/request/endpoints/
social.ts`) já existia, mas lendo a tabela ERRADA pro 6600 — a implementação atual replica
`Tank.Request/shopcheapitemlist.ashx.cs` (4.1, decompilado, confirmado byte a byte: `Shop` com
`IsCheap && EndDate>Now && Label==4`). O 6600 chama a MESMA URL (`ddt/manager/ShopManager.as:867
loadDisCounts`, `BaseLoader.REQUEST_LOADER` — plain XML, sem zlib, nas duas versões) com o MESMO analyzer
(`ShopItemDisCountAnalyzer`, lê `@ID/@TemplateID/@LableType/@LimitGrade/@AUnit/@APrice/@AValue/@BUnit/
@BPrice/@BValue/@CUnit/@CPrice/@CValue`) — não achamos o `.cs` desta `.ashx` específica pro 6600 no vendor
(só markup, like a maioria dos 263 endpoints Request novos), mas os nomes de coluna batem 1:1 com
`Shop_Cheap_Items`/`ShopCheapItemsInfo.cs`, então inferimos que o 6600 trocou a fonte pra essa tabela nova.
Fix: branch por `rc.client` — "6600" lê `game."Shop_Cheap_Items"` (`EndDate > now`, sem rename de coluna
precisa); "41" mantém o comportamento antigo intacto.

### 116 SEND_MAIL — 6600 só manda/aceita 1 anexo (não 4), mas com corte de pilha (`Count`)

`GameSocketOut.as sendEmail` 4.1 (linhas 257-282) vs 6600 (linhas 359-385): `NUM_OF_WRITING_DIAMONDS=4`
igual nos dois (`email/manager/MailManager.as`), mas por slot o 6600 escreve **+1 int** (`Count`) depois do
`ItemID` — `[bagType(byte), itemId(int)]` (4.1) vs `[bagType(byte), itemId(int), count(int)]` (6600), ×4
slots sempre (mesmo os vazios, `[0,-1]`/`[0,-1,0]`).

Achado real ao ler `Game.Server.Packets.Client/UserSendMailHandler.cs` (6600, decompilado por completo):
o handler **não faz loop nenhum** nos 4 slots — lê só o 1º (`eBageType, int place, int count`) e segue
direto pra validação/envio. Os outros 3 slots que o cliente ainda manda ficam sem ler (packet já é framed
por tamanho — `GSPacket.parse`/`StreamProcessor`, zero-pad alem do length, então não precisa consumir o
resto). Ou seja: **o 6600 reduziu o correio pra 1 anexo só**, mas esse 1 anexo pode ser uma FRAÇÃO de uma
pilha (`Count`), não a pilha inteira como na 4.1 — item com `Count < requested` ou `requested < 0` =
erro SEM mandar o 116 de volta (`return 0;` sem `SendTCP`, bem diferente dos outros erros do mesmo handler
que mandam `WriteBoolean(false)` antes de sair). Item travado (`IsBinds`) = sem anexo, SEM erro (mesmo
filtro silencioso da 4.1, já existia).

Fix: `handlers/correio/enviar.ts` `sendMailPacket()` ganhou um branch `is6600`: lê 1 slot (com `Count`) em
vez de 4; reaproveita a MESMA linha de `Sys_Users_Goods` como anexo (só com `Count` reduzido, igual ao
padrão que a 4.1 já usava pra "destacar da bolsa"); se sobrar pilha (`leftover>0`), clona uma linha nova
pra devolver o resto à bolsa (`ItemInfo.cloneFromTemplate` + `PlayerInventory.addTemplate`, igual ao
`ItemInfo.CloneFromTemplate`+`AddTemplate` do C#). Os dois `return` sem reply do C# (item inexistente /
`count` inválido) replicados tal qual — só manda mensagem de chat, sem o pacote 116.

Não verificado nesta tarefa (fora do que o cliente consegue exercitar pela UI normal, baixo risco): o C#
6600 tem um branch onde, SE `ıtemInfo.IsBinds` fosse true E `num7>0`, tentaria usar `ıtemInfo2` (nunca
inicializado nesse caminho) — null-ref no original. Não replicado (replicar um crash não ajuda); nosso
port trata item travado como "sem anexo" direto, sem tentar o caminho de sobra.

Atributos novos que os analyzers de LISTA de correio leem no 6600 e não existem na 4.1 (sem fix — defaults
seguros, mesmo padrão "stub zero" do resto do M1): `AllEmailAnalyzer.as` (`LoadUserMail.ashx`) lê
`@MagicAttack`/`@MagicDefence` por item anexado (dano mágico por item, já documentado em outros pacotes no
M1 Round 2/3); ausentes no XML = `int(undefined)` AS3 = `0`, não quebra. `EmailInfo.as` troca
`GiftToken`/`Medal` (4.1) por `BindMoney` (6600) — nenhum dos dois lados emite esses atributos hoje (gap
pré-existente da própria 4.1, não é regressão desta tarefa).

### Verificado idêntico, sem fix (44/116 e vizinhos)

`PROP_BUY(54)`/`PROP_SELL(55)`/`PROP_USE(66)`/`BUY_GIFTBAG(46)`/`USER_SEND_GIFTS(221)`/
`LEFT_GUN_ROULETTE_SOCKET(128)`/`LEFT_GUN_ROULETTE_COMPLETTE(130)`/`GOODS_COUNT(168)` client→server: campo
a campo idênticos nas duas versões (único detalhe: `BUY_QUICK_GOLDBOX(126)`, `VIP_RENEWAL(92)` e
`ITEM_CONTINUE(62)` ganham 1-2 campos extras no FIM do pacote no 6600 — `bool`/`bool+bool`/`int` — mas são
sempre o ÚLTIMO campo, nunca lidos por nós nem pelo C# de forma que afete lógica, e pacotes client→server
são framed por tamanho fixo (zero-pad, `GSPacket.parse`) então não ler a sobra não quebra nada; não
alterado). `LoadUserMail.ashx`/`MailSenderList.ashx` (listas, não o envio): mesmos campos lidos pelos
analyzers 4.1/6600 (`SendedEmailAnalyze` idêntico; `AllEmailAnalyzer` só ganha os 2 atributos de dano
mágico citados acima, sem quebrar).

### Como testamos (M2 loja/correio)

Novo arquivo `apps/game/test/client-6600-m2-loja.test.ts`: `FakeClient` real (`loggedIn()`), manda o 44 e o
116 com o layout EXATO que cada `clientKind` escreve (goodsType/isBand extras pro 44; slot único+Count pro
116 no 6600) e confere o efeito no estado do jogador/banco (dinheiro debitado, item entregue, carta
criada, sobra de pilha devolvida) — não só "offset===length" como nos Rounds anteriores, porque aqui o que
importa é o EFEITO (quanto foi cobrado, quantos itens voltaram), não só o parse. Cobre: loja normal 6600
(campos extras não desalinham), loja barata 6600 (resolve via `tpl.shopCheap`, preço não cobra 3x), loja
barata expirada (tratada como inexistente, sem cobrança), correio 6600 com corte de pilha (sobra volta pra
bolsa), item travado (sem anexo, carta ainda vai se tiver Money), `count` inválido (erro sem reply). Mais
`apps/api/test/api.test.ts`: `shopcheapitemlist.ashx` com `client="41"` vs `client="6600"` confirma a fonte
de dados certa por cliente. `pnpm --filter @ddt/game test`: 40 arquivos / 286 testes. `pnpm --filter
@ddt/api test`: 40 testes. `pnpm typecheck`: limpo em todos os 11 pacotes. Todos verdes.

---

## M2 batalha (`feature/m2-batalha`) — stream de combate (`eFightPackageType`/91 GAME_CMD) completo

Tarefa `m2-batalha` (`docs/plan/TASKS.md`, `docs/plan/MIGRACAO-6600.md` §5 M2). Escopo: todo pacote 91 GAME_CMD
trocado DURANTE uma partida (depois de `91/103 GAME_LOAD`, que `m2-salas` já fechou) — turno, tiro, dano,
GAME_OVER, START_GAME, pacotes de missão PvE — nos dois sentidos, nos dois clientKinds, com broadcast por
destinatário quando a partida mistura 4.1/6600. Método: comparar `apps/game/src/fight/ddt.ts`
`serializeEvent()`/`parseCommand()`/`parsePveCommand()` contra os WRITERS C# citados em
`packages/fight/src/game/events.ts` (`Game.Logic/BaseGame.cs`, `PVPGame.cs`, `PVEGame.cs`, `Living.cs`) nas
duas árvores (`vendor/DDTank41/Game.Logic` com nomes reais; `vendor/DDT-6600/Source/Game.Logic` **decompilado
e obfuscado** — `method_NN`/nomes aleatórios tipo `vrgYhrgvPg` — identificado por **valor do `WriteByte`**, não
por nome de método) e contra os READERS AS3 (`game/view/GameView.as` e `game/GameManager.as`, função por
função, ambos os clientes).

Achado estrutural (bate com `MIGRACAO-6600.md` §2.1 "Fighting.Server quase idêntico"): o sub-código do byte
inicial de cada pacote 91 (`ddt/data/socket/CrazyTankPackageType.as`) é **idêntico nas duas versões para todo
código que já usávamos** (2,6,7,9,11,12,14,16,20,32,33,38,41,46,84,96,98,99,100,101,103,112,113,114,115,116,
119,128,130,131,132,133,137) — o 6600 só ACRESCENTA códigos novos em slots livres (74 SINGLEBATTLE_STARTMATCH,
76 FIGHT_STATUS, 79 ADD_ANIMATION, 86/87 ADD_NEW_PLAYER/ADD_TERRACE, 92 SINGBATTLE_FORCED_EXIT, 93/94/95
RESCUE/boat, 136 PICK_BOX, 138 SELECT_OBJECT, 139/141/142 FIGHTFOOTBALL\*, 148/149/150 WISHOFDD/TRUSTEESHIP/
SKILL_INFO_INIT, 160 IS_LAST_MISSION — nenhum dos quais colide com os já usados). Então **nenhum pacote de
combate muda de código** entre as versões — só o LAYOUT (campos) de alguns.

### Pacotes corrigidos (server→client, `serializeEvent` em `apps/game/src/fight/ddt.ts`)

| # | Código | Nome | Diff 6600 | Fix |
|---|---|---|---|---|
| 1 | 91/2 | FIRE | `Living.ShootImp` (4.1 `Game.Logic/Living.cs:1761-1870`; 6600 `Game.Logic/Phy/Object/Living.cs:1169-1313`): byte-idêntico até o bloco de pet; 6600 escreve **+1 bool** (sempre `false`) no final — só não-`false`/lido mais pra frente em `eRoomType.FightFootballTime`, modo que não criamos. Sem o bool, o cliente 6600 estoura EOF em TODO tiro da partida. | `serializeEvent` case `FIRE`: `if (clientKind === "6600") p.writeBoolean(false);` no final |
| 2 | 91/6 | TURN (SendGameNextTurn) | 4.1 `BaseGame.cs:2190-2238`; 6600 `method_55` (`BaseGame.cs:2066-2117`, obfuscado): byte-idêntico até `turnIndex`; 6600 escreve **+1 bool** (sempre `false`, mesmo padrão FightFootballTime) no final. Sem fix, o cliente 6600 estoura EOF em toda virada de turno. | `serializeEvent` case `TURN`: mesmo `if (clientKind === "6600") p.writeBoolean(false);` |
| 3 | 91/100 | GAME_OVER | `PVPGame.GameOver` (4.1 `PVPGame.cs:329-558`; 6600 `PVPGame.cs:394-636`, obfuscado): mesma contagem de campo por jogador na 4.1 (28) só que o 6600 tem **30** — `+1 int` `tieStatus` (sempre 0 — flag de empate do ConsortiaBattle, não é uma partida normal) ANTES do player count; por jogador, `+1 int` `gpCSMUser` depois do 2º `gainGP` e `+1 int` `offerCSMUser` depois do 2º `offer` (ambos sempre 0 — bônus de "Consortium/CSM", não implementado); `+2 int` `redFinalScore`/`blueFinalScore` (sempre 0 — só não-zero em FightFootballTime) depois de `riches`. Confirmado campo a campo contra `game/actions/GameOverAction.as readInfo` (4.1 vs 6600). | `serializeEvent` case `GAME_OVER`: os 4 pontos de inserção, todos `if (clientKind === "6600")` |
| 4 | 91/99 | START_GAME (PVPGame.StartGame) | 4.1 `PVPGame.cs:771-829`; 6600 `PVPGame.cs:132-184` (nome de método real, não obfuscado — só o corpo mudou): por jogador, 6600 insere `+1 int` `deputyWeaponCount` (munição da 2ª arma; nós não rastreamos → `0`) antes do `powerRatio` hardcoded, e `+2 int` zero depois de `Dander` antes da lista de `FightBuffs`; depois do loop de jogadores, `+2 int` zero antes do `DateTime` final. Todos os campos novos são sempre 0/não-lidos fora de `FightFootballTime`. | `serializeEvent` case `START_GAME`: 3 pontos de inserção `if (clientKind === "6600")` |
| 5 | 91/115 | GAME_ALL_MISSION_OVER | `PVEGame.GameOverAllSession` (4.1 `PVEGame.cs:960-1001`; 6600 `PVEGame.cs:1300-1354`): por jogador, 6600 insere `+1 int` `gpCSMUser` (sempre 0) entre `gainGP`/`totalExp` e `isWin` — confirmado contra `GameManager.as __missionAllOver` (4.1:1094-1138 vs 6600:1574-1619, campo `obj.gpCSMUser`). | `serializeEvent` case `GAME_ALL_MISSION_OVER`: `if (clientKind === "6600") p.writeInt(0);` antes do `writeBoolean(isWin)` |

### Pacotes verificados byte-idênticos (sem fix) — 91 GAME_CMD

Comparados campo a campo contra o C# obfuscado do 6600 (achado pelo VALOR do `WriteByte`, não pelo nome do
método — `BaseGame.cs` 6600 é um dump decompilado, `method_28`...`method_61`) e, quando havia dúvida, contra o
reader AS3 dos dois clientes: **HEALTH(11)**, **DANDER(14)**, **DIRECTION(7)**, **MOVESTART(9)** (incl. o ramo
`type===2` com a lista de caixas), **PROP(32)**, **CHANGE_BALL(20)**, **FROST(33)**, **HIDE(35)**,
**NONOLE(82)**, **VANE(38)**, **ADDATTACK(46)**, **FIRE_TAG(96)** (é um re-broadcast do próprio pacote do
cliente — `FireTagCommand.cs` idêntico nos dois, só `SendSyncLifeTime`/`method_64` trocando de nome),
**USE_DEPUTY_WEAPON(84)**, **PLAYER_PROPERTY(41)**, **SEND_PICTURE(128)**, **SYNC_LIFETIME(131)**, **LOAD(16)**
(`LoadCommand.cs`, re-broadcast igual), **SKIPNEXT(12)** (sem corpo nos dois), **GAME_MISSION_OVER/MISSION_OVE
(112)** (`PVEGame.GameOver`, 4.1 `:773-877` vs 6600 `:1092-1207` — cabeçalho, 9 campos por jogador e cauda de
recursos idênticos). `EQUIP_EFFECT_MSG` (pacote 3, não é GAME_CMD) também confirmado idêntico.

Colisão de valor JÁ EXISTENTE no próprio enum do cliente (não é bug nosso, documentado aqui pra não reabrir a
investigação): `CrazyTankPackageType.GAME_MISSION_START` e `.NONOLE` valem **82 nos dois**
(`ddt/data/socket/CrazyTankPackageType.as`); no `switch` de `createGameEvent` (`SocketManager.as`,
`GAME_MISSION_START` vem primeiro), então um `91/82` sempre vira `GAME_MISSION_START` pro cliente, nunca
`NONOLE` — já documentado como alias conhecido em `packages/protocol/src/codes/client.ts:96`. Como nosso
servidor nunca manda `NONOLE` fora do fluxo normal de "sem buraco" (`SendGameUpdateNoHoleState`, idêntico nos
dois C#), isso não é um bloqueador novo, só um registro.

### Client→server (`parseCommand`/`parsePveCommand`) — verificados idênticos

Comparados os `[GameCommand(N, ...)]` (`Game.Logic/Cmd/*.cs`) dos dois lados: **FireCommand(2)**,
**FireTagCommand(96)**, **LoadCommand(16)**, **PropUseCommand(32)**, **MoveStartCommand(9)**,
**DirectionCommand(7)**, **TakeCardCommand(98)**, **PetKillCommand(144)** — mesma contagem e tipo de campo
lido nos dois. Pela amostra (8 de ~15 comandos ativos, cobrindo os de corpo mais rico) e pela caracterização do
próprio `MIGRACAO-6600.md` §2.1 ("Fighting.Server quase idêntico"), não há indício de que os comandos restantes
(STUNT, AIRPLANE, SUICIDE, GHOST_TARGET, PICK, BOSS_TAKE_CARD, MISSION_PREPARE, PASS_DRAMA, TRY_AGAIN, DELIVER,
MISSION_EVENT — todos de corpo simples/vazio) tenham diff; não auditados campo a campo nesta rodada.

### 4 pacotes novos de `eFightPackageType` (barco-dragão/RingStation) — não aplicável

`Game.Logic/Protocol/eFightPackageType.cs` (4.1: 55 valores; 6600: 59 — `PLAYER_RINGSTATION_RESULT=90`,
`PLAYER_ADD_BOATSCORE=91`, `PLAYER_ADD_ENTERMODE_POINT=92`, `CREATE_ENTERMODE_ITEMS=93`) é o protocolo INTERNO
entre `Fighting.Server` e `Game.Server` (RPC por `GSPacketIn` cru entre dois processos C#) — **não é o
protocolo cliente↔servidor** (esse é `ddt/data/socket/CrazyTankPackageType.as`/91 GAME_CMD, auditado acima).
Nosso `apps/game` colapsa Fighting.Server + Game.Server num processo só (`docs/GAME-SERVER.md`), então esse
RPC interno não existe na nossa arquitetura — não há "porta" a fazer. As features de GAMEPLAY que motivariam
esses 4 códigos (pontuação de barco-dragão, resultado de RingStation) são telas/sistemas 6600-only inteiros
(`dragonboat.swf`, `ringstation.swf`) fora do escopo de uma partida PvP/PvE normal — gap já registrado em
`docs/plan/MIGRACAO-6600.md` §4 (RingStation = "Liga dos Exploradores", M4).

### Dano mágico por item (`MagicAttack`/`MagicDefence`) — decisão: motor atualizado, dado ainda não populado

`Game.Logic/Phy/Object/Living.cs` (6600) tem campos `MagicAttack`/`MagicDefence` (default `10.0` no
construtor de `Living`, mas **sobrescrito** por `Player.Reset()` com `PlayerCharacter.MagicAttack`/
`MagicDefence` reais antes de qualquer partida — o default de `Living` nunca é usado por um `Player`). Só
`SimpleBomb.MakeDamage` (dano de bomba/tiro, `Living.cs:1169-1313`) lê esses campos:
`num2 = target.Defence + target.MagicDefence` (defesa efetiva do alvo) e `num3 = living_0.Attack +
target.MagicAttack` (ataque efetivo do atirador ganha o `MagicAttack` do ALVO, não o seu próprio — bug/quirk
do jogo original, replicado fielmente). `Living.MakeDamage` (dano corpo-a-corpo, `Living.cs:1014-1045`) **não**
lê nenhum dos dois campos — só a bomba usa.

A 4.1 nunca teve esse campo: zero ocorrências em `vendor/DDTank41/Game.Logic`, exceto uma cópia COMENTADA da
mesma fórmula em `PetEffects/Element/Actives/AE1436.cs:158-159`
(`double defence = p.Defence;//+ p.MagicDefence;` / `double attack = m_living.Attack;//+ m_living.MagicAttack;`)
— confirma que a fórmula existe no código-fonte da 4.1 também, só desativada (provável herança de merge com
uma base mais nova, nunca ligada).

Como `Sys_Users_Goods.MagicAttack`/`MagicDefence` (migration 0013) tem default `0` e **nenhum item hoje** (nem
doador 4.1 nem 6600) tem valor não-zero, somar `+0` é uma identidade matemática — não uma coincidência
empírica — então dava pra ligar a fórmula no motor sem mudar nenhum resultado existente. Fiz isso:
`packages/fight/src/game/formulas.ts` `DamageTarget` ganhou `magicAttack?`/`magicDefence?` (opcionais, `?? 0`),
`shellDamage()` soma os dois só quando `!melee` (replica a divisão real bomba-vs-corpo-a-corpo do C#);
`packages/fight/src/game/living.ts` `Living` ganhou os campos (`= 0`) e `PlayerSpec` ganhou os dois opcionais,
lidos em `Player.reset()`; `game.ts` `makeDamage()` passa `target.magicAttack`/`magicDefence` pro `DamageTarget`.
**Não fiz**: nenhum lugar em `apps/game` popula esses campos com dado real ainda (exigiria o equivalente de
`GamePlayer.UpdateProperties` somando os itens equipados, que não existe pra essa stat) — ou seja, o motor
sabe a fórmula, mas ela fica inerte (sempre `+0`) até uma tarefa futura de itemização ligar o dado real; 0 em
todo item é garantido continuar dando o mesmo resultado de antes (prova: teste abaixo).

Prova (`packages/fight/test/golden-game.test.ts`): 1) todo vetor de `golden/vectors.json` (dano real do jogo
original, capturado antes desta mudança) recalculado com `magicAttack: 0, magicDefence: 0` explícitos bate
exatamente com o valor gravado; 2) com valores não-zero sintéticos, o dano de bomba muda mas o de corpo-a-corpo
(`melee: true`) não muda nada — confirma o gate `!melee`.

### Como testamos (M2 batalha)

`apps/game/test/client-6600-battle.test.ts` (novo): mesmo método dos Rounds anteriores — `FakeClient` real
(PGlite + protocolo de verdade) + `DdtFightEngine` (`manualClock`), uma partida PvP 1x1 completa (jogador vs
bot de fallback) jogada até o fim com o mesmo "solver" de mira que `fight.test.ts` já usa, decodificando
START_GAME/TURN/FIRE/GAME_OVER campo a campo na ordem exata do writer C#/reader AS3 citados acima, com
`offset === length` no final, nos dois `clientKind`s (`describe.each`). Mais um teste de partida MISTA (host
4.1 + convidado 6600, parear automático via sala `Match`): confirma que CADA lado recebe o layout certo do
MESMO evento de motor (`TURN`/`FIRE`/`GAME_OVER`), provando o novo `sendEvent()` (substituiu `send()`/
`serialize()` compartilhado por `fight/ddt.ts`, mesmo padrão `sendToAllByKind` de `rooms/room.ts` e
`sendGameCreate` de `m2-salas`). PvE (`112`/`115`): mesmo precedente do Round 2 pra pacotes que uma partida
normal não exercita sempre (aqui, o fim de missão PvE de verdade exigiria semear `Pve_Info`/`Mission_Info`/
`NPC_Info` + rodar um script de masmorra real só pra isso) — chamada direta do builder (`serializeEvent`) com
uma fixture sintética, lida de volta campo a campo na ordem exata do reader AS3 (`__missionOver`/
`__missionAllOver`), `offset === length`. Gap registrado: não há, nesta tarefa, um teste de PvE ponta a ponta
via socket (criar masmorra → matar NPC → `GAME_MISSION_OVER` real); o caminho de sala→`GAME_CREATE` PvE já é
testado em `apps/game/test/labirinto.test.ts`.

`pnpm --filter @ddt/game test`: 41 arquivos / 294 testes. `pnpm --filter @ddt/fight test`: 9 arquivos / 199
testes. `pnpm -w typecheck`: limpo. Todos verdes.

## M2 bolsa (`feature/m2-bolsa`) — bag/equip/vestir + família MARRY_* pro 6600

Tarefa `m2-bolsa` (`docs/plan/TASKS.md`, `docs/plan/MIGRACAO-6600.md` §1.1/§5 M2). Escopo: todo pacote de
`apps/game/src/handlers/bolsa/*` (mover/trocar/split, equipar/desequipar, usar item, descartar, organizar,
senha da bolsa, vencimento, bolsa temporária, comparar item no chat) + `apps/game/src/handlers/casamento/*`
(família MARRY_*, porque §1.1 avisa que ela recicla um valor de código com `PLAYER_DRESS`). Método: comparar
`GameSocketOut.as` (client→server) e os readers AS3 (`PlayerManager.as`/`ChurchManager.as`/`ChatManager.as`/
`EffortManager.as`) 4.1 vs 6600 pra cada pacote, cruzando com o `.cs` real do 6600 (`vendor/DDT-6600/Source`)
sempre que ele existe decompilado, igual aos Rounds anteriores.

### Achado grande 1 — colisão de código 237: MARRYINFO_UPDATE (4.1, mural) vs PLAYER_DRESS (6600, figurino)

`ePackageType.cs`: 4.1 `MARRYINFO_UPDATE=237` (editar seu pedido no mural de casamento — `casamento/
mural.ts`); 6600 recicla o MESMO valor pra `PLAYER_DRESS=237` (sistema de "figurino"/dress room, feature
NOVA do 6600, sem equivalente nenhum na 4.1 — `playerDress.swf`, `PlayerDressManager.as`,
`PlayerDressType.as`: sub-comandos 1 GET_DRESS_MODEL, 2 CURRENT_MODEL, 6 FOLD_DRESS, 7 LOCK_DRESSBAG).
Mesmo padrão de colisão do Detalhe D (259) e do 121/RUNE_COMMAND (Round 3) — nome antigo nem existe mais no
enum 6600 (`vendor/DDT-6600/Source/.../ePackageType.cs:166` vs `vendor/DDTank41/.../ePackageType.cs:194`).
Sem fix, um cliente 6600 mandando qualquer sub-comando de `PLAYER_DRESS` bateria direto em `marryInfoUpdate`
(lê `bool,string`), interpretando o 1º byte do payload do 6600 como booleano aleatório e corrompendo
`Marry_Info.IsPublishEquip/Introduction` do jogador com lixo.
Fix: `handlers/casamento/index.ts` despacha 237 por `p.clientKind` — "41" vai pro mural (`marryInfoUpdate`,
intacto), "6600" cai em `handlers/bolsa/vestir-6600.ts` `playerDressStub()` (lê e descarta o sub-byte, zero
lógica de jogo). `MARRYINFO_DELETE=238` (4.1) não colide porque o valor 238 simplesmente não existe mais no
enum 6600 (não é reciclado pra nada) e nosso servidor nunca registrou 238 mesmo na 4.1 (usa 234
MARRYPROP_GET pra apagar, replicando o próprio "erro" do C# original — ver `mural.ts`).
GAP pra M3: `PLAYER_DRESS` (salvar/trocar conjunto de roupa, até `DressModel.DRESS_LEN` modelos) não foi
implementado — por instrução da tarefa ("wire the 6600 packets only if the 4.1 server logic already
exists; otherwise document as gap"), já que não existe sistema de "modelo de figurino salvo" na
`Game.Logic`/`Bussiness` da 4.1 nem tabela correspondente em `packages/db` hoje. Confirmado seguro deixar
assim: `UIModuleTypes.PLAYER_DRESS` só é carregado quando o jogador abre a tela de Figurino
(`PlayerDressManager.loadPlayerDressModule`, via `UIModuleLoader.addUIModuleImp`), NÃO faz parte do burst
automático de login/hall — diferente do `KING_BLESS_MAIN`/142 (Round 2), que travava o hall com
`TypeError #1009` por nunca ser inicializado. Não responder deixa a tela vazia/sem modelos salvos, sem
crash em nenhum outro lugar do cliente.

### Achado grande 2 — 67 UPDATE_PLAYER_INFO: broadcast de sala mista não branchava por clientKind

`game/player.ts` `updateProperties()` (chamado por `updatePlayerProperties()`, por sua vez chamado pelo
hook `onEquipChanged` toda vez que a bolsa muda um item equipado — mover.ts/49, organizar-bolsa.ts/124,
troca de visual, etc.) construía UM `PacketOut` de 67 no layout de `this.clientKind` (o jogador que mudou
de status) e mandava ele pra TODA a sala (`currentRoom.sendToAll(pub, this)`) — o próprio código já tinha
uma NOTA deixada pelo autor avisando que isso só valia "até salas/M2 suportarem clientes mistos". Como
`m2-salas` (task anterior) já ligou salas com `clientKind` misto (`sendToAllByKind` pra `94/4`/`91/101`),
esse 67 ficou destrancado como bug real: um espectador 4.1 numa sala com um 6600 que equipou algo receberia
o pacote 67 NO LAYOUT 6600 (ou vice-versa), descompassando os campos a partir de `GP..Luck` (Detalhe C,
Round 1/2: +2 ints `MagicAttack`/`MagicDefence`, `honorId` em vez de nada, +1 int `leagueMoney`, +1 string
`PveEpicPermission`) — mesma classe de bug que `18`/`94/4`/`91/101` já tinham corrigido nos Rounds
anteriores, só que faltando aqui.
Fix: `updateProperties()` agora usa `this.currentRoom?.sendToAllByKind((k) => Out.publicPlayer(this.info,
this.match, k), this)` em vez de montar um buffer só — no máximo 2 variantes (uma por clientKind
REALMENTE presente na sala), mesmo padrão de `rooms/room.ts` `sendToAllByKind` (já existia, só não era
usado aqui). O self-send (`this.send(Out.publicPlayer(..., this.clientKind))`, pro próprio jogador) já
estava certo, não mudou.

### Pacotes corrigidos (client→server)

| # | Código | Nome | Diff 6600 | Fix |
|---|---|---|---|---|
| 1 | 119 | LINKREQUEST_GOODS | Request: 4.1 lê `num(int), string(descartada), itemID(int)` (bate com o sender 4.1, só 2 campos — o 3º campo que o `.cs` 4.1 lê nem existe no sender, gap pré-existente da própria 4.1, não tocado); 6600 lê `num(int), key(string), templeteIDorItemID(string)` (bate com `sendGetLinkGoodsInfo(type,key,templeteIDorItemID="")`, 3 campos, os 2 últimos STRING) — o `.cs` 6600 real resolve `itemID = Convert.ToInt32(templeteIDorItemID != "" ? templeteIDorItemID : key)`. | `comparar-item.ts` `registerCompararItem` lê por `clientKind` antes do switch de `num` |
| 2 | 119 | LINKREQUEST_GOODS (resposta, item achado) | 6600 insere +2 ints (`MagicAttack`/`MagicDefence`, lidos incondicionalmente pelo `ChatManager.as` 6600, dano mágico por item — mesmo sistema de sempre) entre `DefendCompose` e `ValidDate`; no fim, `isGold`/`goldValidDate`/`goldBeginTime` (o `.cs` 6600 ESCREVE isso — a 4.1 nunca escreveu, gap pré-existente da 4.1 preservado tal qual) + 1 int `MagicLevel` que o AS3 6600 lê mas o `.cs` 6600 NUNCA escreve (bug real do 6600 original — replicar o EOF não ajuda, mandamos `0`). | `comparar-item.ts`: +2 ints depois de `DefendCompose`, +`isGold`/cond./`MagicLevel=0` no fim, só `clientKind==="6600"` |
| 3 | 63 | ITEM_OPENUP | Resposta (`OpenUpArkHandler.cs`, decompilado nos dois): 6600 soma +2 ints (`MagicAttack`/`MagicDefence`) por item mesclado, logo depois de `LuckCompose` — confirmado contra o `.cs` real dos dois lados (4.1 termina em `LuckCompose`; 6600 soma `WriteInt(value.MagicAttack); WriteInt(value.MagicDefence);`). Request (`sendItemOpenUp`) ganha +1 bool `isBand` no fim, não lido por nenhum dos dois `.cs` — sem fix. | `abrir-caixa.ts` `openBox()`: +2 ints por item mesclado, só `clientKind==="6600"` |
| 4 | 99 | TEXP | Request MUDA DE FORMA: 4.1 `type,templateID,place` (3 ints); 6600 `type,templateID,count,place` (4 ints, `count` NOVO antes de `place` — ler como 4.1 desalinha `place` com o `count` do cliente). Lógica também muda: o `.cs` 6600 real (decompilado por completo) não tem multiplicador de VIP nem reset diário explícito — só teto simples `texpCount <= Grade`, e permite consumir VÁRIOS pergaminhos de uma vez (`count`, truncado pra não passar do teto); a 4.1 só consome 1 por pacote com limite `Grade×(VIP≤2?2:3)` e reset diário. | `treino-atributos.ts`: `texp()` (4.1, intacto) e `texp6600()` (novo) despachados por `clientKind` no `registerTreinoAtributos` |

### Pacotes verificados idênticos, sem fix (bolsa)

Código E layout confirmados iguais nos dois `GameSocketOut.as` (request) e/ou readers AS3 (resposta), sem
nenhum campo a mais que mude posição de algo que lemos: **49** `CHANGE_PLACE_GOODS` (mover.ts, mover/
trocar/split — inclui equipar/desequipar, que é só mover pra dentro/fora do `EquipBag`), **124**
`CHANGE_PLACE_GOODS_ALL` (organizar-bolsa.ts), **127** `REClAIM_GOODS` (reciclar.ts), **47**
`UNCHAIN_EQUIP` (desacorrentar-equipamento.ts), **60** `ITEM_HIDE` (ocultar-visual.ts), **34** `USER_RANK`
(mostrar-guilda.ts), **25** `BAG_LOCKED` (senha-da-bolsa.ts — request E resposta de 8 campos idênticas;
6600 só acrescenta uma tela nova de verificação por SMS/4399 que não manda este pacote), **200**
`CHECK_CODE` (codigo-verificacao.ts, nunca emitido), **42** `DELETE_GOODS`/**188**
`USE_CONSORTIA_REWORK_NAME`/**205** `USE_CHANGE_COLOR_SHELL` (stubs.ts), **252** `USE_CHANGE_SEX`
(trocar-sexo.ts), **171** `USE_REWORK_NAME` (trocar-apelido.ts), **182** `USE_COLOR_CARD` (trocar-cor.ts),
**189** `USER_CHANGE_RANK` / **265** `NEWTITLE_CARD` (titulos.ts), **218** `USER_GET_GIFTS` (request E
resposta, `PlayerManager.as __getGifts` idêntico — presentes-recebidos.ts), **203** `LOOKUP_EFFORT`
(request E resposta, `EffortManager.as __lookUpEffort` idêntico — conquistas.ts), **196** `CARD_RESET`
(reroll-carta.ts), **222** `EQUIP_RECYCLE_ITEM` (reaproveitar-forja.ts, pacote sem corpo nos dois lados),
**108** `GAME_TAKE_TEMP` (pegar-item-temporario.ts), **77** `ITEM_OVERDUE` (item-vencido.ts), **183**
`CARD_USE` request pro caminho normal (place≠-1 — ver GAP no cabeçalho de `usar-carta.ts` pro caminho de
compra rápida), **117** `MAIL_RESPONSE` (correio-excedente.ts `mailItems()`). Família MARRY_* inteira
(`casamento/*`): **235** `MARRYINFO_GET`, **236** `MARRYINFO_ADD`, **234** `MARRYPROP_GET`, **239**
`AMARRYINFO_REFRESH`, **246** `MARRY_STATUS`, **85** `MATE_ONLINE_TIME`, **247** `MARRY_APPLY`, **250**
`MARRY_APPLY_REPLY`, **248** `DIVORCE_APPLY`, **240** `MARRY_SCENE_LOGIN`, **242** `MARRY_ROOM_LOGIN`,
**244** `PLAYER_EXIT_MARRY_ROOM`, **233** `MARRY_SCENE_CHANGE`, **251** `SCENE_STATE`, **253**
`MARRY_ROOM_INFO_UPDATE`, **249** `MARRY_CMD` (todos os 11 sub-códigos usados) — ver notas de campo extra
trailing (sem fix, framed-by-length) nos cabeçalhos de `pedir-casamento.ts`/`divorcio.ts`/`capela.ts`/
`cerimonia.ts`. **241** `MARRY_ROOM_CREATE` tem o mesmo padrão (+1 bool `merryActivity` no fim).

### Gaps conhecidos (não corrigidos nesta tarefa, documentados pra não reabrir)

- **PLAYER_DRESS (237, 6600)**: feature inteira não portada — ver "Achado grande 1" acima. Pra M3.
- **183 CARD_USE, caminho de compra rápida (place=-1)**: o `.cs` 6600 decompilado deste handler lê um
  formato (`num3,num4,num5` — 3 ints) que não bate com o que TODOS os 5 call-sites AS3 reais mandam (mesmo
  array de IDs que a 4.1). Decompilação provavelmente incompleta/código morto superposto. Deixado com o
  comportamento 4.1 pros dois clientKinds — ver GAP no cabeçalho de `usar-carta.ts`.
- **249/2 HYMENEAL "cancelar"**: nenhuma das duas versões manda o int que nosso `flag===1` espera; gap
  pré-existente da própria 4.1 (não introduzido por esta tarefa) — ver nota em `cerimonia.ts`. Sub 9
  `HYMENEAL_STOP` (existe no enum, nunca registrado) é o candidato real, não investigado.
- **25 BAG_LOCKED, fluxo "telefone"/4399**: o 6600 ganhou uma tela nova de verificação por SMS
  (`baglocked/phone4399/*`, `baglocked/AppealFrame.as`) específica do portal chinês 4399 — não manda este
  pacote (é um fluxo HTTP separado, fora do escopo deste porte, não aplicável ao BR).

### Como testamos (M2 bolsa)

Novo arquivo `apps/game/test/client-6600-m2-bolsa.test.ts`: mesmo método dos Rounds anteriores
(`describe.each(["41","6600"])` quando o pacote é compartilhado, builder direto quando só um lado muda),
`FakeClient` real, `offset === length` no final de cada resposta. Cobre: 119 request+resposta nos dois
clientKinds (com item persistido via `saveIntoDatabase`, já que `loadItemById` lê da tabela, não da bolsa
em memória) + os casos zerados `num===4`/`5`; 63 com `itemBoxes`/template sintéticos injetados direto nos
maps de `ctx.templates` (mesmo padrão do `tpl.shopCheap.set(...)` de `client-6600-m2-loja.test.ts`); 99 nos
dois clientKinds (4.1 1 poção por pacote, 6600 múltiplas de uma vez + truncamento no teto); a colisão 237
(mural 4.1 intacto vs stub 6600 que NÃO corrompe o `Marry_Info` existente); e o broadcast 67 numa sala
mista de verdade (host 4.1 + convidado 6600, equipar um item no convidado via `equipBag.addItemTo` +
`beginChanges`/`commitChanges` — o mesmo hook `onEquipChanged` que `mover.ts` usa — confere que CADA
receptor decodifica com o PRÓPRIO layout, sem EOF nenhum lado).

`pnpm --filter @ddt/game test`: 42 arquivos / 305 testes (293 + 12 novos). `pnpm -w typecheck`: limpo nos
11 pacotes com script. Todos verdes.
