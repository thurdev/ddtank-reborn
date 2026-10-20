# Instâncias (PvE): desbloqueio, FC recomendado e balanceamento

Task `41-instancias` (pedido do dono, 2026-10-20): "instâncias, sistema de desbloqueio de níveis de
instâncias, e de instâncias por nível e FC apropriado, achar um balanceamento". Este documento cobre as 3
partes. Visão geral de como uma masmorra funciona (sala, fluxo, tabelas) já está em
[pve-masmorras.md](./pve-masmorras.md) — leia aquele primeiro; aqui só a parte nova desta task.

## 1. Sistema de desbloqueio

Duas regras, as duas no servidor (nunca confiando no cliente):

1. **Nível** — regra do jogo original: `player.Grade >= game."Pve_Info".LevelLimits` da masmorra escolhida.
   Já existia, mas só era aplicada na hora de ENTRAR na sala (`room-mgr.ts` `enterRoom`,
   `BaseRoom.levelLimit`/bucket 1-2-3 — [room-mgr.ts:248](../../apps/game/src/rooms/room-mgr.ts#L248)) — isso
   não impedia o anfitrião de configurar a sala pra uma masmorra/dificuldade além do seu nível real via
   `94 GAME_ROOM_SETUP_CHANGE` (o campo `levelLimits` desse pacote é só o balde 1/2/3 do `BaseRoom`, não o
   `Pve_Info.LevelLimits` de verdade — são conceitos diferentes, ambos chamados "LevelLimits").
2. **Dificuldade anterior vencida** (Reborn, sem equivalente no C# original) — uma dificuldade além da
   primeira (`Simples`) só libera depois que o jogador já venceu a dificuldade anterior DA MESMA masmorra
   pelo menos uma vez. "Dificuldade anterior" é calculada pela ESCADA REAL daquela masmorra, não por
   `hardLevel - 1` — `game."Pve_Info"` tem `Simple/Normal/Hard/Terror/Epic/NightmareTemplateIds`; uma
   dificuldade "existe" quando o campo correspondente tem pelo menos 1 id de NPC real (não vazio, não só o
   sentinela `-100` que algumas linhas usam pra "fechado" — ex. ID 12). Muitas masmorras só têm
   Simples+Normal; a escada pula a dificuldade que não existe.

### Onde isso mora no código

| Peça | Arquivo |
|---|---|
| Escada de dificuldades + regra pura (nível + clear anterior) | [`apps/game/src/game/pve-unlock.ts`](../../apps/game/src/game/pve-unlock.ts) — `dungeonDifficultyLadder`, `isDungeonUnlocked` |
| Persistência do "zerei essa dificuldade" | [`apps/game/src/db/pve-progress.ts`](../../apps/game/src/db/pve-progress.ts) — `recordPveClear`/`loadClearedDifficulties`, tabela `app."PveInstanceClear"` (migração `0024_regular_oracle.sql`, aditiva) |
| **Ponto de aplicação real** ("refuse to start") | [`apps/game/src/handlers/salas/iniciar-partida.ts`](../../apps/game/src/handlers/salas/iniciar-partida.ts) `dungeonLockedMessage` — chamado por `iniciarPartida`/`atalhoIniciarAnfitriao`, ANTES de `ctx.rooms.startGame(room)` |
| Quando uma masmorra conta como "zerada" | [`apps/game/src/rooms/room-mgr.ts`](../../apps/game/src/rooms/room-mgr.ts) `onDungeonCleared` (novo hook de `RoomMgrOptions`, chamado de dentro do `onFinished(isWin)` do `launchPve`) → [`apps/game/src/server.ts`](../../apps/game/src/server.ts) grava 1 clear por jogador humano da sala quando `isWin` |

**Por que o ponto de aplicação é o `GAME_START` (sub 7) e não o `GAME_ROOM_SETUP_CHANGE` (sub 2):** a tela de
configurar sala no cliente 4.1 nunca recusa uma seleção no AS3 (ela espera o servidor, igual sempre fez pro
nível) — então deixamos o preview da sala igual ao original (o anfitrião PODE configurar uma dificuldade
trancada, só não consegue de fato lutar nela) e colocamos a checagem de verdade onde a luta realmente
começa. Isso cobre os dois jeitos de iniciar uma masmorra normal (`94/7 GAME_START` e o atalho `86`); o
Campo de treino (Fight Lab) tem seu PRÓPRIO sistema de desbloqueio por nível (`game/fightlab.ts`,
já existia) e nunca passa por aqui.

**O que o cliente vê:** igual ao jogo original — a tela de masmorras não tem um estado "cinza" vindo do
servidor pra dificuldade trancada (o 4.1 nunca mandou isso; é decidido 100% client-side hoje, com os
limites de nível fixos no AS3). Tentar iniciar uma dificuldade trancada agora recebe a MESMA mensagem de
sistema (`3 SYS_MESSAGE`, `Out.message`) que o jogo já usa pra outras recusas de sala — "Você precisa
vencer a dificuldade anterior desta masmorra antes de jogar esta." ou "Seu nível ainda não é suficiente
para esta masmorra." — a sala cancela o "pickup" (igual já fazia pra "sem arma equipada").

**Configurável** (pedido do dono: "configurable by having cleared the previous one"): chave
`game."Server_Config"` `pveRequireClear` (lida via `Templates.cfgInt`, mesmo mecanismo de toda outra
config inteira do jogo — sem página dedicada ainda, edite via `/api/admin/game-config` ou SQL direto, igual
outras chaves desse estilo) — `0` desliga só a regra 2 (continua exigindo nível). `cfg.ALL_OPEN` (switch de
QA que já existia, agora documentado em [room-mgr.ts:22-25](../../apps/game/src/rooms/room-mgr.ts#L22))
desliga as duas regras, igual já desligava o antigo check de nível na entrada da sala.

## 2. FC recomendado por masmorra/dificuldade (método + tabela)

**"FC" = Fight Power** (`FightPower`/"poder de combate", `tank.menu.FightPower` no cliente). A fórmula já
existe no servidor — `GamePlayer.UpdateFightPower` (GamePlayer.cs:5212), portada em
[`apps/game/src/game/stats.ts:290`](../../apps/game/src/game/stats.ts#L290) `fightPower()`:

```
fp = trunc( (sum(Attack,Defence,Agility,Luck) + 1000) * (baseAttack³ + 3.5·baseDefence³) / 1e8 + hp·0.95 )
```

`baseAttack`/`baseDefence` vêm do equipamento (arma/elmo/roupa, `GetBaseAttack`/`GetBaseDefence`,
`stats.ts:238,264`) — é por isso que FC **não é travado por nível** neste jogo: equipamento não tem
`NeedLevel` real (confirmado nos dados — todo `game."Shop_Goods"` de categoria arma/elmo/roupa tem
`NeedLevel=0`; a progressão de poder vem de **fortalecimento** (`StrengthenLevel`, cresce exponencial via
`getHertAddition`) e qualidade do item, não do nível do personagem). Então "FC recomendado pro nível X" não
é uma curva que dá pra derivar de tabela de item por nível — dois jogadores do mesmo nível podem ter FC
muito diferente dependendo do quanto investiram em fortalecer o equipamento.

**Método usado aqui:** aplicar a MESMA fórmula aos dados do `game."NPC_Info"` de cada encontro — Blood→hp,
BaseDamage→baseAttack, BaseGuard→baseDefence, Attack/Defence/Agility/Lucky→sum (os MESMOS campos que o motor
de luta usa pros NPCs, `packages/fight/src/pve/livings.ts` `resetFromInfo` — não é analogia solta, é a
mesma matemática de dano/defesa dos dois lados). Isso dá um "FC do encontro" diretamente comparável ao FC
do jogador mostrado na UI: **recomendação = o jogador deveria ter FC próximo ou acima da mediana dos NPCs
comuns daquela dificuldade** (mediana, não média — um único chefe com stats muito acima do resto da lista
distorce a média; a fórmula é cúbica em `baseAttack`/`baseDefence`, então um chefe "endgame" pode ter FC
ordens de magnitude maior que um mob comum — isso é esperado, não um bug).

### Tabela (masmorras `Type=4`, dados reais de `game."NPC_Info"`/`Pve_Info"`)

`found/total` = quantos dos NPCs listados no `*TemplateIds` daquela dificuldade existem de fato no
`game."NPC_Info"` importado — **quando esse número é baixo, o FC abaixo é calculado numa amostra pequena e
deve ser tratado como indicativo, não exato** (a maioria das linhas abaixo de 20-30% de cobertura: o
`.bak` original tinha muito mais NPCs "de preenchimento" compartilhados entre masmorras do que o snapshot
importado trouxe — gap de dados pré-existente, não desta task).

| Masmorra (`Pve_Info.ID`) | Nível mín. | Dificuldade | NPCs achados | FC mediano (mobs) | FC do chefe |
|---|---|---|---|---|---|
| 1 Lâu đài Gà | 14 | Simples | 2/33 | 2 420 | 3 879 |
| 1 Lâu đài Gà | 14 | Normal | 2/47 | 2 205 | 3 879 |
| 1 Lâu đài Gà | 14 | Difícil | 1/59 | 203 819 720 | (igual — 1 só achado) |
| 2 Huyệt Ma Kiến | 8 | Simples | 1/23 | 531 | 531 |
| 2 Huyệt Ma Kiến | 8 | Normal | 1/45 | 3 879 | 3 879 |
| 3 Bộ lạc Tà thần | 18 | Normal | 4/49 | 2 960 | 77 002 |
| 3 Bộ lạc Tà thần | 18 | Terror | 4/76 | 994 146 | 1 436 050 130 |
| 4 Pháo đài hắc ám | 18 | Normal | 2/49 | 2 420 | 3 879 |
| 4 Pháo đài hắc ám | 18 | Difícil | 2/73 | 39 522 | 77 002 |
| 4 Pháo đài hắc ám | 18 | Terror | 1/104 | 1 436 050 130 | (igual) |
| 5 Đại chiến rồng | 18 | Normal | 3/53 | 356 450 | 524 722 |
| 5 Đại chiến rồng | 18 | **Difícil** | 8/73 | **52 863** ⚠️ | 104 578 750 |
| 5 Đại chiến rồng | 18 | Terror | 2/94 | 718 031 040 | 1 436 050 130 |
| 6 Đấu trường gà | 18 | **Normal** | 4/48 | **451 011 193** ⚠️ | 734 277 234 |
| 6 Đấu trường gà | 18 | Difícil | 4/84 | 22 989 | 77 002 |
| 6 Đấu trường gà | 18 | Terror | 3/103 | 161 042 | 1 436 050 130 |
| 7 Giải cứu gà con | 9 | Simples | 3/40 | 960 | 3 879 |
| 7 Giải cứu gà con | 9 | Normal | 2/36 | 5 720 000 | 10 095 000 |
| 13 Đấu Trường Dũng Sĩ | 30 | Simples | 3/52 | 3 879 | 265 052 |
| 13 Đấu Trường Dũng Sĩ | 30 | Normal | 8/82 | 27 644 | 203 819 720 |
| 13 Đấu Trường Dũng Sĩ | 30 | Difícil | 1/65 | 26 563 | 26 563 |
| 13 Đấu Trường Dũng Sĩ | 30 | **Terror** | 4/104 | **8 156** ⚠️ | 161 042 |
| 14 Tàu Hải Tặc | 8 | Simples | 1/20 | 77 002 | 77 002 |

(Linhas sem nenhum NPC achado — ex. masmorra 1/Terror, 7/Difícil, 12 inteira — ficaram de fora da tabela;
não têm dado pra calcular nada.)

**⚠️ = inversão na escada** (dificuldade devia ser ≥ a anterior e não é): `5/Difícil` (52 863) é MENOR que
`5/Normal` (356 450); `6/Normal` (451 milhões) é MAIOR que `6/Difícil` E `6/Terror`; `13/Terror` (8 156) é
MENOR que `13/Difícil` (26 563). São 3 sinais reais de desbalanceamento vindos do próprio dado original —
não inventados por este método. **Nenhuma das três foi "corrigida" automaticamque** (seção 3 explica por
quê) — ficam aqui como recomendação pro dono revisar na página de admin.

## 3. Balanceamento: camada de multiplicadores

Tabela `app."PveBalance"` (migração `0024_regular_oracle.sql`, aditiva) — 1 linha por `(PveId, HardLevel)`
com 4 multiplicadores (`NpcHpMult`, `NpcDamageMult`, `NpcDefenceMult`, `RewardMult`), todos `double
precision`, padrão `1.0`. **Ausência de linha = 1.0 em tudo** (sem alteração nenhuma — igual ao jogo
original) — a tabela só precisa de linha pra masmorra/dificuldade que alguém realmente quer reajustar.

### Onde é aplicado

[`apps/game/src/fight/ddt.ts`](../../apps/game/src/fight/ddt.ts) `startPve()`, funções `scalePveNpc`/
`scalePveDrop`/`isNeutralBalance` (exportadas, testadas em `test/pve-instancias.test.ts`):
- `NpcHpMult` → `NPC_Info.Blood` (vida, nunca menor que 1).
- `NpcDamageMult` → `BaseDamage` + `Attack` (espelha o par `baseAttack`/`attack` do jogador, `stats.ts`).
- `NpcDefenceMult` → `BaseGuard` + `Defence`.
- `RewardMult` → `Experience` do NPC **e** a quantidade de todo item de drop daquele encontro (`copyDrop`/
  `npcDrop`, mínimo 1 — nunca zera uma recompensa).

A escala acontece 1x por sessão de luta (`startPve`, quando a sala manda `94/7 GAME_START`), lendo
`Templates.pveBalance(pveId, hardLevel)` (cache em memória, `apps/game/src/db/templates.ts`
`loadPveBalance`/`pveBalances`) — recarregado por `/reload-templates` (toda escrita no admin dispara isso,
`apps/api/src/routes/admin.ts` `afterWrite`), então um ajuste no admin vale pra próxima luta que começar,
sem reiniciar o servidor nem o jogador relogar.

### Admin

Página "Balanceamento de masmorras" (`apps/admin/src/resources/pve-balance.ts`, resource `pve-balance`,
whitelist em `apps/api/src/routes/admin-resources.ts`) — campo `PveId` como referência pro nome da masmorra
(`ref`→`dungeons`), `HardLevel` como seletor com os nomes das dificuldades, 4 campos numéricos (0.1-10.0,
passo 0.05). Uma 2ª página só-leitura, "Progresso de masmorras" (resource `pve-clears`, oculta do menu —
`hidden: true`, acessível por link direto — ferramenta de suporte/depuração: apagar uma linha "trava de
novo" aquele jogador na próxima dificuldade).

### Por que nenhum multiplicador não-1.0 foi aplicado por padrão

A tabela da seção 2 mostra 3 inversões reais, mas a amostra de NPCs encontrados por dificuldade é pequena
(a maioria < 20% de cobertura — ver coluna `found/total`) — "corrigir" `5/Difícil` ou `13/Terror` com um
número preciso a partir de 1-8 NPCs amostrados (de um roster real de 50-100+ no jogo original) seria
apresentar uma precisão que os dados não sustentam. A tarefa pediu "propor" defaults, não "aplicar às
cegas" — a extensão/método está pronta e testada (uma linha em `app."PveBalance"` já funciona e já é
testada ponta-a-ponta); a decisão de QUANTO ajustar cada uma das 3 masmorras acima fica pro dono, depois de
jogar/medir (a página de admin edita isso em segundos, sem deploy). Nenhum multiplicador nesta task foi
deixado diferente de `1.0` nos dados reais — só a infraestrutura + a análise.

## 4. Testes

`apps/game/test/pve-instancias.test.ts` (13 casos):
- `pve-unlock (pure logic)` — `dungeonDifficultyLadder`/`isDungeonUnlocked`: escada que pula dificuldade sem
  dado, sentinela `-100`, regra de nível, regra de "dificuldade anterior" (usando a escada real, não
  `hardLevel-1`), `hardLevel` inexistente nunca libera, `allOpen`/`requireClear:false`.
- `fight/ddt.ts scalePveNpc/scalePveDrop` — balanço neutro não aloca; HP/dano/defesa/recompensa escalam
  independente; HP nunca zera; drop nunca zera.
- `db/pve-progress` — `recordPveClear` upsert + incrementa `ClearCount`; `loadClearedDifficulties`.
- Integração (sala real, `game."Pve_Info"` ID 2 "Huyệt Ma Kiến" — a mesma masmorra que
  `packages/fight/test/pve.test.ts` já prova funcionar ponta-a-ponta): recusa iniciar Normal sem nunca ter
  zerado Simples (mensagem + nenhum `91 GAME_CMD` chega); libera Simples sem clear nenhum, zera, e então
  Normal libera DE VERDADE (chega `91`, a luta real começa); nível insuficiente recusa mesmo com os clears
  todos.
