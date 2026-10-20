# Gap C# → TS + protocolo de verificação (fonte: `docs/qa-matrix.json`)

Panorama 2026-10-20 (pós feature/41-partial-a + feature/41-partial-b) — 361 itens (cliente 4.1; 6600 em
stand-by, ver AGENTS.md): servidor `ok` 324 · `partial` 24 · `stub` 4 · `missing` 0 · `wontfix` 9.
Verificado em jogo: `yes` 56 · resto `no`. **Nada conta como pronto sem `verified:yes` + evidência.**

`feature/41-partial-a` fechou **41-labirinto-combate** (131 LABYRINTH, 8 subs) e **41-guilda-skill-combate**
(129 CONSORTIA_CMD sub 26 SKILL_SOCKET) — ver seção "Prioridade" abaixo (itens agora `server:ok`, riscados).
`feature/41-partial-b` fechou **41-loja-estoque-global** (168 GOODS_COUNT), **41-titulo-por-cartao**
(265 NEWTITLE_CARD) e **41-capela-reembolso** (249/12 MARRYROOMSENDGIFT) — os 2 `missing` que restavam no
4.1 somem (zero `missing` agora).

A matriz estava defasada (lote anterior, 2026-10-08, media `partial` 66/`missing` 48/`stub` 39 — números
que o próprio `AGENTS.md`/orientação desta tarefa ainda citava): muita coisa foi implementada desde então
(m3-partial-sweep, m3-elite-brackets, loterias/Reborn design, Semana da Sociedade, Caminho da Luz, minigame
das Termas, etc.) sem a matriz ser atualizada. Esta rodada (feature/41-qa-sync) reauditou os 117 itens
`!= ok` um a um contra `apps/game/src/handlers/**` + `HANDLERS.md` + `vendor/DDTank41` e sincronizou
`server` (sem tocar `verified`, que só muda com teste em jogo de verdade). Os 9 códigos `stub` do
`tools/qa/packet-coverage.mjs` (32 COLLECTINFO, 50 FIGHT_NPC, 89 QUESTION_REPLY, 167 CHURCH_MOVIE_OVER,
188 USE_CONSORTIA_REWORK_NAME, 205 USE_CHANGE_COLOR_SHELL, 214 USER_RELOAD_GIFT, 224 CID_CHECK ×2) foram
confirmados mortos/anti-vício/sem gateway de SMS nos dois lados (vendor C# + AS3) e marcados `wontfix` na
matriz, com a citação do arquivo/linha no próprio `notes`.

## Mapa origem C# → destino TS

| Subsistema C# (`vendor/DDTank41`) | Destino TS | Situação |
|---|---|---|
| `Tank.Request` (.ashx: login, serverlist, nickname…) | `apps/api/src/request/endpoints/` (9 arquivos) | Base ok, faltam endpoints menores |
| `Game.Server` + `Center.Server` (handlers de pacote) | `apps/game/src/handlers/` (20 arquivos) | Maioria ok; ver tabela por área |
| `Game.Logic` (Player, Bag, Quest, Pet, Fight…) | `apps/game/src/game/` (14 arquivos) | Núcleo ok |
| `Game.Logic` PvE/AI + `DDTank4.1` scripts missão/NPC | `packages/fight` (646 arquivos) | Maior parte gerada; validar em jogo |
| `SqlDataProvider` + `.bak` | `packages/db` (Drizzle, 15 arquivos) | Schema/migrações em andamento |
| Protocolo binário/crypto | `packages/protocol` (16 arquivos) | Ok (cliente conecta) |
| `GameAdmin` | `apps/admin` | Parcial (joins/filtros pendentes — ver ROADMAP) |
| `Road.Service` / ranking e serviços auxiliares | — | **Gap: mapear quais endpoints faltam** |
| `Center.Server` cross-server (GvG inter-server) | — | **Gap: checar se entra no escopo Fase 1** |

## Por área (matriz QA) — ordem de ataque

1. **`missing` (0)**: resolvido — `249 MARRY_CMD` sub 12 (refund/requestRefund da capela), o único gap
   `missing` real que restava no cliente 4.1, foi concluído em `feature/41-partial-b` (ver lista abaixo).
2. **`stub` (4)**: `145 ACTIVITY_SYSTEM` subs 37-45 (LanternRiddles) — subsistema real do cliente sem
   handler no original nenhum; candidato a feature nova (mesmo molde de "Semana da Sociedade"/"Caminho da
   Luz", que começaram exatamente assim). Os outros 8 `stub` antigos (32/50/89/167/188/205/214/224) foram
   confirmados mortos e viraram `wontfix` nesta rodada — não sobra `stub` "fácil" nenhum.
3. **`partial` (24)**: completa e testa — ver lista priorizada abaixo.
4. **`ok` + `verified:no` (maioria)**: só Playwright, sem código novo.

Áreas com mais dívida agora (contando só `partial`/`stub`/`missing`, não `wontfix`; 28 itens no total —
`feature/41-partial-a` zerou PvE/Masmorras e Sociedade/Guilda; `feature/41-partial-b` fechou 168/265
(Bolsa/Inventário) e as 2 linhas de 249 sub 12 (Missões/Outros), ambas listas já refletidas aqui):
Eventos/Atividades (16), Boss mundial/Minigames (6), Bolsa/Inventário (1), Missões (1), Outros (1),
Combate/GAME_CMD (1), Conta/Login (1), Loja (1).

## Prioridade dos `partial`/`stub`/`missing` restantes (2026-10-20, por impacto no jogador)

Cada linha é uma tarefa do tamanho de um agente. Ordem: battle/PvE core loop primeiro, depois bolsa/loja,
depois guilda/social, depois eventos secundários (board games/minigames que não bloqueiam a progressão
principal).

- ~~**41-labirinto-combate** — 131 LABYRINTH~~ **feito** (`feature/41-partial-a`, 2026-10-20): a sala PvE
  real (`RoomType.Labyrinth=15`, `Pve_Info.ID=401` fixo) já tinha chegado via merge concorrente
  (`feature/41-instancias`) — `myProgress` avança de verdade via combate real (`updateLabyrinthFloor`/
  `outLabyrinth`, server-authoritative, nunca o cliente). Esta rodada confirmou charge-before-grant e
  claim-once em CLEAN_OUT/SPEEDED_UP (já existiam) e atualizou `qa-matrix.json` (estava `partial` por um
  reaudit defasado). Timer real de 1s/jogador do CLEAN_OUT original não foi portado (liquidação é
  instantânea) — deviation de baixo impacto, documentada no header de `labirinto.ts` e em
  `docs/features/labirinto.md`. `vendor/DDTank41/Game.Server/Packets/Client/LabyrinthHandler.cs`.
- ~~**41-guilda-skill-combate** — 129 CONSORTIA_CMD sub 26 `SKILL_SOCKET`~~ **feito**
  (`feature/41-partial-a`, 2026-10-20): os buffs de guilda (Type 101-112) agora entram em combate pelo
  mesmo caminho do stat de equipamento — `apps/game/src/fight/ddt.ts` `specOf` lê `GamePlayer.buffs` ativos
  (`game/consortia.ts` `guildFightBonus`) pro `PlayerSpec.guildBuffs` do `@ddt/fight`, que `Player.reset()`/
  `prepareNewTurn()` aplicam: Type 102 dano, 103 crítico, 104 HP%, 105 ataque/defesa/agilidade/sorte, 107
  energia (todo turno); Type 110 (bônus de GP/"gold") aplicado no reward de PvE/PvP
  (`applyGuildGpBonus`, `fight/ddt.ts`). Sem stacking (Value sempre substitui, nunca soma); charge-before-
  grant já existia (`loja-habilidades.ts`), confirmado. Gap residual documentado (mecânica de bomba/feitiço
  que `@ddt/fight` não tem): Type 101/106/109/111/112. `vendor/DDTank41/Game.Server/Consortia/Handle/SkillSocket.cs`,
  `Game.Logic/Phy/Object/Player.cs:1422-1464`.
- **41-boss-mundial-revisao** — 102 WORLDBOSS_CMD (`ENTER_WORLDBOSSROOM=32`, `ADDPLAYERS=34`,
  `LEAVE_ROOM=33`, `MOVE=35`, `STAUTS=36`, `REQUEST_REVIVE=37`, `BUFF_BUY=38`): desvios documentados —
  jogador age antes do dragão (original: dragão agia primeiro, one-shot), buff cobrado 1× em vez de 2×.
  Funcional, revisar se os desvios são aceitáveis ou merecem fix.
  `vendor/DDTank41/Game.Server/WorldBoss/Handle/{AddPlayer,BuyBuff,Move,RequestRevive,Status}.cs`.
- ~~**41-loja-estoque-global** — 168 GOODS_COUNT~~ **concluído** (`feature/41-partial-b`, 2026-10-20):
  estoque diário global por `Shop.ID` rastreado de verdade (`handlers/loja/estoque-diario.ts`, reset por
  chave), enforçado em 44 BUY_GOODS (ShopID 20) só depois do carrinho passar a checagem de dinheiro. Testes:
  `apps/game/test/shop-estoque-global.test.ts`.
- **41-bolsa-split-drag** — 49 CHANGE_PLACE_GOODS: split de pilha por drag duplo (botão "Tách" vira o
  drag, depois um segundo drag da quantidade) não confirmado no cliente real via Playwright (gestos
  `Sprite.startDrag()` nativos do Flash não dispararam nas tentativas); lógica server-side já testada
  (unit test). `vendor/DDTank41/Game.Server/Packets/Client/UserChangeItemPlaceHandler.cs`.
- ~~**41-titulo-por-cartao** — 265 NEWTITLE_CARD~~ **concluído** (`feature/41-partial-b`, 2026-10-20):
  `game."New_Title"` já tinha schema+seed (325 linhas) no Postgres desde a geração inicial — o gap real era
  `Templates` nunca carregar pra memória (sem migração nova). Título agora é encontrado/concedido
  (`PlayerRank.AddNewRank` por `NewTitleID`, claim-once por título) e 189 USER_CHANGE_RANK ganhou o
  `NewTitleID` real. Testes: `apps/game/test/titulos.test.ts`.
- ~~**41-capela-reembolso** — 249 MARRY_CMD sub 12 `MARRYROOMSENDGIFT`~~ **concluído**
  (`feature/41-partial-b`, 2026-10-20): nenhum vendor (4.1 nem 6600) tinha handler real pro código 12 —
  design próprio: 249/5 LARGESS passa a acumular num saldo por sala em vez de mandar por correio na hora;
  o casal consulta (`BEGINSENDGIFT=1`) e resgata (`CLIENTCONFIRM=4`) esse saldo, 50/50, nunca paga mais do
  que foi dado, idempotente (zera antes de mandar o correio). Testes:
  `apps/game/test/marriage-farm-auction.test.ts`.
- **41-scene-state-cobertura** — 251 SCENE_STATE: só a parte da capela (sub 0 reposiciona casal, sub 1
  sala de espera) está implementada; cobertura de loja/consórcio/lista de salas (outros usos do mesmo
  código, ver `files` no `qa-matrix.json`) não foi auditada. Sem handler C# único (pacote genérico usado
  por vários controllers AS3).
- **41-novato-progresso** — 258 NOVICEACTIVITY: elegibilidade simplificada pra `Grade >= Condition`; o
  contador de progresso real por `ActivityType` (grade-up/fortalecimento/recarga/VIP/FightPower via
  `PlayerExtra`) não foi portado. `vendor/DDTank41/Game.Server/Packets/Client/NoviceActivityGetAward.cs`.
- **41-captcha-anti-bot** — 200 CHECK_CODE: o lado que EMITE o desafio anti-bot (`ShowCheckCode`) nunca
  foi portado, então `CheckCode` fica sempre vazio (a verificação em si reproduz o early-out correto do
  original). Não bloqueia gameplay, mas é a única defesa anti-bot do 4.1 que falta.
  `vendor/DDTank41/Game.Server/Packets/Client/CheckCodeHandler.cs:782`.
- **41-chick-activation** — 84 ACTIVITY_PACKAGE family 2 (`ChickActivationType.CHICKACTIVATION`, subs
  QUERY/OPENKEY/GETAWARD): sistema de "código de ativação" de 14 caracteres inteiro não portado (falta
  `UserChickActiveInfo` + handler + UI admin pra cadastrar códigos). Feature grande, orçamento próprio.
  `vendor/DDTank41/Game.Server/Packets/Client/ActivityPackageHandler.cs` (linhas ~135-250).
- **41-chickenbox-persistencia** — 87 NEWCHICKENBOX_SYS (10 subs, chicken box + lucky star): estado do
  tabuleiro só em memória (não persiste em `New_ChickenBox_Data`) — sobrevive a reconexões mas não a um
  restart do processo. Deviation documentada, baixo impacto.
  `vendor/DDTank41/Game.Server/Packets/Client/ChickenBoxHandler.cs`.
- **41-lanternriddles** — 145 ACTIVITY_SYSTEM subs 37-45 (`LANTERNRIDDLES_ANSWER=40`,
  `LANTERNRIDDLES_SKILL=41`, QUESTION, RANKINFO): subsistema inteiro sem fonte C# real em nenhum vendor
  (`ActiveSystemHandler.cs` só monta um pacote pro sub 8 e nunca chama `SendTCP` — todo o resto cai no
  `default`). Candidato a feature nova tipo "Semana da Sociedade"/"Caminho da Luz" (145 subs 7-13/64-66,
  ambas implementadas nesta mesma área sem fonte C#). `vendor/DDTank41/Game.Server/Packets/Client/ActiveSystemHandler.cs`.

## Protocolo Playwright (vale pra cada item)

1. Branch `feature/qa-<area>` a partir de `develop`. Servidor local + cliente harness.
2. Pra cada item: executa a ação no cliente de verdade (cada botão, cada feature),
   confere efeito no servidor (DB/pacote), tira evidência (screenshot ou log).
3. Marca no `qa-matrix.json`: `verified:"yes"`, `notes` curto, `evidence` path.
   Se falhar: `verified:"no"`, `notes` com sintoma + abre issue linkada.
4. PR pra `develop` com a matriz atualizada. Review roda o mesmo teste no servidor de teste.
5. `verified:yes` em `develop` + jogatina real = pode ir pra `main`.

## Backup (pré-requisito da live, não da abertura do repo)

- `scripts/backup-db.sh` (criar): `pg_dump --format=custom` diário, retenção 30d, restore 1x/mês.
- `.env` prod só em cofre. Restore = dump + env + tag `main`.
- Sem backup testado, sem live pública.
