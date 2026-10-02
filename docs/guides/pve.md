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
