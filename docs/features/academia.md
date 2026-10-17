# Academia (mestre/aprendiz)

> Nota: `docs/MAPA-DO-JOGO.md` lista as ações `sendAcademy*` como "undefined A" /
> **FALTA PORTAR**. Isso é um falso-negativo da ferramenta de scan (ver rodapé de
> [README.md](./README.md)): ela não resolve o nome do sub-código quando o pacote
> usa um `SubRouter` por byte, que é o caso aqui (pacote único `141 ACADEMY`, sub-ações
> por `pkt.readByte()`). A feature **está implementada** — ver seção 2.

## 1. O que é no jogo
O sistema de Mestre/Aprendiz (ícone de Academia): um jogador de nível baixo (6 a 16)
pode pedir pra um jogador de nível alto (20+, com pelo menos 5 níveis de diferença)
ser seu **Mestre**; o mestre também pode convidar um aprendiz. Enquanto a relação dura,
os dois ganham caixas de recompensa a cada nível do aprendiz; quando o aprendiz chega
no nível 20 ele **se forma** (graduate), os dois recebem um prêmio final e a relação
se desfaz sozinha. Qualquer um dos dois pode **expulsar** o outro antes disso (custa
ouro e gera um "congelamento" temporário impedindo pedir outra relação).

Telas do cliente AS3 envolvidas: `AcademyRequestMasterFrame`/`AcademyRequestApprenticeFrame`
(pedir), `AcademyAnswerMasterFrame`/`AcademyAnswerApprenticeFrame` (aceitar/recusar),
`MyAcademyMasterFrame`/`MyAcademyApprenticeFrame` (ver sua relação atual, botão de
expulsar), `MasterGraduate`/`ApprenticeGraduate` (aviso de formatura),
`AcademyMasterMainFrame`/`AcademyApprenticeMainFrame` (lista de recomendados).

## 2. Onde fica no código
`apps/game/src/handlers/academia/` com 1 arquivo por ação do jogo (nome = o que o
jogador vê na tela):

| Arquivo | Conteúdo |
|---|---|
| `relacao.ts` | sem tela própria — infra compartilhada: string de relação, pedidos em memória, pacotes, mail, constantes |
| `pedir-relacao.ts` | pedir mestre/aprendiz + recusar |
| `aceitar-relacao.ts` | aceitar pedido (`addApprentice` + os dois CONFIRM) |
| `expulsar.ts` | romper relação (`fireMaster`/`fireApprentice` + os dois pacotes) |
| `premios-nivel.ts` | caixas de nível + formatura (`updateAwardApp`, chamado fora do pacote, no hook de level-up) |
| `index.ts` | `academyRouter()` + `registerAcademia(r)` |

Todas as ações usam o **mesmo pacote** `141 ACADEMY`; o servidor lê um `byte` logo no
início e despacha por ele (`academyRouter()`,
[`academia/index.ts:34`](../../apps/game/src/handlers/academia/index.ts#L34)).
`registerAcademia(r)` ([`academia/index.ts:50`](../../apps/game/src/handlers/academia/index.ts#L50))
registra o roteador em `r.player(141, "ACADEMY", a.handler)`.

| Ação (cliente AS3) | Sub-byte | Servidor TS | C# original |
|---|---|---|---|
| `sendAcademyRegister` (`register/AcademyRegisterFrame.as`) | 1 ACADEMY_REGISTER | stub, não-op ([`academia/index.ts:38`](../../apps/game/src/handlers/academia/index.ts#L38)) | `AcademyHandler.cs` case 1 |
| `sendAcademyRemoveRegister` | 3 ACADEMY_REMOVE | stub, não-op ([`academia/index.ts:39`](../../apps/game/src/handlers/academia/index.ts#L39)) | `AcademyHandler.cs` case 3 |
| `sendAcademyApprentice` (pede um **mestre**, `academyRequest/AcademyRequestMasterFrame.as`) | 5 ACADEMY_FOR_MASTER | [`academyForMaster`](../../apps/game/src/handlers/academia/pedir-relacao.ts#L28) `pedir-relacao.ts:28` | `AcademyHandler.cs` case 5 |
| `sendAcademyMaster` (pede um **aprendiz**, `academyRequest/AcademyRequestApprenticeFrame.as`) | 4 ACADEMY_FOR_APPRENTICE | [`academyForApprentice`](../../apps/game/src/handlers/academia/pedir-relacao.ts#L16) `pedir-relacao.ts:16` | `AcademyHandler.cs` case 4 |
| `sendAcademyMasterConfirm(true,...)` (`academyRequest/AcademyAnswerMasterFrame.as`) | 6 MASTER_CONFIRM | [`masterConfirm`](../../apps/game/src/handlers/academia/aceitar-relacao.ts#L27) `aceitar-relacao.ts:27`, chama [`addApprentice`](../../apps/game/src/handlers/academia/aceitar-relacao.ts#L13) `:13` | `AcademyMgr.AddApprentice` |
| `sendAcademyMasterConfirm(false,...)` | 8 MASTER_REFUSE | [`masterRefuse`](../../apps/game/src/handlers/academia/pedir-relacao.ts#L40) `pedir-relacao.ts:40` | `AcademyHandler.cs` case 8 |
| `sendAcademyApprenticeConfirm(true,...)` (`academyRequest/AcademyAnswerApprenticeFrame.as`) | 7 APPRENTICE_CONFIRM | [`apprenticeConfirm`](../../apps/game/src/handlers/academia/aceitar-relacao.ts#L43) `aceitar-relacao.ts:43`, chama [`addApprentice`](../../apps/game/src/handlers/academia/aceitar-relacao.ts#L13) `:13` | `AcademyMgr.AddApprentice` |
| `sendAcademyApprenticeConfirm(false,...)` | 9 APPRENTICE_REFUSE | [`apprenticeRefuse`](../../apps/game/src/handlers/academia/pedir-relacao.ts#L49) `pedir-relacao.ts:49` | `AcademyHandler.cs` case 9 |
| `sendAcademyFireMaster` (`myAcademy/myAcademyItem/MyAcademyMasterItem.as` — aprendiz expulsa/sai do mestre) | 12 FIRE_MASTER | [`fireMasterPacket`](../../apps/game/src/handlers/academia/expulsar.ts#L51) `expulsar.ts:51`, chama [`fireMaster`](../../apps/game/src/handlers/academia/expulsar.ts#L30) `:30` | `AcademyMgr.FireMaster` |
| `sendAcademyFireApprentice` (`myAcademy/myAcademyItem/MyAcademyApprenticeItem.as` — mestre expulsa aprendiz) | 13 FIRE_APPRENTICE | [`fireApprenticePacket`](../../apps/game/src/handlers/academia/expulsar.ts#L62) `expulsar.ts:62`, chama [`fireApprentice`](../../apps/game/src/handlers/academia/expulsar.ts#L14) `:14` | `AcademyMgr.FireApprentice` |
| (automático, ao subir de nível) | — | [`updateAwardApp`](../../apps/game/src/handlers/academia/premios-nivel.ts#L18) `premios-nivel.ts:18` | `AcademyMgr.UpdateAwardApp` |

C# original completo: `vendor/DDTank41/Game.Server/Packets/Client/AcademyHandler.cs`
(switch por byte, mesmos números acima) + `vendor/DDTank41/Game.Server/Managers/AcademyMgr.cs`
(`AddApprentice`, `FireMaster`, `FireApprentice`, `UpdateAwardApp`, `GetRequest`/`AddRequest`
em memória) + `SqlDataProvider/Data/PlayerInfo.cs:2511-2563` (helpers de
`masterOrApprentices`/`apprenticeshipState` que `parseRel`/`writeRel`/`addRel`/`removeRel`
replicam, [`relacao.ts:35-64`](../../apps/game/src/handlers/academia/relacao.ts#L35)).

**Tabelas**: tudo fica em colunas de `player."Sys_Users_Detail"` (schema Drizzle em
`packages/db/src/schema/player.ts:1179-1184`): `apprenticeshipState` (0 sem relação,
1 tem mestre, 2 tem 1-2 aprendizes, 3 tem 3 aprendizes — cheio), `masterID` (0 = sem
mestre), `masterOrApprentices` (string `"id|nick,id|nick"` — guarda o mestre OU até 3
aprendizes, dependendo de quem é o jogador), `graduatesCount` (quantos alunos já
formou como mestre), `honourOfMaster`, `freezesDate` (até quando está bloqueado depois
de expulsar/ser expulso). Não existe tabela separada de "relação"; é tudo nessas 5
colunas do próprio jogador. Os pedidos pendentes (`AcademyRequestInfo` no C#) **não**
vão pro banco — ficam em memória por 1h (`requestsByCtx`,
[`relacao.ts:63-74`](../../apps/game/src/handlers/academia/relacao.ts#L63)), igual ao C#
(`AcademyMgr.RemoveOldRequest`).

## 3. Fluxo passo a passo

### Pedido e aceite (exemplo: aprendiz pede um mestre)
1. Jogador de nível baixo abre a lista de mestres recomendados e clica em alguém →
   cliente manda `141` sub `5 ACADEMY_FOR_MASTER` com o ID do alvo e uma mensagem.
2. `pedir-relacao.ts:28` confere se já não tem um pedido igual pendente, se o jogador
   não está "congelado" (`frozen()`, [`relacao.ts:160`](../../apps/game/src/handlers/academia/relacao.ts#L160)),
   se o alvo está online, não está cheio (`apprenticeshipState < MASTER_FULL_STATE`) e
   tem nível pra ser mestre (`checkCanMaster`,
   [`relacao.ts:30`](../../apps/game/src/handlers/academia/relacao.ts#L30)). Se passar, guarda o pedido em memória
   e manda `141` sub `5` pro alvo (pop-up de pedido).
3. O mestre em potencial clica **Aceitar** → cliente manda `141` sub `6 MASTER_CONFIRM`.
4. `aceitar-relacao.ts:27` acha o pedido, confere congelamento e se o mestre ainda
   pode aceitar, chama [`addApprentice`](../../apps/game/src/handlers/academia/aceitar-relacao.ts#L13)
   que: liga os dois (`addRel` nos dois `info`), recalcula `apprenticeshipState`
   (`writeRel`), manda `141` sub `10 (appState)` pros dois clientes (estado
   atualizado), **grava direto no banco** (`saveAcademy`,
   [`relacao.ts:119`](../../apps/game/src/handlers/academia/relacao.ts#L119) — um `UPDATE` imediato, não espera
   o autosave) e manda um e-mail de boas-vindas pro mestre.

### Subida de nível / formatura
1. Toda vez que o nível (`Grade`) de um jogador muda, o código que processa XP chama
   [`updateAwardApp`](../../apps/game/src/handlers/academia/premios-nivel.ts#L18) (fora deste
   arquivo — é o hook de progressão de nível) passando o nível antigo.
2. Pra cada nível entre o antigo e o novo, `updateAwardApp` confere se aquele nível
   tem caixa configurada (`AcademyApprenticeAward`/`AcademyMasterAward`) e manda por
   **e-mail** (`mailTo`, [`relacao.ts:133`](../../apps/game/src/handlers/academia/relacao.ts#L133))
   pro aprendiz e pro mestre.
3. Se o aprendiz chegou em `ACADEMY_LEVEL_MIN` (nível 20,
   [`relacao.ts:24`](../../apps/game/src/handlers/academia/relacao.ts#L24)): manda caixa de formatura pros
   dois (`AcademyAppAwardComplete`/`AcademyMasAwardComplete`, varia por sexo), chama
   [`fireMaster(ctx, p, true)`](../../apps/game/src/handlers/academia/expulsar.ts#L30)
   (desfaz a relação **sem** mensagem de "abandono", incrementa `graduatesCount` do
   mestre), e manda uma mensagem de broadcast pro servidor inteiro anunciando a
   formatura.

### Expulsar
1. Mestre clica **Expulsar aluno** → `141` sub `13 FIRE_APPRENTICE` com o ID do
   aprendiz.
2. `expulsar.ts:62` (`fireApprenticePacket`): confere `Gold >= 20000`, chama
   [`fireApprentice`](../../apps/game/src/handlers/academia/expulsar.ts#L14) (desfaz a
   relação dos dois lados, manda aviso "abandonado" pro aprendiz se ele estiver
   online). Em caso de sucesso: cobra os 20000 ouro e aplica `freezesDate` = agora +
   `AcademyMasterFreezeHours` (padrão 48h) — enquanto isso durar, `frozen()` bloqueia
   novos pedidos desse jogador.
3. Aprendiz expulsando o mestre é o mesmo fluxo com sub `12 FIRE_MASTER`
   (`expulsar.ts:51`, `fireMasterPacket`), custo 10000 ouro e congelamento
   `AcademyApprenticeFreezeHours` (padrão 24h).

## 4. Quero mudar…
- **Faixa de nível pra ser aprendiz/mestre**: constantes no topo de `relacao.ts` —
  `TARGET_PLAYER_MIN_LEVEL = 6`, `ACADEMY_LEVEL_MAX = 16` (`checkCanApp`), `ACADEMY_LEVEL_MIN = 20`
  (também é o nível de formatura), `LEVEL_GAP = 5` (diferença mínima entre aprendiz e
  mestre) — [`relacao.ts:22-25`](../../apps/game/src/handlers/academia/relacao.ts#L22).
- **Quantos aprendizes um mestre pode ter**: `MASTER_FULL_STATE = 3` em `writeRel`
  ([`relacao.ts:27,47`](../../apps/game/src/handlers/academia/relacao.ts#L47)) — `apprenticeshipState` vira 3
  (cheio) quando o `Map` de relações atinge esse tamanho.
- **Custo e tempo de congelamento ao expulsar**: ouro é fixo no código (`20000` pro
  mestre em [`expulsar.ts:63`](../../apps/game/src/handlers/academia/expulsar.ts#L63), `10000` pro aprendiz em
  [`expulsar.ts:52`](../../apps/game/src/handlers/academia/expulsar.ts#L52)); o tempo de congelamento é config do
  servidor: `AcademyMasterFreezeHours` (padrão 48) e `AcademyApprenticeFreezeHours`
  (padrão 24), lidas por `ctx.templates.cfgInt(...)` nos mesmos dois arquivos — editar
  na tabela `Server_Config` (sem recurso admin dedicado ainda; via SQL/seed).
- **Caixas de recompensa por nível**: config do servidor em formato
  `"nível|TemplateID,nível|TemplateID"` — `AcademyApprenticeAward` (padrão
  `"10|112085,15|112086,18|112087,20|112095"`) e `AcademyMasterAward` (padrão
  `"10|112088,15|112089,18|112090,20|112094"`), lidas em
  [`levelAwards`](../../apps/game/src/handlers/academia/premios-nivel.ts#L14)/
  [`updateAwardApp`](../../apps/game/src/handlers/academia/premios-nivel.ts#L18) (`:23-24`).
  Caixa de formatura (prêmio final, varia por sexo, formato
  `"masculino|masculino,feminino|feminino"` com múltiplos itens separados por `|`):
  `AcademyAppAwardComplete` (padrão `"1401|5293,1301|5192"`) e `AcademyMasAwardComplete`
  (padrão `"1414|5409,1314|5306"`) — `premios-nivel.ts:31-35`.
- **Texto das mensagens** (pedido aceito/recusado, abandono, formatura): chaves de
  i18n `Game.Server.AppSystem.*` lidas via `ctx.lang.t(...)` espalhadas pelos arquivos
  de `academia/` — editar em `data/i18n/pt-BR/...` (ver `docs/API.md`/
  `docs/GAME-SERVER.md` pra onde mora o catálogo de textos).

## 5. Testes e status
- `apps/game/test/academy.test.ts` (`describe("academy relation string
  (PlayerInfo.ConvertMasterOrApprentices)")` + `describe("141 ACADEMY")`): cobre
  `parseRel`/`writeRel`, o fluxo completo aprendiz pede → mestre aceita → aprendiz
  sobe até o nível 20 → formatura automática (confere `masterID` zerado e
  `graduatesCount` do mestre), e o fluxo de expulsão (custo de ouro + congelamento).
- `research/qa/packet-coverage.tsv` (linhas 236-243) já marca todas as 8 ações
  `sendAcademy*` como `implemented` apontando pra `academia/` — é o
  `docs/MAPA-DO-JOGO.md` (gerado por outra ferramenta, que só olha o cliente) que erra
  ao não achar o nome do sub-pacote.
- **Status real, lendo o código**: **OK** — pedir mestre/pedir aprendiz, aceitar/
  recusar dos dois lados, expulsar dos dois lados (com custo e congelamento), caixas
  de nível, formatura automática no nível 20 com prêmio final e broadcast, tudo
  implementado e com persistência imediata (`saveAcademy`, não espera autosave).
  `ACADEMY_REGISTER`/`ACADEMY_REMOVE` (subs 1/3) são `stub` **de propósito**: o
  comentário em [`academia/index.ts:15`](../../apps/game/src/handlers/academia/index.ts#L15)
  explica que o C# original também os ignora — a lista de "quem quer ser mestre/
  aprendiz" é montada no servidor a partir de todo jogador elegível (por nível), não
  de um registro explícito; não é uma lacuna de porte, é o mesmo comportamento do C#.
- **Gap real encontrado**: nenhum handler envia a **lista de recomendados**
  (`AcademyMasterMainFrame`/`AcademyApprenticeMainFrame`, que no C# é montada a partir
  de `WorldMgr` + filtro de nível) — não há sub-ação de "listar candidatos" no roteador
  atual. Se for preciso portar, seguir o padrão dos outros subs em `academyRouter()`
  ([`academia/index.ts:34`](../../apps/game/src/handlers/academia/index.ts#L34)) lendo
  `AcademyHandler.cs` (os subs que faltam no switch do arquivo TS comparado ao `.cs`)
  para achar o sub-byte certo.
