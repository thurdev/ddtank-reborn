# Amigos / chat privado / convidar amigos

## 1. O que é no jogo
Lista de amigos (adicionar, remover, bloquear, ver status online/ausente), chat
privado 1-a-1, aniversário de amigo, e a tela **Convidar amigos** (sistema de
indicação: convida pelo link/nick, ganha ouro por tier conforme quantos amigos
entraram).

## 2. Onde fica no código
`apps/game/src/handlers/amigos/` com 1 arquivo por ação do jogo (nome = o que o
jogador vê na tela): `adicionar-amigo.ts`, `remover-amigo.ts`, `status-amigo.ts`,
`chat-privado.ts`, `convidar-amigo.ts`, `aniversario.ts`, `mural-social.ts`,
`index.ts` (roteador + registro).

| Ação | Pacote | Servidor TS | C# original | Tabelas |
|---|---|---|---|---|
| Adicionar amigo / bloquear | 160 IM_CMD sub 160 FRIEND_ADD | [`addFriendOrBlock`](../../apps/game/src/handlers/amigos/adicionar-amigo.ts#L22) `amigos/adicionar-amigo.ts:22` | `IMHandler.cs` | `player."Sys_Users_Friends"` (via `db/social.ts`) |
| Remover amigo | 160 IM_CMD sub 161 FRIEND_REMOVE | [`removeFriend`](../../apps/game/src/handlers/amigos/remover-amigo.ts#L15) `amigos/remover-amigo.ts:15` | `IMHandler.cs` | `player."Sys_Users_Friends"` |
| Status online/ausente/invisível | 160 IM_CMD sub 165 FRIEND_STATE | [`changeFriendState`](../../apps/game/src/handlers/amigos/status-amigo.ts#L17) `amigos/status-amigo.ts:17` | `IMHandler.cs` | — |
| Chat privado 1-a-1 (+ 2 subs mortos) | 160 IM_CMD sub 51 ONE_ON_ONE_TALK | [`oneOnOneTalk`](../../apps/game/src/handlers/amigos/chat-privado.ts#L23) `amigos/chat-privado.ts:23` | `IMHandler.cs` | — |
| Convidar amigos (abrir tela, registrar convite, reivindicar recompensa) | 107 INVITE_FRIEND (sub-roteador) | [`inviteRouter`](../../apps/game/src/handlers/amigos/convidar-amigo.ts#L44) `amigos/convidar-amigo.ts:44` | — (sem lógica no C# 4.1 original) | `app."InviteFriends"` |
| Aniversário de amigo | 223 FRIEND_BRITHDAY | [`friendBirthday`](../../apps/game/src/handlers/amigos/aniversario.ts#L19) `amigos/aniversario.ts:19` | — | `player."Sys_Users_Friends"` |
| Mural/SNS (resquício Facebook) | 40 SNS_MSG_RECEIVE | [`snsMsgReceive`](../../apps/game/src/handlers/amigos/mural-social.ts#L16) `amigos/mural-social.ts:16` | — | — |
| Roteador 160 IM_CMD + registro geral | — | [`imRouter`](../../apps/game/src/handlers/amigos/index.ts#L40)/[`registerAmigos`](../../apps/game/src/handlers/amigos/index.ts#L58) `amigos/index.ts:40,58` | — | — |

> O C# base (`vendor/DDTank41`) só define os **enums** desses pacotes (resquício da
> era "integração com Facebook" do jogo original) — não tem handler de servidor real
> pra nenhum deles. Tudo em `amigos/` é implementação **Reborn nova**, espelhando o
> formato de pacote que o cliente Flash já sabe ler (lido direto no `.as` quando o
> comportamento exato não é óbvio). Ver cabeçalho de `amigos/index.ts`.

## 3. Fluxo passo a passo (exemplo: convidar amigo)
1. Jogador abre a tela (cliente manda `107` sub `2 INVITE_FRIEND_OPENVIEW`) →
   servidor devolve quantos convites já tem.
2. Um amigo nota entra usando o link/nick de indicação → o convite é registrado em
   `app."InviteFriends"`.
3. Jogador clica reivindicar tier N → servidor confere `INVITE_TIERS[i]` convites
   mínimos, paga `INVITE_GOLD[i]` ouro, marca o tier como reivindicado (bitmap de 4
   flags, `inviteFlags()` em `amigos/convidar-amigo.ts:35`), manda de volta pro cliente.

## 4. Quero mudar…
- **Quantos convites por tier e quanto ouro cada um paga**: constantes
  `INVITE_TIERS = [1, 3, 5, 10]` e `INVITE_GOLD = [1000, 3000, 6000, 15000]` em
  `apps/game/src/handlers/amigos/convidar-amigo.ts:26-27` (índice 0 = tier 1, etc.).
- **Limite de amigos / bloqueados**: ver constantes em `db/social.ts` (buscar por
  `MAX_FRIENDS` ou limite fixo no `IMHandler` original).

## 5. Testes
- `apps/game/test/social-invite.test.ts` — `describe("107 INVITE_FRIEND (Reborn impl — 4.1 base has no server logic)")`, `describe("40 SNS_MSG_RECEIVE + 223 FRIEND_BRITHDAY")`.
- Status: **OK** (implementação Reborn completa, já que o original não tinha nada pra espelhar — comportamento é o que a equipe definiu, não "porte fiel").
