# Fontes das 65 missões PvE "sem script" — 2026-10-11

Contexto: `research/qa/pendencias-sem-fonte.md` §1 e `packages/fight/test/pve-mission-coverage.test.ts`
(`KNOWN_SOURCELESS`) travavam 65 classes de `Mission_Info.Script` que não existiam em `vendor/DDTank41`,
`vendor/DDTank4.1` (doador) nem `vendor/DDT-6600`. Resultado desta rodada: **64 achadas** em forks públicos
do mesmo servidor (GitHub), **1 genuinamente sem fonte** (`CoupleBoss15002`) e desenhada à mão.

## Onde foram achadas

| Repo | Owner | License | Classes usadas (daqui) |
|---|---|---|---|
| `ddt-34-csharp` | yutikeyux | **MIT** (`LICENSE` no repo, Copyright 2017 Ilya Meyta) | 61 das 64 (todas exceto Aiga4002/4003/DCSM4001) |
| `Gunny-3.0` | dk-khoado (mirror: UserHans02) | **sem LICENSE file** — mesma "linhagem sem licença explícita" que os próprios `vendor/DDTank41`/`vendor/DDTank4.1` já usados como doador deste projeto (dump de servidor privado DDTank/Gunny); tratado com o mesmo critério já aceito no AGENTS.md | Aiga4002, Aiga4003, DCSM4001 |

Ambos clonados raso (`git clone --depth 1 --filter=blob:none` + `sparse-checkout` só da pasta `.../AI/Messions`)
em `vendor/_qa-mission-sources/{ddt-34-csharp,gunny-3.0}` (gitignored, não committado — `vendor/` inteiro é
gitignored por regra do AGENTS.md). `CoupleBoss15002` foi procurada (nome da classe, "CoupleBoss" genérico, e
`class CoupleBoss`) em todas essas + outras ~15 repos DDTank/Gunny/DDT-6600/DDTank4.5 que o GitHub code search
indexa — zero hits reais (só colisões de token tipo "coupleboss.com" em listas de domínio e `UsersExtraInfo.cs`
que só guarda os contadores `coupleBossEnterNum/Hurt/BoxNum`, nunca a classe da missão).

## Como foram portadas (as 64)

Em vez de portar os 64 arquivos C# à mão, usei o pipeline existente (`packages/fight/scripts/transpile-pve.ts`,
o mesmo que gerou os ~258 scripts já em `generated/`): copiei a árvore doadora `vendor/DDTank4.1/.../AI` pra um
diretório temporário, adicionei os 64 arquivos `.cs` novos em `AI/Messions/`, e roda `pnpm transpile-pve
--src=<temp>/AI`. **Cuidado importante**: esse script sempre faz `rm -rf` no diretório `generated/` inteiro antes
de escrever — os ~258 scripts já portados têm diálogo traduzido PT-BR *à mão* por cima do output do transpiler
(ex. `generated/Messions/BLTTAH1126.ts` tem falas em português que não existem no C# doador vietnamita original).
Rodar o transpiler direto por cima teria apagado essa tradução. Solução: roda o transpiler completo numa só vez
(pra validar que os 64 novos arquivos transpilam limpo junto com os 258 antigos), guarda só os 64 arquivos
`.ts` novos de lado, `git checkout --` no `generated/` pra restaurar as traduções, e cola os 64 arquivos novos +
as entradas de `import`/registro em `generated/index.ts` manualmente (script Node pontual, não um commit do
transpiler). Os 258 antigos não mudaram (confirmado: `git status` só mostra os 64 arquivos novos, nada
modificado).

Dois ajustes de sintaxe foram necessários nos `.cs` antes do transpiler aceitar (o transpiler é um subset
tokenizer, não um parser C# completo — nunca precisou lidar com isso nos ~258 doadores originais):
- `RemovePhysicalObj(x, sendToClient: true)` → `RemovePhysicalObj(x, true)` (4 arquivos, 2 ocorrências cada)
- `allFightPlayer.SetSeal(state: false)` / `HelperNPC.OnSmallMap(state: false)` / `player.SetSystemState(state:
  true)` → mesma coisa sem o rótulo (C# "named argument" pra um único parâmetro posicional — zero mudança de
  comportamento, só sintaxe).

Essas edições foram feitas só na cópia temporária (`vendor/_qa-mission-sources`, gitignored) — nunca em
`vendor/DDTank4.1` nem `vendor/DDTank41` (read-only, intocados).

Resultado: `transpiled 675 classes: 675 ok, 0 syntax errors` (era 611 antes). As 64 classes resolvem no teste
de cobertura (`pve-mission-coverage.test.ts`) e passam `tsc` + `pnpm --filter @ddt/fight test` (195/195).

## `CoupleBoss15002` — desenho manual

Única sem C# público. Dados reais disponíveis:

- **`Mission_Info` id 15002** (`packages/db/seed/game/Mission_Info.json.gz`): `Name: "Boss vợ chồng"`,
  `Script: GameServerScript.AI.Messions.CoupleBoss15002`, `TotalCount: 1`, `TotalTurn: 200`, `Delay: 800`,
  `IncrementDelay: 2400`, `Success: "Derrote o oponente"`, `Failure: "Derrotado pelo oponente<br>Limite de
  turnos excedido"`, `Param1/2: -1`, `TryAgain: false`.
- **`NPC_Info` id 15002** (schema `game`): `Name: "BOSS Vợ Chồng"`, `Level: 37`, `Blood: 20000000` (!),
  `BaseDamage: 1200`, `Defence: 700`, `Immunity: 2147483647` (máximo — provavelmente imune a status), `X/Y/W/H:
  -52/-128/104/193`, `Script: GameServerScript.AI.NPC.CoupleBossNPC` (também sem fonte — roda ABrain genérico,
  o que é aceitável: esta tarefa só cobre o script de **missão**, não o cérebro do NPC).
- **`Pve_Info`**: nenhuma linha com `Type = 20` (`eRoomType.CoupleBoss`) e nenhuma com nome batendo
  "chồng"/"couple"/"vợ" — ou seja, esse conteúdo nunca foi ligado ao menu de masmorras do jogo original.
  `apps/game` também não tem nenhum fluxo que crie uma sala tipo 20 (só as colunas
  `coupleBossEnterNum/Hurt/BoxNum` em `packages/db/src/schema/player.ts`, que só contam estatística). Conclusão:
  é conteúdo "esqueleto" (schema + 1 linha de Mission_Info + 1 linha de NPC_Info) que nunca foi lançado — mesmo
  padrão documentado em `pendencias-sem-fonte.md` §2 pras telas do cliente sem servidor.

**Ideia implementada** (`packages/fight/src/pve/scripts/manual/coupleboss15002.ts`):
- Co-op de 2 jogadores (o casal) contra o boss de HP gigante — mesmo formato de `CBS600`/`CBS601` (também
  recém-portados; esses sim existem no código doador), que terminam a sala no instante em que
  `GetAllLivingPlayers().Count < 2`. Reaproveitado literalmente: se qualquer um dos dois morrer, a sala falha.
- Boss único via `CreateBoss`, igual ao irmão mais próximo de "um boss só" (`Aiga4003`, também recém-portado).
  `Aiga4003` nunca checa limite de turno; mas o `Failure` desta missão explicitamente cita "Limite de turnos
  excedido", então o limite de turno foi adicionado com o mesmo padrão que `Aiga4002` usa
  (`TurnIndex > MissionInfo.TotalTurn - 1`).
- `SetRelateDemagemRect` e posição usam os valores reais de `NPC_Info` (não um placeholder).

**Decisões que são palpite, marcadas no código pra revisão do dono**:
- **Mapa**: não existe `Pve_Info` pra essa missão, então não há mapa documentado. Reaproveitei o mapa 1184
  (o mesmo que `CBS600` usa) por ser a masmorra 2-jogadores mais parecida já existente. Trivial de trocar.
- **Faixas de score** (`CalculateScoreGrade`): sem dado nenhum de `Pve_Info`; reaproveitei a forma de 4 faixas
  do `Aiga4003`, escalada pro HP ~20x maior deste boss (17500/16750/16000 em vez de 1750/1675/1600). Arbitrário.

Nada disso bloqueia o teste de cobertura (que só verifica se a classe resolve) nem o jogo (a sala tipo 20 nunca
é criada em lugar nenhum do servidor atual) — são só os valores que o script usaria *se* alguém decidir ligar
esse fluxo no futuro.

## Resultado final

- **Achadas e importadas**: 64/65 (ver tabela acima).
- **Desenhadas (sem fonte real)**: 1/65 (`CoupleBoss15002`).
- **Ainda abertas**: 0.

`KNOWN_SOURCELESS` em `packages/fight/test/pve-mission-coverage.test.ts` está vazia agora. `tsc` e
`pnpm --filter @ddt/fight test` verdes (195/195 testes).
