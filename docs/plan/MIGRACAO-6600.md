# Migração do cliente 4.1 → DDT-6600 (plano de pesquisa)

> Pesquisa + plano apenas — nenhum código foi alterado para escrever este doc.
> Decisão do dono (2026-10-17): trocar o cliente-alvo de **DDTank 4.1** (`vendor/DDTank41`,
> nosso alvo atual) para **DDT-6600** (`vendor/DDT-6600`), com visual "remaster HD" e as
> features novas vistas em `research/ddclassico/*.png` (referência de layout/features de um
> server BR "DDClássico" — **não copiar arte/branding deles**, só usar como mapa do que existe).
>
> Isso **substitui** a "Decisão de versão (2026-10-02)" em `docs/ROADMAP.md` linha 43-44
> ("Ficamos na 4.1... 5.5 só existe como binários"). Essa decisão antiga vale: 5.5 realmente
> não tem fonte completa. **6600 é diferente de 5.5** — `vendor/DDT-6600/Source` tem o C#
> completo (Game.Server, Fighting.Server, Center.Server, SqlDataProvider) e `Flash_Project/DDT660/src`
> tem a fonte AS3 completa, então a mesma lógica que justificou ficar na 4.1 (ter fonte completa)
> agora justifica ir para 6600. Quem ler este doc depois: não é um reversal por capricho, é porque
> o 6600 passou a ter fonte completa disponível no repo (`vendor/DDT-6600`) e não tinha antes.

## 0. Números-chave (resumo)

| Métrica | DDTank 4.1 (atual) | DDT-6600 (alvo) | Delta |
|---|---|---|---|
| `ePackageType` (códigos de pacote principais) | 249 valores (`Game.Server/Packets/ePackageType.cs`) | 312 valores (`Game.Server.Packets/ePackageType.cs`) | **+63** códigos novos/realocados |
| `eFightPackageType` (protocolo de combate) | 55 linhas | 66 linhas | **+4** (modos novos: barco-dragão, arena RingStation), quase idêntico |
| Arquivos `*PackageType.cs` (um por sub-sistema) | 22 | 51 | **+29 sub-sistemas** de pacote |
| Pastas de feature em `Game.Server/` (C#) | 28 | 58 | **~17 sistemas inteiramente novos** (ver §2) |
| Endpoints Request (`.ashx`) | 123 | 263 | **+140** |
| Endpoints Request (`.xml` estáticos) | 151 | 184 | +33 |
| Endpoints Request (`.aspx`) | 0 | 35 | +35 (novo: `AASGetState`, etc. — provavelmente anti-cheat/estado) |
| Arquivos fonte AS3 do cliente | 2.517 | 3.805 | **+1.288 (+51%)** |
| SWFs da UI compilada (um idioma) | 102 (nosso pack atual, `apps/api/assets/flash/ui/vietnam/swf`) | 174 (`ui/turkey/swf`) — 351 somando as duas pastas de idioma do 6600 | **+72 SWFs novos por idioma** (dono citou "347", bate: 170+174+~7 na raiz) |
| Tabelas no nosso `packages/db` hoje | 198 (`game`=104, `player`=73, `member`=21) | — (backup `.bak`, não restaurado) | ver §2.2 |
| Arquivos em `packages/fight` (motor de combate) | 727 `.ts` | — | engine é quase 1:1 reaproveitável (ver §3) |
| Handlers já registrados em `apps/game/src/handlers` | 210 arquivos, 170 `r.player(...)` | — | base de comparação pro gap de handlers novos |

Como cheguei nos números: diff direto dos arquivos-fonte dentro do próprio repo (sem restaurar banco,
sem rodar o cliente). Comandos usados estão citados em cada seção pra poder refazer.

## 1. Inventário

### 1.1 Pacotes (`ePackageType` e primos)

Arquivos comparados:
- 4.1: `vendor/DDTank41/Game.Server/Packets/ePackageType.cs` (249 valores)
- 6600: `vendor/DDT-6600/Source/Game.Server/Game.Server.Packets/ePackageType.cs` (312 valores)

Códigos **idênticos** nas duas versões (baixo risco, não muda nada no cliente nem no servidor):
`LOGIN=1`, `KIT_USER=2`, `SYS_MESSAGE=3`, `PING=4`, `SYS_DATE=5`, `NETWORK=6`, `RSAKEY=7`,
`GRID_GOODS=64`, `GRID_PROP=65`, `EQUIP_CHANGE=66`, `ITEM_STRENGTHEN=59`, `CONSORTIA_CMD=129`,
`AUCTION_ADD/UPDATE/DELETE/REFRESH=192-195`, `SAVE_DB=172`, `GAME_ROOM=94`, `IM_CMD=160`,
`MARRY_*` (toda a família de casamento), `HOTSPRING_*` (toda a família de termas),
`TOTEM=136`, `AVATAR_COLLECTION=402` (!), `BAGLOCK_PWD=403`. → **handshake/login/crypto e a
maior parte da bolsa/sala/leilão/correio/chat/casamento/termas não mudam de código** entre as
duas versões. Confirma o que `docs/features/COMO-FUNCIONA.md` já descreve pra 4.1.

Códigos **novos em 6600** (amostra, por família — lista completa é o diff do arquivo):
`NEW_HALL=262`, `BOMB_KING=263`, `HORSE=260`, `HORSERACE=282`, `COLLECTION_TASK=261`,
`FLOWER_GIVING=257`, `MAGIC_STONE=258`, `MAGPIE_BRIDGE=276`, `RESCUE=277`, `MYSTERY_SHOP=278`,
`DRAGON_BOAT=100`, `WORSHIP_THE_MOON_MID_AUTUMN=281`, `CRYPTBOSS=275`, `KING_DIVISION=328`,
`TOTAL_CHARGE=264`, `DEED_MAIN=2272` (parece sistema de "escritura"/progressão tipo passe),
`GROWTH...` (ver `GrowthPackageType.cs`), `TRANSNATIONALFIGHT_ACTIVED=154`,
`CONSORTIA_BATTLE=153`, `GRID lock/CAMPBATTLE=146`, `TREASUREPUZZL=145`, `DICE_SYSTEM=134`,
`BATTLE_GROUND=132`, `TRUSTEESHIP=140`, `SEVEN_DOUBLE=148`, `LAUNCHER_LOGIN=208` (login via
launcher — relevante pro nosso `apps/launcher`), `CARDS_SOUL=208` **colide com `LAUNCHER_LOGIN`
no mesmo valor 208 no C# de 6600** (duplicidade existente no próprio código deles, cuidado ao
portar).

Códigos **que trocaram de valor** entre as versões (mesmo nome, número diferente — risco real,
quebra se portar sem ajustar): `ITEM_REFINERY` 110→210, `OPTION_UPDATE` 0x40→64 (igual em valor,
só a notação mudou), `ANSWERBOX_QUESTIN` 0x1F→31 (idem, notação), `GOODS_EXCHANGE`/`COLLECTINFO`
0x1F/0x20→31/32 (idem), `ACCUMULATIVELOGIN_AWARD` 338→238, `ROOM_SAVE_OBJECT`/`CONSORTIA_RESPONSE`
0x80→128 (idem, notação), `AMARRYINFO_REFRESH` mantém 239 mas `MARRYINFO_DELETE`/`MARRYINFO_UPDATE`
somem do enum 6600 (substituídos por `PLAYER_DRESS=237`, que ocupa o valor que era
`MARRY_ROOM_UPDATE`/afins na 4.1 — **conflito de valor a resolver na mão, não automatizável**).
`USE_ANSWER`/`USER_ANSWER=15` igual. `MARRY_ROOM_UPDATE` 0xFF(255)→255 (igual). Conclusão: a
família de pacotes de **casamento tem pelo menos um valor reciclado** (`PLAYER_DRESS=237`) —
qualquer porte precisa named-diff campo a campo, não só pegar o enum novo inteiro.

Sub-pacotes (`*PackageType.cs`, pasta `Game.Server/Packets` → `Game.Server.Packets`): 4.1 tem
22 arquivos, 6600 tem 51. Os 29 novos (nomes de arquivo): `ActiveSystemPackageType`,
`ActivityPackageType`, `AvatarCollectionPackageType` (já existia como `.as` no cliente 4.1,
client-side, mas sem arquivo C# dedicado — ver observação em §4), `BattleGoundPackageType`,
`BombKingPackageType`, `CampPackageType`, `CatchBeastPackageType`, `CollectionTaskPackageType`,
`DicePackageType`, `DragonBoatPackageType`, `EliteGamePackageType`, `FlowerGivingPackageType`,
`GrowthPackageType`, `GypsyShopPackageType`, `HorsePackageType`, `HorseRacePackageType`,
`MagicHousePackageType(+In/Out)`, `MagicStonePackageType`, `MagpieBridgePackageType`,
`NewHallPackageType`, `RechargePackageType`, `SearchGoodsPackageType`, `SevenDoublePackageType`,
`TreasurePackageType`, `TrusteeshipPackageType`, `WorshipTheMoonPackageType`.

### 1.2 Módulos de UI (SWF)

Comparei nomes de arquivo (não conteúdo) entre:
- nosso pack vivo (4.1): `apps/api/assets/flash/ui/vietnam/swf/` → 102 SWFs
- 6600 compilado: `vendor/DDT-6600/WebSimple/Flash_6600_v040/ui/turkey/swf/` → 174 SWFs
  (tem uma segunda pasta de idioma `ui/1/swf` com 170, quase a mesma lista — o dono citou
  "347 UI SWFs", bate: 170+174+~7 soltos na raiz de `Flash_6600_v040` ≈ 351)

122 nomes existem só no 6600. **Boa parte não é feature nova, é renome** — o 6600 prefixou
muitos módulos centrais com `ddt`: `hall.swf`→`ddthall.swf`/`ddthallmain.swf`,
`academy.swf`→`ddtacademy.swf`, `email.swf`→`ddtemail.swf`, `invite.swf`→`ddtinvite.swf`,
`feedback.swf`→`ddtfeedback.swf`, `cardsystem.swf`→`ddtcardsystem.swf`,
`consortia.swf`→`ddtconsortion.swf`, `fightlib.swf`→`newfightlib.swf`. Descontando os renomes,
a lista de **módulos realmente novos** (confirmados por nome, bate com o inventário de pacotes
do §1.1) é: `catchbeast.swf`, `collectiontask.swf`, `rescue.swf`, `growthpackage.swf`,
`playerdress.swf`, `avatarcollection.swf`, `magicstone.swf`, `magichouse.swf`, `horse.swf`,
`horseRace.swf`, `dragonboat.swf`, `kingdivision.swf`, `flowergiving.swf`, `magpiebridge.swf`,
`worshipTheMoon.swf`, `cryptBoss.swf`, `battleground.swf`, `bombking.swf`, `ringstation.swf`,
`dice.swf`, `campbattle.swf`, `kingbless.swf`, `treasurepuzzle.swf`/`treasure.swf`/`treasurelost.swf`,
`sevendouble*.swf` (3 arquivos), `lanternriddles.swf`, `godsroads.swf`, `lightroad.swf`,
`halloween.swf`, `christmas.swf`, `newyearrice.swf`, `grouppurchase.swf`, `gypsyshop.swf`,
`enchant.swf`, `gemstone.swf`, `escortgame.swf`/`escorticon.swf`/`escortframe.swf`,
`ddtbagandinfo.swf` (bolsa nova — bate com as abas novas da referência), `lottery.swf`,
`mysteriousroulette.swf`, `ddtim.swf`, `newhandopencartoon.swf`/`newopenguide.swf`/`newversionguide.swf`
(onboarding novo), `yyvip.swf`, `superwinner.swf`.

50 nomes existem só no nosso pack 4.1 e não aparecem (nem renomeados por heurística óbvia)
no 6600: `consortiabattle.swf`, `feedback.swf` (renomeado, falso-positivo da heurística),
`fightlib.swf` (renomeado p/ `newfightlib.swf`), `hotspringroom.swf`, `invite.swf`, `login.swf`
— **candidatos a terem sido absorvidos/fundidos em outro módulo**, confirmar comparando conteúdo
(FFDec) quando for portar cada tela, não só pelo nome.

### 1.3 Config/XML/Request (API HTTP)

- 4.1: `vendor/DDTank41/Tank.Request/` → 123 `.ashx`, 151 `.xml` estáticos. Nosso
  `apps/api/src/request/registry.ts` cobre isso hoje (74 linhas, endpoints portados em
  `apps/api/src/request/endpoints/*.ts` + builders de template).
- 6600: `vendor/DDT-6600/Request/` → 263 `.ashx`, 184 `.xml`, **35 `.aspx` que não existem na
  4.1** (`AASGetState.aspx`, `AASUpdateState.aspx`, etc. — "AAS" não decodificado ainda, provável
  anti-cheat ou "Account/Avatar State"; investigar antes de portar login).
- Conclusão prática: **~140 endpoints novos**, a maioria .ashx que devolve XML de template pra UI
  nova (ex. `activitysystemitems.xml`, `activityhalloweenrank.ashx`) — mesmo padrão dos builders
  que já existem em `apps/api/src/templates/defs.ts`, só que com schema XML novo por feature.

### 1.4 Login/handshake/crypto

Códigos de handshake idênticos nos dois (`LOGIN=1`, `RSAKEY=7`, `PING=4`, `NETWORK=6`,
`SYS_DATE=5`, `SYS_MESSAGE=3`) → **o fluxo de login/criptografia RSA que já roda em
`packages/protocol` não muda**. Único ponto de atenção: `LAUNCHER_LOGIN=208` é novo no 6600
(login alternativo vindo do launcher desktop, relevante pro nosso `apps/launcher`) e colide de
valor com `CARDS_SOUL=208` no próprio enum deles — decidir manualmente qual mapear.

### 1.5 Risco de compatibilidade com Ruffle

Baseline conhecido: `research/client/02-ruffle-report.md` (cliente 4.1 sobe no Ruffle sem patch
até abrir o socket; riscos conhecidos: fonte device, NetStream/FLV de música, timing de frame
script). Comparando APIs de risco entre as fontes AS3 (`grep -rl <api> .../src | wc -l`):

| API de risco | 4.1 (`Source Flash/src`) | 6600 (`Flash_Project/DDT660/src`) |
|---|---|---|
| `Stage3D` | 0 | 0 |
| `StageVideo` | 0 | 0 |
| `flash.system.Worker` | 0 | 0 |
| `flash.media.Video` | 1 arquivo | 1 arquivo |
| `NetStream` | 2 arquivos | 5 arquivos |
| `decry(` (módulo "criptografado", caminho que já preocupava no relatório Ruffle) | 1 | 1 |
| `ExternalInterface` | 36 | 34 |

Nenhuma API de alto risco nova (sem Stage3D/Worker/StageVideo nos dois). O único aumento real é
`NetStream` (2→5 arquivos) — mais telas usando vídeo/FLV, o que já era o risco #1 conhecido
("Patch 1" no relatório Ruffle) e agora pesa um pouco mais. **Resumo: 6600 não parece pior que
4.1 pro Ruffle**, mas o relatório precisa ser refeito contra o SWF compilado do 6600 (o atual só
testou o pack 4.1) antes do Milestone 1.

## 2. Servidor C# 6600 vs 4.1

### 2.1 Estrutura e handlers

Pastas de feature dentro de `Game.Server` (4.1: `vendor/DDTank41/Game.Server/*` = 28 pastas;
6600: `vendor/DDT-6600/Source/Game.Server/Game.Server.*` = 58 pastas, incluindo variantes
`.Handle`). Sistemas **inteiramente novos** em 6600 (sem equivalente em 4.1):
`AvatarCollection`, `BombKing`, `BuffHorseRace`, `CollectionTask`, `DragonBoat`, `FlowerGiving`,
`GypsyShop`, `Horse`, `MagicHouse`, `MagicStone`, `MagpieBridge`, `NewHall`, `WorshipTheMoon`,
`ActiveSystem`, `Commands.Admin`. `RingStation` (arena/ranked) em 4.1 é uma pasta simples; em
6600 virou 4 pastas (`RingStation`, `.Battle`, `.RoomGamePkg`, `.RoomGamePkg.TankHandle`) —
sistema bem mais elaborado, provável fonte da "Liga dos Exploradores"/PvP ranqueado da
referência.

`Fighting.Server` (motor de batalha/sala, usado em PvP e GvG) é **quase idêntico**: mesmas
pastas (`GameObjects`, `Games`, `Guild`, `Rooms`, `Servers`) nas duas versões, 6600 só adiciona
`Config/`. Combinado com o `eFightPackageType` quase igual (§1.1), isso é a evidência mais forte
do doc inteiro: **o motor de combate não precisa ser reescrito**, só estendido pros modos novos
(barco-dragão, RingStation).

Novidade de infraestrutura: `Center.Crosszone.Server` + `Center.Crosszone.Service`
(`vendor/DDT-6600/Source/Center.Crosszone.Server`) não existem em 4.1 — é um Center Server
dedicado a comunicação **entre servidores** (cross-zone), o que faz sentido com
`TRANSNATIONALFIGHT_ACTIVED=154`, `CONSORTIA_BATTLE=153` e `KING_DIVISION=328` do §1.1. Pra um
server único (nosso caso, 1 só apps/game) isso pode ser simplificado/pulado — ver risco no §5.

### 2.2 Banco de dados

Hoje `packages/db/src/schema/*.ts` já tem **198 tabelas** (`game`=104 em `game.ts`, `player`=73
em `player.ts`, `member`=21 em `member.ts`) — e **não é um schema 4.1 puro**: já inclui tabelas
de features "tardias" como `Sys_Users_AvatarCollection`, `Sys_User_Gemstone` e `Totem` (prováveis
herdadas do fork `remake/main`/SkelletonX usado como base). Isso reduz o gap esperado.

O 6600 só existe como backup SQL Server (`vendor/DDT-6600/Db/Db_Tank.bak`, 33 MB — não
restaurado, não há SQL Server disponível neste ambiente de pesquisa). Fiz uma raspagem de texto
bruto no `.bak` (`node -e` lendo o arquivo como latin1 e regexando `Sys_\w+`/`Consortia\w*`/etc,
porque backups do SQL Server guardam o texto-fonte de procedures/views em claro nas páginas de
sistema) — é uma evidência **parcial e ruidosa** (achei corrupções de byte tipo `Sys_Useqs_Detail`
por `Sys_Users_Detail`), não um diff de schema de verdade. Mesmo assim, confirmei pelo menos
estas tabelas que **não existem** no nosso `packages/db` hoje:

| Tabela (6600) | Feature provável |
|---|---|
| `Mount_Data` | Montarias (`horse.swf`/`horseRace.swf`) |
| `Sys_User_Drills` | Treino/Academia ("Sist. Treino" da referência) |
| `Sys_User_MagicHouse` | Casa Mágica (loja especial) |
| `Sys_User_Pet_Form` | Evolução/forma de pet |
| `Sys_User_RingStation` | Arena ranqueada |
| `Sys_User_Treasure` | Sistema de tesouro (`treasure*.swf`) |
| `Sys_Users_Christmas` | Save de evento sazonal (Natal) |

**Próximo passo real (não feito aqui, é trabalho de M0):** restaurar `Db_Tank.bak` num SQL
Server/Docker (mesmo método de `research/db/HOWTO-restore.md`, já usado pra 4.1) e rodar
`INFORMATION_SCHEMA.TABLES`/`COLUMNS` contra as 198 tabelas atuais pra ter o diff de verdade —
a lista acima é só a ponta visível.

## 3. Matriz de reaproveitamento

| Peça nossa | Reaproveitar | Motivo |
|---|---|---|
| `packages/protocol` (framing, cripto RSA, `GSPacket`) | **Como está** | Códigos de handshake idênticos (§1.4); formato de frame TCP/WS não muda entre versões do jogo, só o conteúdo dos pacotes de feature |
| `packages/db` (schema Drizzle, 198 tabelas) | **Adaptar** (adicionar, não reescrever) | Já cobre a maior parte da 4.1 + algumas tabelas tardias; precisa só das tabelas novas por feature (§2.2) via migration incremental |
| `packages/game-data` (loaders de template) | **Adaptar** | Mesmo padrão de carregar `game.*` em memória no boot; só aumenta a lista de tabelas carregadas quando as features novas tiverem tabela própria |
| `packages/fight` (motor de combate, 727 arquivos `.ts`) | **Como está + extensão pontual** | `Fighting.Server` e `eFightPackageType` quase idênticos entre versões (§2.1); só precisa dos +4 pacotes de modo novo (barco-dragão, RingStation) |
| `apps/game/src/handlers/*` (210 arquivos, 19 pastas por área) | **Adaptar + pastas novas** | Pastas atuais (`forja/`, `bolsa/`, `mascote/`...) continuam valendo pros códigos idênticos do §1.1; cada sistema novo do §2.1 ganha pasta própria (`handlers/montaria/`, `handlers/totem/`...) seguindo o mesmo padrão `registerX(r)` |
| `apps/api/src/request/*` (endpoints .ashx) | **Adaptar + ~140 endpoints novos** | Mesmo padrão de builder XML (`templates/defs.ts`); maioria dos endpoints novos é "lista de template estático" (baixo esforço por endpoint, alto em quantidade) |
| `apps/admin` (CRUD genérico + `resources/*.ts`) | **Como está + resources novos** | O CRUD genérico (`defineResource`) não muda; só cadastrar as tabelas novas do §2.2 como resource quando existirem |
| `apps/web` (site, login, play) | **Como está** | Não depende de qual versão do cliente/protocolo — só precisa saber servir os SWFs novos e falar com os endpoints novos |
| `tools/qa/packet-coverage.mjs` | **Adaptar** | Lê os códigos de `ePackageType`/handlers pra gerar a matriz de cobertura — precisa apontar pro enum 6600 (`vendor/DDT-6600/Source/Game.Server/Game.Server.Packets/ePackageType.cs`) em vez do 4.1 |
| `tools/docs/game-map.mjs` (tela → pacote → handler) | **Adaptar** | Mesma lógica, só precisa indexar os módulos SWF novos e os handlers novos quando existirem |
| `tools/i18n/*` (tradução PT-BR, Skelleton match) | **Reaproveitar o pipeline, refazer os dados** | O método (achar string no `.abc`, traduzir, montar `language.txt`) vale igual; o texto fonte é outro arquivo (`vendor/DDT-6600/WebSimple/Flash_6600_v040/ui/*/language.txt`, ainda não auditado) |
| `tools/remaster/*` (HD/remaster de imagem) | **Como está** | Pipeline de remaster (recorte, prompt, compose) não depende da versão do jogo, só da imagem de entrada — e o 6600 já é visualmente "mais HD" que 4.1 em vários módulos (menos remaster manual necessário em telas que o 6600 já redesenhou) |
| Vendor `SkelletonX-DDTank4.1*` (import de textos/imagens) | **Não se aplica direto** | É específico da estrutura 4.1; se for reaproveitado, precisa de um "SkelletonX" equivalente apontando pro layout de arquivo do 6600 (nomes de SWF e `language.txt` são diferentes) |

## 4. Mapa de features (referência `research/ddclassico/*.png`)

| Feature na referência (BR) | Módulo/arquivo no 6600 | Pacote (`ePackageType`) | Status |
|---|---|---|---|
| Lobby/Salão HD | `ddthall.swf`, `ddthallmain.swf` | `NEW_HALL=262` | **Novo** — substitui `hall.swf` (4.1) |
| Bag → aba Perfil | `ddtbagandinfo.swf` | (dentro de `GRID_GOODS`/`UPDATE_PLAYER_INFO`, códigos já existentes) | Adaptação de UI, lógica já existe |
| Bag → aba Sist. Treino | — (sem SWF 1:1 óbvio; tabela `Sys_User_Drills` confirmada no banco, §2.2) | a confirmar (não achei `*PackageType.cs` dedicado — pode estar embutido em `ActiveSystemPackageType`) | **A confirmar jogando o 6600** |
| Bag → aba Presentes | pacotes `USER_GET_GIFTS=218`/`USER_SEND_GIFTS=221` | já existem **iguais nas duas versões** | **Já portável hoje**, não depende do 6600 |
| Bag → aba Sist. Totem | `TOTEM=136` (idêntico 4.1/6600) | já existe | **Já portável hoje** (tabela Totem já existe em `packages/db`) |
| Bag → aba Álbum | `avatarcollection.swf` | `AVATAR_COLLECTION=402` — **já existe igual em 4.1** (achei `Source Flash/src/AvatarCollection/AvatarCollectionPackageType.as` na própria 4.1!) e já tem tabela `Sys_Users_AvatarCollection` em `packages/db` | **Já portável hoje, não depende da migração pro 6600** |
| Bag → aba Fugura ("Figura"?) | `playerdress.swf` (candidato) | `PLAYER_DRESS=237` | Novo, mas valor de pacote **colide com algo da família Marry na 4.1** (§1.1) — cuidado |
| Bag → aba Relíquias | candidatos: `magicstone.swf` ou extensão de `ddtbead.swf` | `MAGIC_STONE=258` | **A confirmar** (nome "relíquia" não bate 1:1 com nenhum arquivo, decidir jogando) |
| Vestir com encanto | `enchant.swf` + `playerdress.swf` | `ITEM_ENCHANT=280` | Novo |
| Passe Clássico (battle pass) | `growthpackage.swf` | `GrowthPackageType.cs` (valores a extrair) | Novo — é o candidato mais forte pra "passe de batalha" |
| Evento limitado (sazonal) | `christmas.swf`, `halloween.swf`, `newyearrice.swf`, `worshipTheMoon.swf` | `WORSHIP_THE_MOON_MID_AUTUMN=281` e primos | Novo, mas é "um SWF por evento" — escolher 1-2 pra portar primeiro |
| Capturar Nian | `catchbeast.swf` | `CatchBeastPackageType.cs` | Novo, nome bate exatamente (Nian = "besta" do ano novo chinês) |
| Liga dos Exploradores | candidato: `kingdivision.swf` + infra `Center.Crosszone.Server` | `KING_DIVISION=328` | Novo, mas depende de decidir se cross-server entra no escopo (§5 riscos) |
| Expedição do Tio Tony | candidatos: `escortgame.swf`/`escorticon.swf`/`escortframe.swf` | a extrair de `Game.Server.Packets` (não achei `EscortPackageType.cs` dedicado — pode estar sob `ActivityPackageType`) | **A confirmar jogando** |
| Resgate | `rescue.swf` | `RESCUE=277` | Novo, nome bate exatamente |
| Coleta | `collectiontask.swf` | `COLLECTION_TASK=261` | Novo, nome bate exatamente |

Conclusão do mapa: **3 das ~13 features da referência já existem hoje** (Presentes, Totem,
Álbum) e não dependem da migração — podem ser feitas já, na 4.1, como ganho rápido. As demais
(~10) realmente precisam do 6600 ou de design próprio (quando não achei SWF/pacote
correspondente).

## 5. Plano por fases

**M0 — Preparação (1-2 semanas).** Sem código de feature ainda.
- Restaurar `Db_Tank.bak`/`Db_Membership.bak` num SQL Server/Docker local (mesmo método do
  `research/db/HOWTO-restore.md`) e gerar o diff real de schema (hoje só tenho o scrape parcial
  do §2.2).
- Extrair os 351 SWFs do 6600 com FFDec pra inventariar símbolos/classes por módulo novo (hoje
  só comparei nome de arquivo, §1.2) — decide quais dos 50 "só em 4.1" foram de fato fundidos
  vs removidos.
- Refazer `research/client/02-ruffle-report.md` contra o SWF compilado do 6600 (boot até login),
  igual foi feito pra 4.1.
- Decidir o escopo de `Center.Crosszone.Server` (cross-server): se os servidores forem só o
  nosso, simplificar pra "mono-server" ou manter stub, porque reimplementar comunicação
  inter-servidor é o item de maior risco de esforço do doc inteiro.
- **Critério de saída:** diff de schema real gerado, relatório Ruffle novo publicado, decisão de
  escopo cross-server registrada em `docs/AI-HANDOFF.md` (quem fizer essa fase atualiza lá — fora
  do escopo deste agente).

### Resultado M0 (2026-10-17)

Feito, pesquisa apenas (nenhum código de `apps/**`/`packages/**` tocado):

- **Diff de schema real**: `.bak` do 6600 restaurados via LocalDB (reaproveitando a
  instância `DDTank` já criada pra 4.1, `research/db/HOWTO-restore.md` — Docker não está
  disponível neste ambiente) como `Project_Game6600`, `Db_Membership6600`, `Db_Count6600`.
  Exportados com `vendor/_tools/export.mjs`. Resultado completo em
  **`research/6600/db-diff.md`** + schema bruto em `research/6600/db/<Db>/schema/`. Achados
  principais: 6600 funde Game+Player num banco só (não exige mudança nossa);
  ~30 tabelas de gameplay novas confirmadas (Montaria, Treino, Casa Mágica, Arena
  RingStation, Tesouro, Relíquias, Dados, Natal...); colunas novas em tabelas que já temos
  (`Sys_Users_Detail`/`Sys_Users_Extra`/`Sys_Users_Goods` ganham campos de Passe Clássico,
  Juramento do Rei, Ponte da Pega e **dano mágico por item** — isto é estrutural pro motor
  de combate, não só os 4 pacotes de modo novo já citados no §1.1 acima); `Db_Count`
  (68 tabelas) é analytics/log vazio, recomendado não portar como schema.
- **Inventário de SWF por conteúdo**: FFDec confirmou (amostra de 7 SWFs decompilados) que
  o pacote AS3 dentro do SWF compilado bate 1:1 com os diretórios de
  `vendor/DDT-6600/Flash_Project/DDT660/src/` (fonte AS3 completa já no repo) — método
  usado pra mapear os ~45 módulos novos restantes sem precisar decompilar cada um.
  Resultado em **`research/6600/swf-inventory.md`** (tabela módulo → feature PT-BR →
  tamanho → pacote AS3 → arquivo `PackageType` correspondente).
- **Boot do cliente**: reconstruído por leitura de C# (`Tank.Request`), sem rodar nada.
  Resultado em **`research/6600/client-boot.md`**. Achados: sequência de boot/login é
  estruturalmente igual à 4.1 (`Login.ashx`/`LoginSelectList.ashx`/`CreateLogin.ashx` já
  existem com os mesmos nomes em `apps/api/src/request/`); `config.xml` do 6600 tem flags
  `enable=`/`value=` por feature que permite servir o pacote 6600 inteiro desligando telas
  ainda não implementadas no servidor (reduz risco de M1); `AASGetState`/`AASUpdateState`
  decodificado = sistema anti-vício chinês/asiático (Anti-Addiction System, campos
  Name/IDNumber), fora de escopo pro BR, stub simples se necessário; `directlogin.ashx` é
  SSO de portal externo, não precisa ser portado. Zero mudança de crypto/handshake
  (`RsaDecryt2` + split de 4 campos, igual à 4.1) — `packages/protocol` não muda no M1.
  Relatório Ruffle novo (subir o SWF compilado de fato) **não foi feito** — exige browser,
  fora do escopo de pesquisa estática desta sessão; fica pendente pro M1.
- **Cross-server**: `Center.Crosszone.Server` lido por completo (24 arquivos, pequeno).
  Resultado em **`research/6600/crosszone.md`**. Decisão: **não portar, nem como stub** —
  é arbitragem de conta + relay de chat/guilda/correio entre múltiplos `Game.Server`, e
  nós somos mono-servidor por design (cada responsabilidade dele já colapsa em algo que
  já existe in-process ou não se aplica). RingStation/KingDivision/GvG cross-server
  (as únicas features de gameplay que dependem do nome "cross-zone") são implementadas
  como matchmaking local normal quando chegar a vez delas — não dependem da interface WCF
  do Crosszone num servidor único.

**Lista de tarefas M1 (ordem sugerida, cada uma com arquivos a tocar):**

1. **Adaptar `scripts/gen-schema.ts`** (ou criar variante) pra aceitar `Project_Game6600`/
   `Db_Membership6600` como fonte e gerar os ~30 arquivos Drizzle novos listados em
   `research/6600/db-diff.md` (tabelas de Montaria, Treino, Casa Mágica, RingStation,
   Tesouro, Relíquias, Dados, eventos sazonais) dentro de `packages/db/src/schema/`, mais
   migration incremental — sem tocar nas 191 tabelas já existentes.
2. **Trocar o pack SWF servido** por `apps/api/assets/flash` do pack 4.1 pro pack 6600
   (`ui/turkey` como base — já é PT/BR-adjacent segundo `config.xml`), mapeando os ~170
   módulos renome 1:1 de `docs/plan/MIGRACAO-6600.md` §1.2, usando as flags `enable=` do
   `config.xml` do 6600 (ver `research/6600/client-boot.md`) pra desligar todo módulo cuja
   feature de servidor ainda não exista — evita quebra de tela por handler ausente.
3. **Gerar `language.txt`/traduções PT-BR do pack 6600** via `tools/i18n/skelleton-match.mjs`
   apontando pro `language.txt` novo (`vendor/DDT-6600/WebSimple/Flash_6600_v040/ui/turkey/`),
   reaproveitando o pipeline existente (dado de entrada novo, método igual).
4. **Portar os pacotes idênticos primeiro** (login, bolsa básica, chat, sala básica — já
   citados no plano §1.1) sem lógica nova de servidor, só validando que o cliente 6600
   fala com os handlers que já existem em `apps/game/src/handlers/*`.
5. **Refazer `research/client/02-ruffle-report.md`** contra o SWF compilado do 6600 (boot
   até login, com browser real) — pendência explícita deixada pelo M0 acima.
6. **Critério de saída do M1** (já estava no plano, mantido): login + criar personagem +
   entrar no lobby novo (visual 6600) via Ruffle, conectado em `apps/game`/`apps/api` já
   existentes, sem regressão nas telas que já funcionavam na 4.1.

**M1 — Cliente 6600 sobe até o lobby contra nosso servidor (3-4 semanas).**
- Trocar o pack servido por `apps/api/assets/flash` pelo pack do 6600 (`ui/turkey` ou `ui/1`,
  decidir idioma-base) mantendo os ~170 módulos que são renome 1:1 (§1.2) via mapeamento de nome.
- Portar só os pacotes **idênticos** do §1.1 (login, bolsa básica, chat, sala básica) — zero
  lógica nova de servidor nesta fase, só trocar o cliente.
- **Critério de saída:** login + cria personagem + entra no lobby novo (visual 6600) via Ruffle,
  conectado no nosso `apps/game`/`apps/api` já existentes, sem regressão nas telas que já
  funcionavam na 4.1.

**M2 — Loop central (bolsa completa/loja/salas/batalha) (4-6 semanas).**
- Portar os handlers cujo código mudou de valor ou de forma (ex. família `MARRY_*`/`PLAYER_DRESS`
  do §1.1, `ITEM_REFINERY`).
- Estender `packages/fight` com os 4 pacotes novos de `eFightPackageType` (barco-dragão,
  RingStation) — motor em si não muda (§2.1/§3).
- **Critério de saída:** uma partida PvP completa + forja + loja + correio funcionando 100% no
  cliente 6600, nenhuma regressão no `apps/game/test/*`.

**M3 — Resto dos handlers + endpoints novos (6-8 semanas, maior fase).**
- Portar os ~140 endpoints Request novos (§1.3) seguindo o padrão `templates/defs.ts`.
- Portar os sistemas de servidor novos do §2.1 que não são "evento sazonal" (RingStation
  completo, NewHall, AvatarCollection — se ainda não feito no M0 ganho-rápido do §4).
- **Critério de saída:** `tools/qa/packet-coverage.mjs` (adaptado pro enum 6600) mostrando
  cobertura por área, sem "missing" nos sistemas core.

**M4 — Features novas da referência DDClássico (4-6 semanas).**
- Portar, em ordem de confiança do mapa §4: Coleta, Resgate, Capturar Nian (nomes batem exato,
  baixo risco de design) → Passe Clássico (growthpackage) → Vestir com Encanto/Relíquias (ainda
  "a confirmar", exige jogar o 6600 primeiro) → Liga dos Exploradores (só se cross-server entrar
  no escopo) → eventos sazonais (escolher 1-2, não os ~8 disponíveis).
- **Critério de saída:** as features da lista do dono (`research/ddclassico`) presentes e
  configuráveis no admin.

**M5 — Remaster HD + PT-BR (contínuo, em paralelo com M3/M4).**
- `tools/remaster/*` já serve (§3); como o 6600 já é mais HD que a 4.1 em várias telas, o volume
  de remaster manual deve ser menor que o que já foi feito pra 4.1 — mas telas 100% novas
  (Passe Clássico, novo hall) ainda exigem o pipeline completo de PT-BR de imagem.
- `tools/i18n/*` reaproveita o método, mas o texto-fonte (`language.txt` do 6600) é outro arquivo
  — rodar `tools/i18n/skelleton-match.mjs` contra ele quando disponível.
- **Critério de saída:** telas novas com texto PT-BR e visual remasterizado, sem arte/branding
  do DDClássico (só design próprio inspirado no layout).

### Riscos e como reduzir
- **Maior risco: `Center.Crosszone.Server`** (comunicação entre servidores) — decidir no M0 se
  simplifica pra mono-server; se não decidir, infla M3/M4 sem necessidade real (somos 1 servidor
  só, não uma rede de servidores regionais como o 6600 original).
- **Valores de pacote reciclados** (`PLAYER_DRESS=237`, `ITEM_REFINERY` 110→210) — não dá pra
  gerar código automaticamente a partir do enum novo; cada família precisa de diff manual campo a
  campo antes de portar o handler.
- **Nomes de SWF renomeados vs removidos** (§1.2, 50 nomes "só na 4.1") — confirmar por conteúdo
  (FFDec), não por nome, antes de assumir que uma tela foi removida.
- **De-risco geral:** manter a branch/stack 4.1 atual **viva e jogável** até o 6600 alcançar
  paridade nas áreas com "dívida" que já existem hoje (`docs/MIGRATION-GAP.md` — Combate 39,
  Eventos 37, Guilda 28, Bolsa 27, Casamento 24, Missões 23, Salas PvP 21): não vale a pena
  migrar de versão de cliente antes de zerar esse gap, porque ele se soma ao gap novo do 6600 em
  vez de ser substituído por ele.

### Ferramentas existentes — como adaptam
- `tools/qa/packet-coverage.mjs`: trocar a fonte do enum (4.1→6600) e reexecutar; é o
  termômetro de progresso de M2/M3.
- `tools/docs/game-map.mjs`: reindexar quando os SWFs novos entrarem no pack servido.
- `tools/i18n/*` e `tools/remaster/*`: método igual, dados de entrada novos (ver M5).
- Import "Skelleton" (`vendor/SkelletonX-DDTank4.1*`): específico da 4.1; não dá pra reaproveitar
  o dado, só o método — se for útil, outro agente teria que gerar um `SkelletonX-DDT6600`
  equivalente a partir do `.abc` dos SWFs novos.

## Requisito futuro: vários canais (decisão do dono, 2026-10-17)

O dono quer **vários canais** (Canal 1, 2, 3, 4…) como no DDTank original/DDClássico, **criados e editados pelo
admin**. Isso reverte a recomendação do M0 de "pular o Crosszone": não entra no M1, mas a arquitetura tem que nascer
pronta pra isso.

Desenho proposto (não implementado):
- **1 canal = 1 processo `apps/game`** (mesmo código, `SERVER_ID`/porta próprios), todos no mesmo Postgres.
  Em produção, 1 serviço Docker por canal (`docker-compose` com réplicas parametrizadas, ou 1 service por canal
  gerado a partir da tabela de canais).
- **Lista de canais = tabela** (`player.Server_List` / `app` equivalente) servida por `ServerList.ashx`
  (`apps/api/src/request/endpoints/ServerList.ts`, já existe) — o cliente já mostra a lista e o seletor "Canal".
  Admin: CRUD de canal (nome, porta, capacidade, estado aberto/manutenção/cheio, ordem, flags tipo PvP/novato).
- **Center (coordenação entre canais)** — o que o `Center.Server`/`Center.Crosszone.Server` do C# fazem:
  login único por conta (derruba sessão em outro canal), chat mundial/alto-falante e sussurro entre canais,
  amigos/sociedade online em qualquer canal, eventos globais (boss mundial, liga, King Division/RingStation
  entre canais), troca de canal sem relogar. Implementação TS: um barramento leve (Redis pub/sub ou NATS) +
  presença em Redis; cada `apps/game` publica/assina. Sem Redis em dev → modo mono-canal (comportamento atual).
- **Fase sugerida:** depois do M2 (loop central no 6600), antes das features que dependem de cross-server
  (Liga dos Exploradores / King Division).
