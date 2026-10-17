# Correio

## 1. O que é no jogo
Caixa de correio: ler cartas, resgatar os itens anexados (até 5 por carta), apagar
carta, marcar como lida, enviar carta (presente/texto) pra outro jogador. Também é
o destino automático de itens que não couberam na bolsa (ex. comprou mais do que
cabia — o excedente vai por carta).

## 2. Onde fica no código
Desde a refatoração de legibilidade, o módulo mora em
`apps/game/src/handlers/correio/` — um arquivo por ação, montado em `correio/index.ts`.

| Ação | Pacote | Servidor TS | C# original | Tabelas |
|---|---|---|---|---|
| Apagar carta | 112 DELETE_MAIL | [`deleteMail`](../../apps/game/src/handlers/correio/apagar.ts) `correio/apagar.ts` | `UserDeleteMailHandler.cs` | `player."Sys_Users_Mail"` |
| Resgatar anexo | 113 GET_MAIL_ATTACHMENT | [`getAttachment`](../../apps/game/src/handlers/correio/resgatar-anexo.ts) `correio/resgatar-anexo.ts` | `MailGetAttachHandler.cs` | `player."Sys_Users_Mail"`, `player."Sys_Users_Goods"` |
| Marcar lida / atualizar | 114 UPDATE_MAIL | [`updateMail`](../../apps/game/src/handlers/correio/marcar-lida.ts) `correio/marcar-lida.ts` | `UserUpdateMailHandler.cs` | `player."Sys_Users_Mail"` |
| Enviar carta | 116 SEND_MAIL | [`sendMailPacket`](../../apps/game/src/handlers/correio/enviar.ts) `correio/enviar.ts` | `UserSendMailHandler.cs` | `player."Sys_Users_Mail"` |
| Cancelar pagamento pendente anexado | 118 MAIL_CANCEL | [`mailCancel`](../../apps/game/src/handlers/correio/cancelar-pagamento.ts) `correio/cancelar-pagamento.ts` | `MailPaymentCancelHandler.cs` | `player."Sys_Users_Mail"` |
| `214 USER_RELOAD_GIFT` (pacote morto no original) | 214 | [`userReloadGift`](../../apps/game/src/handlers/correio/stubs.ts) `correio/stubs.ts` (stub) | — | — |
| Listar cartas (é HTTP, não pacote TCP) | `.ashx` `LoadUserMail`/`MailSenderList` | `apps/api/src/request/` | `Tank.Request/LoadUserMail.ashx` | `player."Sys_Users_Mail"` |
| Correio recebe item que não coube na bolsa | — (chamado internamente) | [`mailItems`](../../apps/game/src/handlers/bolsa/correio-excedente.ts#L23) `bolsa/correio-excedente.ts:23` | — | `player."Sys_Users_Mail"` |

## 3. Fluxo passo a passo (exemplo: resgatar anexo)
1. Cliente abre a lista de cartas via chamada HTTP (`.ashx`, não pacote de jogo —
   ver [COMO-FUNCIONA.md](./COMO-FUNCIONA.md) §3 "API HTTP pro cliente").
2. Jogador clica num anexo → cliente manda `113 GET_MAIL_ATTACHMENT` com o
   `MailID`/índice do anexo.
3. **Anti-duplicação**: o handler faz um `UPDATE` condicional que só limpa o anexo da
   carta **se ele ainda guardar aquele `ItemID`** antes de entregar o item — um pacote
   repetido/concorrente nunca consegue entregar a mesma linha duas vezes. Se o item
   não couber na bolsa, ele fica na carta (o C# original removia primeiro e podia
   perder o item — comportamento corrigido no Reborn).
4. Item entra na bolsa do jogador (via `PlayerInventory`), muda de slot → `64
   GRID_GOODS` pro cliente.

## 4. Quero mudar…
- **Quantos anexos por carta de "item excedente"**: `mailItems()` em
  `bolsa/correio-excedente.ts:23` manda em lotes de 5 (`type = 8`), constante no
  corpo da função.
- **Mensagem/assunto das cartas do sistema**: procurar a chamada específica de
  `sendMail`/`mailItems` na feature de origem (loja, forja, evento) — o texto do
  assunto é passado como argumento ali, não fica centralizado.
- **Transmissão em massa pro servidor todo**: `app."MailBroadcasts"` — editável via
  admin (`apps/admin/src/resources/system.tsx`, recurso `mail-broadcasts`).

## 5. Testes
- `apps/game/test/mail.test.ts` — `describe("mail (116/113/114/112)")`.
- `apps/game/test/persist-all.test.ts` — Correio (GET_MAIL_ATTACHMENT 113), `saveItem` imediato.
- Status: **OK** (112/113/114/116/118 implementados; `214 USER_RELOAD_GIFT` é stub confirmado morto no
  C# original, não lacuna).
