# Guia PvE — masmorras, fases, NPCs e scripts

Este guia explica como o PvE (Phó bản / masmorras, missões de tutorial, cadeia de missões) funciona no DDTank Reborn e
como **adicionar uma masmorra, uma fase, um NPC** e **escrever um script**. Referência técnica completa:
[`docs/spec/combat/01-pve.md`](../spec/combat/01-pve.md).

## 1. Visão geral

| Peça | Onde fica | O que faz |
|---|---|---|
| Motor PvE | `packages/fight/src/pve/game.ts` (`PveGame`) | Porta do `PVEGame.cs` + `CheckPVEGameStateAction.cs`: carrega a fase, ordem de turnos com NPCs, fim de fase, próxima fase, recompensas e cartas. |
| Corpos | `packages/fight/src/pve/livings.ts` | `SimpleNpc` (monstro comum, age na "fase dos NPCs"), `SimpleBoss` (chefe, tem turno próprio), objetos físicos (`Layer`, `Ball`...). |
| API de script | `packages/fight/src/pve/script.ts` + `compat.ts` | Classes base `APVEGameControl` (masmorra), `AMissionControl` (fase), `ABrain` (IA do NPC) com os **mesmos nomes do C#** (`Game.CreateNpc`, `Body.MoveTo`, `Game.Random.Next`...). |
| Scripts gerados | `packages/fight/src/pve/scripts/generated/` | 611 classes do doador (`vendor/DDTank4.1`) convertidas automaticamente de C# para TypeScript. **Não edite** — são regeneradas. |
| Scripts manuais | `packages/fight/src/pve/scripts/manual/` | Correções à mão e scripts novos. Registrados **depois** dos gerados: o mesmo nome substitui a versão gerada. |
| Servidor | `apps/game/src/fight/ddt.ts` (`startPve`) e `src/rooms/room-mgr.ts` (`launchPve`) | Sala PvE → `PveGame`; pacotes 91 (GAME_CMD) de/para o cliente; GP, itens e missões (condição 21). |
| Dados | tabelas `game."Pve_Info"`, `game."Mission_Info"`, `game."NPC_Info"`, `game."Drop_Condiction"`/`"Drop_Item"` | Editáveis no painel admin: **Conteúdo → Masmorras PvE / Fases PvE / NPCs / Drops**. |

Fluxo de uma masmorra: sala (tipo 4 masmorra, 10 tutorial, 5 laboratório, 3 chefe…) → o dono escolhe a masmorra
(`MapId = Pve_Info.ID`) e a dificuldade → **Bắt đầu** → o servidor escolhe o script da masmorra pela dificuldade
(`SimpleGameScript` = Fácil, `NormalGameScript`, `HardGameScript`, `TerrorGameScript`) → o script chama
`Game.SetupMissions("2001,2002")` → para cada fase cria o script de `Mission_Info.Script`, que carrega recursos, escolhe o
mapa (`Game.SetMap`) e cria NPCs (`Game.CreateNpc` / `Game.CreateBoss`, linha de `NPC_Info`, cujo `Script` é a IA).

**Script inexistente nunca trava a fase**: masmorra sem script → fases deduzidas (`ID*100+1..9`); fase sem script →
termina quando não houver NPC vivo; NPC sem script → IA genérica (vai até o jogador mais próximo e bate; se tiver
`CurrentBallId` atira com o solucionador de mira). Erros de script são registrados no log (`pve script ... error`) e o
jogo continua, como no C# original (cada chamada tem try/catch).

## 1.1 Masmorra termina antes da hora / não chega na fase do chefe (cadeia de missões quebrada)

Tarefa `pve-cadeia` (relato do dono, 2026-10-26): o `*GameScript` de uma masmorra chama
`Game.SetupMissions("id1,id2,...")` (ex. `GuluKingdomSimpleGame` → `"1072,1073"`, fase 1073 = o chefe
Baroff). Se **qualquer** `id` dessa lista não tiver linha em `game."Mission_Info"`, `SetupMissions`
(`packages/fight/src/pve/game.ts`) não registra aquela sessão e `hasNextSession()` passa a retornar `false`
assim que a sessão anterior é vencida — a masmorra termina ali, mesmo que o script da fase (`AMissionControl`)
e os NPCs existam e funcionem perfeitamente. Foi exatamente o caso de `Pve_Info` ID 1 ("Lâu đài Gà"/Gulu
Kingdom, "Castelo do Bugou" pro dono): fase 1073 (o Baron/Baroff) tinha script, NPCs e mapa prontos, só
faltava a linha `Mission_Info` — ausente até no dump bruto do banco doador
(`vendor/_dbexport/Project_Game34/data/Mission_Info.json`), não um bug de import. Corrigido com uma
migração aditiva (`packages/db/drizzle/0027_pve_cadeia_gulu_baron.sql`, idempotente, mesmo padrão de
`0011_labirinto_pve_seed.sql`) + o seed gz (`packages/db/seed/game/Mission_Info.json.gz`).

**Para diagnosticar outro caso assim:** `packages/fight/test/pve-sweep.test.ts` constrói cada combinação
`(Pve_Info, dificuldade)` que tem `*GameScript` preenchido e reporta (via `console.log`, não falha o teste —
ver cabeçalho do arquivo) toda cadeia onde `Misssions.size < TotalMissionCount`. Na varredura de
2026-10-26 (102 combinações), as únicas outras quebradas são as outras 3 dificuldades da MESMA masmorra
(Pve 1): Normal falta a sessão 3 (`Mission_Info` id 1176, script `CNM1176` já existe), Difícil falta 3-4
(1276/1277, scripts `CHM1276`/`CHM1277`), Terror falta 4-5 (1376/1378, scripts `CTM1376`/`CTM1378`) — não
corrigidas nesta tarefa porque, diferente da 1073 (texto idêntico às irmãs 1172/1272/1372, "Derrote
Baroff."), essas usam um prefixo de script diferente (`CNM`/`CHM`/`CTM`, não `GT`/`GK`/`GAH` das fases
"Gà Thường/Khó/Anh Hùng" da mesma masmorra) — sinal de que são missões **reaproveitadas de outra
masmorra/versão**, sem uma linha-irmã segura o bastante pra reconstruir `Name`/`Success`/`Failure` por
analogia sem inventar texto. Pendente pro dono revisar e preencher via admin (**Fases PvE**) quando quiser;
rode o sweep de novo depois — ele deve sair da lista de quebrados.

Um script de FASE ausente (não a linha `Mission_Info`) é um problema diferente e já tem fallback: "fase sem
script → termina quando não houver NPC vivo" (seção 1 acima) — não trava, só não roda a lógica customizada.

**Atualização (tarefa `pve-qa`, 2026-10-27):** as 3 cadeias que ficaram pendentes acima (Normal falta
1176, Difícil falta 1276/1277, Terror falta 1376/1378 — a "sala do rei" de Bugo Castle: dois "Gà" em
sequência e depois Matthias/Bóng ma Matthias, mapa 1076/1084, rastreado via `CreateBoss` nos scripts
gerados × `game."NPC_Info"`) foram corrigidas por `packages/db/drizzle/0030_pve_gulu_king_chamber.sql`
(+ `0031_pve_gulu_king_chamber_cards.sql` para as cartas, mesmo padrão de `0028`). Textos de `Success`
reaproveitados literalmente de uma linha-irmã que já nomeia o mesmo chefe (não inventados). Depois do fix o
sweep (`pve-sweep.test.ts`) reporta **0 cadeias quebradas** em todas as 102 combinações (dungeon,
dificuldade) do catálogo — o problema era mesmo só esta masmorra. Também corrigido em código (não só dado):
`PveGame.prepareNewSession` (`packages/fight/src/pve/game.ts`), quando a sessão seguinte não tem
`Mission_Info`, agora recua pra última sessão concluída e reentra em `GameOver` (emite
`GAME_ALL_MISSION_OVER` normalmente) em vez de saltar direto pra `ALLSessionStopped` sem nunca mandar esse
pacote — era esse salto silencioso que prendia o cliente numa tela preta em vez de mostrar a tela de
fim/cartas. `pve-cards-sweep.test.ts` ainda reporta 31 missões sem fonte de carta (lista cresceu de 30 pra
31 só porque a 1377 passou a existir como linha — ela nunca é alcançada por nenhum `SetupMissions`, então
não tem `Drop_Condiction` de propósito); as outras continuam pendentes pro dono revisar como antes.

## 1.2 Carta de recompensa vira sem item (cadeia certa, mas a carta sai vazia)

Tarefa `pve-cartas` (relato do dono, 2026-10-27): mesma masmorra da seção 1.1 (Bugo Castle / Gulu Kingdom,
`Pve_Info` ID 1, Fácil) — agora que a fase 1073 (o Baron) é alcançada e as cartas animam certo (fix da
`pve-cadeia`), a carta virada no fim **não tem item**. Fluxo de carta, rastreado 1:1: `PVEGame.TakeCard`
(`Game.Logic/PVEGame.cs:2180-2251`) resolve o item via `DropInventory.CopyDrop(missionId, 1)`
(`Game.Logic/DropInventory.cs:113-126`) → `DropMgr.FindCondiction(eDropType.Copy, missionId, "1")`
(`Bussiness/Managers/DropMgr.cs:22-34`, `eDropType.Copy = 5`) — uma linha de `game."Drop_Condiction"` com
`CondictionType = 5` cujo `Para1` (lista com vírgulas em volta de cada id, ex. `",1072,1073,"`) contém o id
da missão. `packages/fight/src/pve/game.ts` (`takeCard()`) e `apps/game/src/db/templates.ts`
(`pveDrop()`/`findDropCondition()`) portam isso 1:1 — não é bug de código.

É lacuna de dado, mesma classe da seção 1.1: `game."Drop_Condiction"` `DropID` 50006 (pool de cartas do Gulu
Kingdom Fácil) tinha `Para1 = ",1071,1072,"` — lista a missão 1071 (nem faz parte da cadeia
`SetupMissions("1072,1073")` desta masmorra) e 1072, mas nunca 1073 (o Baron) — confirmado ausente até no
dump bruto do banco doador (`vendor/_dbexport/Project_Game34/data/Drop_Condiction.json`), não um bug de
import. Cada dificuldade-irmã lista TODAS as suas missões numa única linha: Normal (`DropID` 50007) =
`",1171,1172,1173,"`, Difícil (50008) = `",1271,1272,1273,1274,"`, Terror (50009) =
`",1371,1372,1373,1374,1375,"` — só a de Fácil (50006) estava faltando a última. Corrigido estendendo o
`Para1` de 50006 pra `",1071,1072,1073,"` (`packages/db/drizzle/0028_pve_cartas_gulu_baron_card.sql`,
idempotente, mesmo padrão de `0027_pve_cadeia_gulu_baron.sql`) + o seed gz
(`packages/db/seed/game/Drop_Condiction.json.gz`); o pool de itens (`Drop_Item` do mesmo `DropID` 50006, 33
entradas) não precisou mudar, só a lista de missões da condição.

## 1.3 Varredura jogada de verdade (bot ganha cada fase) — `pve-playthrough-sweep.test.ts`

Tarefa `pve-qa` item 2 (relato do dono, 2026-10-27: "muitas outras masmorras têm fases quebradas — ache
todas"). `pve-sweep.test.ts`/`pve-cards-sweep.test.ts` (acima) só CONSTROEM a cadeia e os dados de carta,
nunca jogam de verdade. `packages/fight/test/pve-playthrough-sweep.test.ts` é o runner "fim a fim": para
cada `Pve_Info` Type 4/6/7 (masmorra/laboratório/Pesadelo — os tipos que o dono pede) × cada dificuldade com
`*GameScript`, cria um `PveGame` real com `BotRunner` reais (dificuldade 100, sem cheat de instant-kill — só
status fortes o bastante pra resolver rápido, mesmo padrão que `pve.test.ts` já usa) e joga até o fim,
checando `GAME_CREATE`, uma `GAME_MISSION_OVER` por fase, `PVE_STOPPED` com `isWin`, `GAME_ALL_MISSION_OVER`
(tela de vitória) e `PVE_AWARD` (carta com item de verdade, usando `Drop_Condiction`/`Drop_Item` reais de
`pve-data.ts`, não o stub). Mesma filosofia das outras duas varreduras: reporta tudo via `console.log`, só
falha de verdade num regressão de bug já corrigido NESTA tarefa.

Essa varredura, jogando a cadeia de verdade pela primeira vez, achou e corrigiu 3 bugs reais (nenhum deles
era sobre a linha `Mission_Info` da seção 1.1 — esses eram bugs de CÓDIGO, em scripts/runtime que nunca
tinham sido realmente jogados antes):

1. **`super.Game`/`super.Body` sempre `undefined`** (`packages/fight/src/pve/script.ts`,
   `APVEGameControl`/`AMissionControl`/`ABrain`): ~56 scripts gerados usam `base.Game`/`base.Body` (acesso a
   campo da classe base em C#) → `super.Game`/`super.Body` no TS transpilado. Um campo de classe TS comum é
   propriedade PRÓPRIA da instância, nunca do protótipo — `super.X` (SuperPropertyReference) busca no
   protótipo, não em `this`, então sempre voltava `undefined` não importa o que `missionAI.Game = this`
   (`game.ts`) tivesse setado, quebrando toda missão/IA que chamasse `super.Game.*`/`super.Body.*` logo no
   primeiro uso (ex. `GT1172`/`GT1173`/`GK1272`/`GK1273`/`GAH1372`/`GAH1373`/`GAH1375`.`OnPrepareNewSession`).
   Corrigido tornando `Game`/`Body` acessores (get/set) nas 3 classes base — um acessor mora no protótipo,
   então `super.Game` passa a chamar o getter certo, vinculado a `this`. Correção de framework, nenhum
   arquivo gerado precisou mudar.
2. **`Game.GameOverResources.Add` não é função** (`packages/fight/src/pve/game.ts`): alguns scripts (ex.
   `GAH1373`, a missão "colete as chaves mágicas" do Terror) chamam `.Add(...)` direto no getter
   `Game.GameOverResources` (`List<string>.Add` em C#) em vez de passar um array pra
   `LoadNpcGameOverResources`. O getter devolvia um `string[]` puro (sem `.Add`). Trocado pra `CsList<string>`
   (`packages/fight/src/pve/cs.ts`, já usada noutros lugares) — como `CsList extends Array`, todo uso
   existente (`.push`, `.length = 0`, `[...spread]`) continua igual, só ganhou `.Add`.
3. **4 masmorras Type 6 (`CBS601`/`DTS701`/`GZS801`/`XDS901` — Vịnh Cariga, Lâu đài Daucula, Rừng rậm
   Gamazon, Hoang mạc Xatara, missões de abertura, `Pve_Info` 11/10/8/9) travavam no `OnPrepareNewSession`**
   com `<campo> is not defined`: a chamada de preload da bomba (`Game.AddLoadingFile(1, $"bombs/{m_ball}
   .swf", ...)` no C#) saiu do transpiler como identificador solto dentro do template literal
   (`` `bombs/${m_ball}.swf` ``) em vez de `this.m_ball` — mesmo campo usado certinho (`this.m_ball`) mais
   adiante no MESMO arquivo. Corrigido em `packages/fight/src/pve/scripts/manual/
   bomb-loading-file-interpolation.ts` (reescreve o método inteiro usando `this.<campo>`).
4. **`GT1173`/`GK1273` (o chefe "Gà Thường S3"/"Gà Khó S3", a luta dos dois reis "Gà" no mapa 1076) com o
   construtor faltando**: `OnStartGame` chama `Game.CreateBoss(this.int_1, ...)` mas `int_1`/`int_4`/`int_5`/
   `int_6` nunca eram atribuídos (ficavam `0`) → "NPC_Info 0 not found" e tudo que vem depois
   (`CanGameOver`/`OnGameOver`) quebra lendo `.IsLiving` de `null`. A versão comprometida de
   `generated/Messions/{GT1173,GK1273}.ts` só tem o inicializador de campo estático (`static GT1173()
   { string_0 = ...; }`), sem o construtor de instância — confirmado comparando com uma decompilação mais
   completa da mesma classe fora de `vendor/DDTank4.1` (que esta tarefa trata como somente-leitura), que TEM
   `public GT1173() { int_1 = 1105; int_4 = 1105; int_5 = 1106; int_6 = 1110; }` /
   `public GK1273() { int_1 = 1205; int_4 = 1205; int_5 = 1206; int_6 = 1210; }` — os MESMOS ids de NPC da
   luta-irmã `CNM1176`/`CHM1276` (`game."NPC_Info"` 1105/1106/1110 e 1205/1206/1210, ambos "Gà"/"Gà lâu la",
   batendo com a dedução da migração `0030_pve_gulu_king_chamber.sql`). Corrigido com um hand-fix em
   `packages/fight/src/pve/scripts/manual/gulu-kingdom-king-missing-ctor.ts` (subclasse que seta os 4 campos
   no construtor) — mesmo arquivo também corrige `HardKingFirst.AllAttack` (`Bussiness.LanguageMgr.
   GetTranslation(...)`, prefixo de namespace do C# que o transpiler deixou sem resolver; o mesmo arquivo já
   usa `LanguageMgr` puro em outro método, então é só trocar pra isso).

**Ainda em aberto, reportado pela varredura mas NÃO corrigido nesta rodada** (não são bugs de dado tipo
seção 1.1, nem regressões de algo que esta tarefa corrigiu — investigar depois):
- `CHM1277.OnPrepareNewGame` (o chefe Matthias do Difícil) lê `m_kingMoive.PlayMovie(...)` sem checar null —
  **confirmado idêntico ao original** (`vendor/DDTank4.1/Source Server/Game.Server.Scripts/AI/Messions/
  CHM1277.cs:131`, mesma falta de guarda lá). Não é bug de script: é uma questão de ORDEM de chamadas do
  motor (o bot-harness do sweep aparentemente consegue chamar `OnPrepareNewGame` sem `OnStartGame` ter
  rodado antes pra essa missão específica, que tem uma cutscene condicional a `WantTryAgain`/`IsPassDrama`)
  — precisa investigar a máquina de estados do PveGame pra essa classe de missão "cutscene + retry", não o
  script em si.
- `NTM1083.ts` tem o mesmo tipo de prefixo não resolvido (`Bussiness.Managers.ItemMgr.FindItemTemplate`),
  mesma causa do item 3 acima, mas é outra missão (não faz parte da cadeia do Pve 1) — não corrigido ainda.
- Terror do Gulu Kingdom (Pve 1, hardLevel 3) com os bots "fortes" do sweep só completa 2 das 5 fases
  (`isWin=false`) — pode ser só equilíbrio bot-vs-chefe no Terror (a dificuldade mais alta, NPCs mais fortes
  propositalmente) e não um bug; não investigado a fundo.
- `Pve_Info` 12 (Vòng xoáy thời gian) e 13 (Đấu Trường Dũng Sĩ), Fácil: nunca chegam em `PVE_STOPPED` no
  tempo do sweep (0/4 e 2/4 fases) — são masmorras de nível 30 (`LevelLimits`), fase final provavelmente
  genuinamente mais dura pros bots "fortes" padrão do sweep; não investigado a fundo (pode ser só
  `maxMs`/stats dos bots insuficientes pra esse nível, não necessariamente bug).
- Depois do fix da interpolação do item 3 acima, `GZS801`/`XDS901` (Rừng rậm Gamazon, Hoang mạc Xatara)
  revelam MAIS dois problemas na sequência (a correção só desbloqueou a fase, não terminou de consertá-la):
  `this.apprenticePlayer`/`this.masterPlayer` ainda `null` quando `OnPrepareNewGame` chama `.BoltMove(...)`
  neles (missão de "mestre e aprendiz" com papéis especiais — a atribuição de quem é quem provavelmente
  depende de alguma condição de sala/squad que o sweep não reproduz) e `Game.FindSingleSimpleBossID` —
  método que `PveGame` nunca implementou (gap de framework de verdade, não dado) — não existe. `DTS701`
  (Lâu đài Daucula) só bateu no primeiro (`BoltMove`). Nenhum dos três corrigido nesta rodada — próxima
  tarefa de PvE deveria começar por aqui (lista completa fica no `console.log` do sweep).
- A lista completa de outras masmorras/dificuldades que a varredura reporta (fora do Pve 1) está no
  `console.log` do teste — rode `pve-playthrough-sweep.test.ts` pra ver o estado atual.

**Para diagnosticar outro caso assim:** `packages/fight/test/pve-cards-sweep.test.ts` varre toda missão com
`Mission_Info.TakeCard > 0` usando os dados reais de `Drop_Condiction`/`Drop_Item` (não o stub constante
`drops: { copyDrop: () => [{ templateId: 11020, count: 1 }] }` que outros testes de PvE usam pra outras
asserções — um stub nunca reproduz uma lacuna de linha de drop) e reporta (via `console.log`, não falha o
teste, exceto o guard de regressão da 1073) toda missão cujo pool de cartas resolve vazio. Na varredura de
2026-10-27 (165 missões com `TakeCard > 0`), além da 1073 (corrigida), ficaram **30 sem fonte de carta**:
`101–105`/`111–115`/`121–125` (telas de calibração "Đo màn hình/Góc/Siêu cao/Cao thấp" — possivelmente nunca
tiveram carta mesmo no original, não confirmado), `600`/`700`/`800`/`900` (primeira fase de Vịnh Cariga /
Lâu đài Dracula / Rừng rậm Gamazon / Hoang mạc Xatara), `1085–1089` (cadeia do tutorial/missão principal —
*Tranh đoạt báu vật*, testada em `pve.test.ts` com o stub, por isso ninguém notou a carta vazia aí também),
`3001`/`4001`/`4002`/`4003`/`12016`/`15002`. Pendente pro dono revisar e decidir se cada uma merece uma linha
de `Drop_Condiction` nova (ou entrar na lista de uma dificuldade-irmã, como no caso da 1073) via admin
(**Conteúdo → Drops**) quando quiser; rode o sweep de novo depois — a missão corrigida deve sair da lista.

## 2. Adicionar uma masmorra (Pve_Info)

1. Admin → **Masmorras PvE** → *Novo*. Campos principais:
   - `ID`: número único (é o que o cliente mostra/manda como `MapId` da sala).
   - `Name`, `Description`, `Pic` (nome da imagem da masmorra em `resource/image/map/<Pic>/`), `Ordering`.
   - `Type`: tipo de sala (4 = masmorra normal, 5 = laboratório, 10 = tutorial, 3/14 = chefe…).
   - `LevelLimits`: nível mínimo exibido.
   - `SimpleGameScript` … `TerrorGameScript`: nome completo da classe de script por dificuldade, ex.
     `GameServerScript.AI.Game.AntCaveSimpleGame`.
   - `SimpleTemplateIds` …: itens mostrados como recompensa possível (só exibição).
2. O cliente Flash lê a lista de masmorras do XML gerado pela API (`LoadPVEItems.ashx` / `LoadPVEItems.xml`); depois de salvar, recarregue o
   cliente.
3. Recarregue os caches do servidor de jogo: admin → *Servidor* → **Recarregar templates** (ou reinicie o `apps/game`).

## 3. Adicionar uma fase (Mission_Info)

Admin → **Fases PvE** → *Novo*:

| Campo | Uso |
|---|---|
| `Id` | número único — é o que `SetupMissions("...")` referencia e o `Para1` da condição de missão tipo 21. |
| `Name`, `Title`, `Description`, `Success`, `Failure` | Textos do painel de informações da fase (pacote 113). |
| `TotalTurn` / `TotalCount` | Limite de turnos / quantidade de inimigos mostrados no painel. |
| `Delay` / `IncrementDelay` | Atraso inicial da "fase dos NPCs" e incremento após cada fase de NPCs (ritmo da batalha). |
| `Script` | Classe da fase, ex. `GameServerScript.AI.Messions.NTM1085`. |
| `Param1`, `Param2` | Parâmetros livres lidos pelo script (`Game.Param1`). |
| `TakeCard`, `TryAgain`, `TryAgainCost` | Cartas ao fim; tentar de novo (desativado como no servidor doador). |

Recompensas da fase: `Drop_Condiction` com `CondictionType = 5` (*Copy*), `Para1 = ,<Id da fase>,` e
`Para2 = ,1,` → itens em `Drop_Item` com o mesmo `DropID`. Usado nas cartas sorteadas ao fim da fase.

## 4. Adicionar um NPC (NPC_Info)

Admin → **NPCs** → *Novo*: `ID`, `Name`, `Level`, `Camp` (2 = inimigo), `Blood`, `BaseDamage`, `BaseGuard`, `Attack`,
`Defence`, `Agility`, `Lucky`, `Experience` (GP dado ao morrer), `X/Y/Width/Height` (retângulo do corpo, relativo ao pé),
`FireX/FireY` (ponto de tiro), `MoveMin/MoveMax`, `CurrentBallId` (bala usada em `ShootPoint`), `ModelID` +
`ResourcesPath` (animação Flash, ex. `game.living.Living002` em `image/game/living/Living002.swf`), `Script` (IA), `DropId`
(drop ao morrer, `Drop_Condiction` tipo 3).

Para aparecer na fase, o script da fase precisa carregar o recurso e criar o NPC:

```ts
this.Game.LoadResources(__arr([21001]));          // baixa o .swf do NPC na tela de carregamento
this.Game.CreateNpc(21001, 775, 553, 1, 1);       // npcId, x, y, tipo, direção
```

## 5. Escrever um script

Scripts são classes TypeScript com a API do C# (nomes em PascalCase). Crie o arquivo em
`packages/fight/src/pve/scripts/manual/` e registre-o em `manual/index.ts`.

### 5.1 Fase (AMissionControl)

```ts
import { AMissionControl, registerScript, __arr } from "../runtime.js";

export class MinhaFase extends AMissionControl {
  boss = null;
  OnPrepareNewSession() {
    this.Game.LoadResources(__arr([21001, 21002]));      // NPCs desta fase
    this.Game.LoadNpcGameOverResources(__arr([21002]));  // imagem das cartas no fim
    this.Game.SetMap(2013);                              // mapa (precisa estar em packages/fight/data/maps)
  }
  OnStartGame() {
    this.Game.CreateNpc(21001, 700, 500, 1, -1);
  }
  OnNewTurnStarted() {
    if (this.Game.TurnIndex === 3 && !this.boss) this.boss = this.Game.CreateBoss(21002, 850, 360, -1, 1, "");
  }
  CanGameOver() {
    return this.Game.GetLivedLivings().Count === 0 && this.boss != null && !this.boss.IsLiving;
  }
  OnGameOver() {
    this.Game.IsWin = this.boss != null && !this.boss.IsLiving;
  }
  UpdateUIData() {
    return this.Game.TotalKillCount;                     // número no painel da fase
  }
}
registerScript("GameServerScript.AI.Messions.MinhaFase", MinhaFase);
```

### 5.2 IA de NPC/chefe (ABrain)

```ts
import { ABrain, registerScript } from "../runtime.js";

export class MeuChefe extends ABrain {
  OnStartAttacking() {
    const alvo = this.Game.FindNearestPlayer(this.Body.X, this.Body.Y);
    if (!alvo) return;
    this.Body.ChangeDirection(alvo, 0);
    if (!this.Body.Beat(alvo, "beatA", 0, 0, 500)) {     // corpo-a-corpo se estiver perto
      this.Body.ShootPoint(alvo.X, alvo.Y, this.Body.NpcInfo.CurrentBallId, 1000, 10000, 1, 1.5, 1500);
      this.Body.PlayMovie("beat", 1000, 0);
    }
  }
}
registerScript("GameServerScript.AI.NPC.MeuChefe", MeuChefe);
```

### 5.3 Masmorra (APVEGameControl)

```ts
export class MinhaMasmorra extends APVEGameControl {
  OnCreated() { this.Game.SetupMissions("1085,1086"); this.Game.TotalMissionCount = 2; }
  OnPrepated() { this.Game.SessionId = 0; }
}
```

### 5.4 Regras importantes

- **Tempo**: tudo é em milissegundos e assíncrono pela fila de ações (`Say(msg, tipo, atraso)`, `MoveTo(x, y, "walk",
  atraso, callback)`, `CallFuction(fn, atraso)`). Não use `setTimeout`/`Date.now()`: o jogo é determinístico (mesma
  semente = mesmos eventos).
- **Aleatório**: `this.Game.Random.Next(min, max)` (mesmo `System.Random` do .NET).
- Ganchos mais usados: fase → `OnPrepareNewSession`, `OnStartGame`, `OnNewTurnStarted`, `OnBeginNewTurn`,
  `CanGameOver`, `OnGameOver`, `UpdateUIData`; NPC → `OnCreated`, `OnBeginNewTurn`, `OnStartAttacking`,
  `OnStopAttacking`, `OnAfterTakeDamage`, `OnDie`.
- Textos: `LanguageMgr.GetTranslation("chave")` usa `apps/game/data/Language-vn.txt`.
- Um script novo substitui um gerado se usar o mesmo nome completo.

## 6. Scripts do doador (conversão C# → TS)

```
pnpm --filter @ddt/fight transpile-pve     # regenera src/pve/scripts/generated (+ report.json)
pnpm --filter @ddt/fight pve-smoke         # roda cada fase com 2 bots e grava generated/smoke.json
pnpm --filter @ddt/fight test              # testes do motor + scripts
```

O conversor (`packages/fight/scripts/transpile-pve.ts`) entende o subconjunto de C# dos scripts (classes, campos,
métodos, `foreach`, casts, `List<T>`, arrays, `new LivingCallBack(...)`, parâmetros `ref`). Para corrigir um script gerado:
copie o arquivo de `generated/` para `manual/`, ajuste, e importe-o em `manual/index.ts`.

## 7. Testar no cliente

1. `pnpm dev:all`, entrar com `test/test`.
2. Tutorial/missão principal: janela **Nhiệm vụ (Q)** → missão *Tranh đoạt báu vật* → **Mật đạo thần bí** (sala de
   tutorial, Pve 112, fase 1085). Vencer completa a missão (condição 21) e libera a próxima.
3. Masmorra: prédio **Ải viễn chinh** → **Bắt đầu** (criar) → *Phó bản* → escolher a masmorra e a dificuldade → outro
   jogador entra pela lista → **Chuẩn bị** → o dono clica **Bắt đầu**.
