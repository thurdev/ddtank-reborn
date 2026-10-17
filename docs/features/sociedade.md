# Sociedade (guilda)

## 1. O que é no jogo
A **Sociedade** (guilda) é o grupo social persistente do jogo: um jogador cria
ou entra numa sociedade, sobe de patente, dá/recebe doação de Riqueza (banco da
guilda), conversa no chat da guilda, e o presidente administra membros,
convites, cargos e o nível da sociedade (que dá bônus, ex. `smithLevel` do
Ferreiro — ver [forja.md](./forja.md)). Toda a tela (`consortia/**` no cliente)
manda **um único pacote** `129 CONSORTIA_CMD`, despachado por sub-código.

## 2. Onde fica no código
Desde a refatoração de legibilidade, o roteador de `129 CONSORTIA_CMD` mora em
`apps/game/src/handlers/sociedade/` — um arquivo por ação (nome = o que o
jogador vê na tela), montado em `sociedade/index.ts`.

| Sub (int) | Ação | Servidor TS | C# original | Tabelas |
|---|---|---|---|---|
| 0 CONSORTIA_TRYIN | pedir pra entrar numa sociedade | [`tryIn`](../../apps/game/src/handlers/sociedade/entrar-pedir.ts#L23) `entrar-pedir.ts:23` | `ConsortiaTryinHandle` | `player."Consortia"` |
| 1 CONSORTIA_CREATE | criar sociedade | [`createConsortia`](../../apps/game/src/handlers/sociedade/criar.ts#L23) `criar.ts:23` | `ConsortiaCreateHandle` | `player."Consortia"` |
| 2 CONSORTIA_DISBAND | dissolver | [`disbandConsortia`](../../apps/game/src/handlers/sociedade/criar.ts#L62) `criar.ts:62` | `ConsortiaDisbandHandle` | `player."Consortia"` |
| 3 CONSORTIA_RENEGADE | sair/expulsar | [`renegade`](../../apps/game/src/handlers/sociedade/sair-expulsar.ts#L21) `sair-expulsar.ts:21` | — | — |
| 4 CONSORTIA_TRYIN_PASS | aceitar/recusar pedido de entrada | [`tryInPass`](../../apps/game/src/handlers/sociedade/entrar-pedir.ts#L34) `entrar-pedir.ts:34` | — | — |
| 5 CONSORTIA_TRYIN_DEL | cancelar pedido | [`tryInDel`](../../apps/game/src/handlers/sociedade/entrar-pedir.ts#L48) `entrar-pedir.ts:48` | — | — |
| 6 CONSORTIA_RICHES_OFFER | doar Riqueza pro banco da guilda | [`richesOffer`](../../apps/game/src/handlers/sociedade/banco-riqueza.ts#L17) `banco-riqueza.ts:17` | `ConsortiaRichesOfferHandle` | `player."Consortia"` |
| 7 CONSORTIA_APPLY_STATE | abrir/fechar pra novos pedidos | [`applyState`](../../apps/game/src/handlers/sociedade/entrar-pedir.ts#L58) `entrar-pedir.ts:58` | — | — |
| 9 CONSORTIA_DUTY_DELETE | remover patente | [`dutyDelete`](../../apps/game/src/handlers/sociedade/cargos.ts#L25) `cargos.ts:25` | — | — |
| 10 CONSORTIA_DUTY_UPDATE | criar/editar patente | [`dutyUpdate`](../../apps/game/src/handlers/sociedade/cargos.ts#L37) `cargos.ts:37` | — | — |
| 11 CONSORTIA_INVITE | convidar jogador | [`inviteAdd`](../../apps/game/src/handlers/sociedade/convite.ts#L21) `convite.ts:21` | — | — |
| 12 CONSORTIA_INVITE_PASS | aceitar convite | [`invitePass`](../../apps/game/src/handlers/sociedade/convite.ts#L42) `convite.ts:42` | — | — |
| 13 CONSORTIA_INVITE_DELETE | recusar/cancelar convite | [`inviteDelete`](../../apps/game/src/handlers/sociedade/convite.ts#L56) `convite.ts:56` | — | — |
| 16 CONSORTIA_BANCHAT_UPDATE | ligar/desligar banimento de chat | [`banChatUpdate`](../../apps/game/src/handlers/sociedade/cargos.ts#L55) `cargos.ts:55` | — | — |
| 17 CONSORTIA_USER_REMARK_UPDATE | editar "apelido" interno de um membro | [`userRemarkUpdate`](../../apps/game/src/handlers/sociedade/mural.ts#L42) `mural.ts:42` | — | — |
| 18 CONSORTIA_USER_GRADE_UPDATE | promover/rebaixar patente | [`userGradeUpdate`](../../apps/game/src/handlers/sociedade/cargos.ts#L76) `cargos.ts:76` | — | — |
| 19 CONSORTIA_CHAIRMAN_CHAHGE | transferir presidência | [`chairmanChange`](../../apps/game/src/handlers/sociedade/cargos.ts#L90) `cargos.ts:90` | — | — |
| 20 CONSORTIA_CHAT | chat da guilda | [`guildChat`](../../apps/game/src/handlers/sociedade/chat-guilda.ts#L15) `chat-guilda.ts:15` | — | — |
| 21 CONSORTIA_LEVEL_UP | subir nível da sociedade (gasta Riqueza) | [`levelUp`](../../apps/game/src/handlers/sociedade/evolucao.ts#L21) `evolucao.ts:21` | — | `game."Consortia_Level"` |
| 22 CONSORTIA_TASK_RELEASE | missão/tarefa da guilda (subs 0-3) | [`taskRelease`](../../apps/game/src/handlers/sociedade/missoes.ts#L20) `missoes.ts:20` | — | `game."Consortia_TaskConfig"`, `game."Consortia_TaskAward"` |
| 23 DONATE | doar Medalha (11408) pro clã, alimenta a missão tipo 5 — **design próprio, sem fonte C#** | [`donate`](../../apps/game/src/handlers/sociedade/banco-riqueza.ts#L55) `banco-riqueza.ts:55` | `Donate.cs` original sem lógica; `DonateFrame.as` existe mas está comentado no build atual | — |
| 24 CONSORTIA_EQUIP_CONTROL | controlar equipamento de guilda | [`equipControl`](../../apps/game/src/handlers/sociedade/banco-riqueza.ts#L65) `banco-riqueza.ts:65` | — | — |
| 25 POLL_CANDIDATE | votar em "Membro da Semana" (1 voto/semana por membro) — **design próprio, sem fonte C#** | [`pollCandidate`](../../apps/game/src/handlers/sociedade/votacao.ts#L23) `votacao.ts:23` | nenhuma classe `[ConsortiaHandleAttbute]` tagueada pra esse sub | `app."ConsortiaPollVotes"` |
| 26 SKILL_SOCKET | loja de habilidades (buff de guilda) | [`skillSocket`](../../apps/game/src/handlers/sociedade/loja-habilidades.ts#L29) `loja-habilidades.ts:29` | — | — |
| 28 BUY_BADGE | comprar emblema | [`buyBadge`](../../apps/game/src/handlers/sociedade/emblema.ts#L20) `emblema.ts:20` | — | `game."Consortia_Badge"` |
| 29 CONSORTION_MAIL | correio da guilda | [`guildMail`](../../apps/game/src/handlers/sociedade/correio-guilda.ts#L22) `correio-guilda.ts:22` | — | — |

Tabela principal do estado da guilda: `player."Consortia"` (nome, presidente,
Riqueza, `consortiaPower`, nível...). `player."Consortia_Ally"` guarda
alianças entre guildas. Templates fixos: `game."Consortia_Level"` (requisito
de Riqueza por nível, bônus), `game."Consortia_TaskConfig"`/`"Consortia_TaskAward"`
(missões de guilda), `game."Consortia_Badge"` (emblemas compráveis),
`game."Consortia_BuffTemp"` (buffs de guilda).

## 3. Fluxo passo a passo

### Criar e entrar numa sociedade
1. Jogador sem guilda abre a tela e clica **Criar**: `129` sub `1`
   (`CONSORTIA_CREATE`) com nome + manifesto. `sociedade/criar.ts:23` cria a linha em
   `player."Consortia"` com o jogador como presidente (patente máxima) e cobra
   o custo de fundação.
2. Outro jogador pede entrada: `129` sub `0` (`CONSORTIA_TRYIN`) manda o
   pedido pra sociedade escolhida; aparece na lista de pedidos do presidente
   (sub `7 CONSORTIA_APPLY_STATE`).
3. Presidente/oficial aceita: `129` sub `4` (`CONSORTIA_TRYIN_PASS`) — o
   jogador entra como membro de patente mínima.
4. Alternativa: um membro já dentro manda **convite** direto (`11
   CONSORTIA_INVITE`); o convidado aceita com `12 CONSORTIA_INVITE_PASS`.

### Doar e subir de nível
1. Membro clica **Doar**: `129` sub `6` (`CONSORTIA_RICHES_OFFER`) com a
   quantia de Ouro/Cupom. `sociedade/banco-riqueza.ts:17` desconta do jogador e soma em
   `player."Consortia".Riches` (ou campo equivalente), registrando quem doou
   quanto (usado em ranking de doadores).
2. Presidente/oficial com permissão clica **Subir nível**: `129` sub `21`
   (`CONSORTIA_LEVEL_UP`, `sociedade/evolucao.ts:21`) — confere se a Riqueza acumulada
   bate o requisito de `game."Consortia_Level"` pro próximo nível, desconta e
   sobe. O nível da guilda alimenta bônus coletivos (ex. `smithLevel * 10%`
   na chance de Fortalecer — ver [forja.md](./forja.md) seção 3).

### Chat e administração
1. `20 CONSORTIA_CHAT` retransmite a mensagem pra todos os membros online
   (bloqueado se o remetente estiver banido do chat via `16
   CONSORTIA_BANCHAT_UPDATE`).
2. Presidente muda patente de um membro: `129` sub `18`
   (`CONSORTIA_USER_GRADE_UPDATE`). Remove membro: `9 CONSORTIA_DUTY_DELETE`.
   Transfere presidência: `19 CONSORTIA_CHAIRMAN_CHAHGE`.

### 23 DONATE — doar Medalha (design próprio, detalhe em `research/qa/feature-designs.md`)
O handler original `Donate.cs` nunca teve lógica (só `Console.WriteLine`). Achado na
investigação: o cliente TEM um botão de doar (`DonateFrame.as`,
`EquipType.MEDAL = 11408` fixo), mas está comentado no build atual
(`ConsortiaMyTaskFinishItem.__donateClick` redireciona pro doar-Riqueza em vez de abrir
o `DonateFrame`). O port implementa o caminho que o botão original fazia: só reage a
`itemType === 11408` (Medalha) — outro tipo é lido (pra não desalinhar o stream) e
ignorado, igual ao `Console.WriteLine`. Remove a Medalha da `PropBag` e alimenta a
MESMA condição de missão tipo 5 "doar" (`ConsortiaMgr.onDonate`, hoje só alimentada
pelo doar-Riqueza do sub 6) — um segundo caminho pra mesma meta de clã.

### 25 POLL_CANDIDATE — votar "Membro da Semana" (design próprio)
Sem handler C# nem uso conhecido do cliente. Virou uma votação social semanal: cada
membro vota em 1 colega do mesmo clã (pode trocar o voto durante a semana,
`weekKey()`), apurado no mesmo gancho `weeklyReset` (`eventos/agendador.ts`) que já
zera Riqueza/Honra semanal — quem tiver mais votos ganha 500 Ouro + aviso no chat do
clã. Zero custo pra votar, zero risco de economia.

## 4. Quero mudar…
- **Requisito de Riqueza/bônus por nível da guilda**: tabela
  `game."Consortia_Level"` (coluna por nível: Riqueza necessária, bônus) — sem
  recurso admin dedicado ainda, editar via SQL ou criar `ResourceDef`.
- **Recompensa/condição de missão de guilda**: `game."Consortia_TaskConfig"`
  (condição) + `game."Consortia_TaskAward"` (prêmio).
- **Preço dos emblemas**: `game."Consortia_Badge"`.
- **Custo de fundar sociedade**: constante lida dentro de `createConsortia()`
  (`sociedade/criar.ts:23`) — ler o corpo da função pro valor exato/config atual.
- **Prêmio/custo do `23 DONATE`/`25 POLL_CANDIDATE`/Semana da Sociedade**: pools e
  valores em `app."ScheduledEvents"` (`guildweek`, poll sem pool — valor fixo 500 Ouro
  no código de `votacao.ts`). Detalhe em `research/qa/feature-designs.md`.
- **"Semana da Sociedade" (145 ACTIVITY_SYSTEM sub 7-13)**: ver `semana-da-sociedade.ts`
  (design próprio, não é sub de `129 CONSORTIA_CMD` — pacote 145 compartilhado com
  `eventos/caminho-da-luz.ts`).

## 5. Testes
- `apps/game/test/consortia.test.ts`:
  - `describe("consortia rules (procedures re-implemented)")` — regras puras
    (patente, permissão).
  - `describe("129 CONSORTIA_CMD (end to end)")` — fluxo completo: criar,
    pedir entrada, aceitar, promover, doar, convidar, chat (inclui a
    assertiva do `23 DONATE` com `itemType` ≠ Medalha como no-op real).
  - `describe("23 DONATE (Medalha real, design próprio)")` — doa Medalha de
    verdade, remove da bolsa, rejeita sem saldo.
  - `describe("25 POLL_CANDIDATE (votar candidato, design próprio)")` — vota,
    rejeita voto em si mesmo, apura no fim de semana.
  - `describe("145 ACTIVITY_SYSTEM sub 7-13 (Semana da Sociedade, design próprio)")`
    — entra na janela, doa pro livro de pontos, ranking atualiza, valida
    múltiplo de 10 por slot.
- Status: **OK**. Roteador `129 CONSORTIA_CMD` inteiro implementado e testado;
  `23 DONATE`/`25 POLL_CANDIDATE` eram dead code no C# original (`research/qa/
  port-F.md`) e agora têm design próprio implementado e testado — detalhe em
  `research/qa/feature-designs.md`.