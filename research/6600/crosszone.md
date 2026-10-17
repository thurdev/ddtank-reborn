# M0 — Center.Crosszone.Server: o que faz e se precisamos dele

> Pesquisa apenas. Decisão pedida por `docs/plan/MIGRACAO-6600.md` §5 (M0): "decidir o
> escopo de `Center.Crosszone.Server` (cross-server): se os servidores forem só o nosso,
> simplificar pra mono-server ou manter stub".

## O que é, de fato

`vendor/DDT-6600/Source/Center.Crosszone.Server/` — 24 arquivos C#, bem pequeno (não é um
sistema grande). É um serviço WCF (`[ServiceContract] ICenterService`) que fica no meio
entre **múltiplos** `Game.Server` e faz arbitragem de conta + broadcast administrativo.
Interface completa (17 métodos, `Center.Server/ICenterService.cs`):

```
ActiveEvent, GetServerList, ChargeMoney, SystemNotice, RemoteServer, KitoffUser,
ReLoadServerList, MailNotice, ActivePlayer, CreatePlayer, ValidateLoginAndGetID,
AASUpdateState, AASGetState, ExperienceRateUpdate, NoticeServerUpdate,
UpdateConfigState, GetConfigState, Reload
```

E um `ePackageType` próprio (pacotes que o Center manda pros Game.Server, não pro
client): `RSAKey, LOGIN, KITOFF_USER, ALLOW_USER_LOGIN, USER_OFFLINE, USER_ONLINE,
USER_STATE, UPDATE_ASS, CHARGE_MONEY, SYS_NOTICE, SYS_CMD, SCENE_CHAT, CHAT_PERSONAL,
CHAT_AREA_PERSONAL, MAIL_RESPONSE, CONSORTIA_* (sync de guilda), FRIEND_STATE,
MACRO_DROP, IP_PORT, MARRY_ROOM_DISPOSE`.

Lendo os métodos e os pacotes, o trabalho real do Crosszone é:

1. **Lista de servidores + estado online** (`GetServerList`/`ReLoadServerList`,
   `ServerMgr.cs`) — pra tela de seleção de servidor mostrar "cheio"/"normal"/"baixo".
2. **Single-session enforcement entre servidores** (`ValidateLoginAndGetID`,
   `KitoffUser`, `USER_ONLINE`/`USER_OFFLINE`/`ALLOW_USER_LOGIN`) — impedir que a mesma
   conta logue em dois `Game.Server` diferentes ao mesmo tempo.
3. **Relay de chat/guilda/correio/amigo entre servidores** (`SCENE_CHAT`,
   `CHAT_AREA_PERSONAL`, `CONSORTIA_CHAT`/`CONSORTIA_OFFER`/`CONSORTIA_FIGHT`,
   `MAIL_RESPONSE`, `FRIEND_STATE`) — só importa se jogadores de servidores **diferentes**
   puderem interagir (chat de área global, guilda cross-server).
4. **Broadcast administrativo** (`SystemNotice`, `ActiveEvent`, `UpdateConfigState`,
   `Reload`, `ExperienceRateUpdate`) — avisar todos os `Game.Server` de uma vez quando o
   admin muda uma config ou ativa um evento.
5. **AAS** (`AASGetState`/`AASUpdateState`) — já coberto em `client-boot.md`, é o sistema
   anti-vício chinês/asiático, fora de escopo pro BR.

Não encontrei nenhuma lógica de **gameplay em tempo real** (física de luta, sincronização
de sala de PvP) no Crosszone — isso continua 100% dentro de `Fighting.Server`/`Game.Server`
de cada instância, que o próprio `docs/plan/MIGRACAO-6600.md` §2.1 já tinha confirmado como
"quase idêntico" entre 4.1 e 6600. O Crosszone é estritamente **arbitragem de conta +
mensageria entre processos**, nunca simulação.

## Recomendação: pular inteiramente, não portar nem como stub formal

Nós já somos mono-servidor por design (`apps/game` é a única instância de jogo; não existe
"lista de servidores" pro jogador escolher — `docs/AI-HANDOFF.md` nem fala em múltiplos
realms). Cada uma das 5 responsabilidades acima já colapsa em algo que **ou já existe, ou
não faz sentido**, sem precisar nem de um "stub" que implemente a interface WCF:

| Responsabilidade do Crosszone | No nosso mono-server |
|---|---|
| Lista de servidores + estado | `Server_List`/`ServerInfo` com 1 linha só — já é assim hoje na 4.1, não muda |
| Single-session entre servidores | Já é single-session **dentro de um processo só** — é exatamente o problema que `docs/AI-HANDOFF.md` lista como resolvido ("Login race: 2º login durante burst... fix em `login.ts waitLoginFree`"). Zero trabalho novo: é a mesma garantia, só que in-process em vez de via RPC. |
| Relay de chat/guilda/correio entre servidores | Não existe "entre servidores" quando só há um — handlers de chat/guilda/correio já escrevem direto no estado compartilhado do processo. Nada a portar. |
| Broadcast administrativo | Equivalente a chamar a função direto (ex. admin muda config → o próprio `apps/api`/`apps/admin` já escreve no Postgres que `apps/game` lê) — não precisa de um canal RPC separado pra "avisar outros servidores" porque não há outros servidores. |
| AAS | Fora de escopo (ver `client-boot.md`) |

**O único ponto onde "cross-zone" tem significado real pro nosso caso** é a feature de
jogo que o próprio nome sugere cross-server: `KingDivision` (Liga dos Exploradores) e
`TRANSNATIONALFIGHT_ACTIVED`/`CONSORTIA_BATTLE` (GvG entre servidores) — essas dependem de
"juntar jogadores de servidores diferentes numa sala". Como só temos um servidor, **isso
se resolve como matchmaking normal dentro do próprio `apps/game`**, sem nenhuma ponte
cross-process: é uma arena/ranqueado comum, só que todo mundo já está no mesmo lugar.
`Center.Crosszone.Server` nunca precisa ser lido de novo pra implementar essas features —
o trabalho real está em `Game.Server.Game.Server.RingStation*` (C#, já mapeado em
`docs/plan/MIGRACAO-6600.md` §2.1) e no SWF `kingdivision.swf`/`ringstation.swf`
(`research/6600/swf-inventory.md`), que já têm pacote AS3 e `PackageType.as`/`.cs`
identificados — nenhum deles depende da interface WCF do Crosszone pra funcionar num
servidor único.

## Decisão registrada (pra `docs/AI-HANDOFF.md` / M1 em diante)

**Center.Crosszone.Server não entra no escopo da migração.** Nenhum código dele será
portado, nem como stub. RingStation/KingDivision/GvG cross-server são implementados como
matchmaking local normal quando chegar a vez deles (M3/M4). Se um dia quisermos múltiplos
`apps/game` reais (ex. sharding por região), revisitar este documento — a interface WCF
acima é o ponto de partida de "o que replicar" nesse cenário hipotético, mas não é hoje.
