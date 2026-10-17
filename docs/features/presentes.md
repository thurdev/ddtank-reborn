# Presentes

## 1. O que é no jogo
"Presentear" é mandar um item da Loja de presente pra outro jogador pelo nick (aba
Loja). Quem manda paga em Money; quem recebe ganha "Charme" (`charmGP`, usado no
sistema de Casamento/charme) proporcional ao item e recebe uma carta avisando. A aba
Presentes da Bolsa/Personagem lista todos os presentes já recebidos (somados por
item). No Reborn, mandar e listar presentes estão ambos **portados** (ver
`docs/plan/MIGRACAO-6600.md §4`: "Presentes" já era portável na 4.1, não depende do
6600).

## 2. Onde fica no código
| O que | Servidor TS | C# original | Tabelas |
|---|---|---|---|
| Mandar presente pra um amigo (Loja) | 221 USER_SEND_GIFTS | [`sendGift`](../../apps/game/src/handlers/loja/presentear.ts#L24) `handlers/loja/presentear.ts:24`, registro em `registerPresentear` | `UserSendGiftHandler.cs:12` | `player."Sys_Users_Gift"`, `player."User_Messages"` (carta), `Sys_Users_Detail.charmGP`/`.Money` |
| Listar presentes recebidos (Bolsa/Personagem) | 218 USER_GET_GIFTS | [`registerPresentesRecebidos`](../../apps/game/src/handlers/bolsa/presentes-recebidos.ts#L13) `handlers/bolsa/presentes-recebidos.ts:13` | `UserGetGiftHandler.cs` | `player."Sys_Users_Gift"` |
| Gravar o presente / somar Charme | [`addUserGift`](../../apps/game/src/db/social.ts) (`db/social.ts`), [`addCharmGP`](../../apps/game/src/db/characters.ts#L200) `db/characters.ts:200` | `SP_Users_Gift_Add`, `SP_Users_UpdateCharmGP` | `player."Sys_Users_Gift"`, `Sys_Users_Detail.charmGP` |
| Ler todos os presentes recebidos (soma por item) | [`getAllUserReceivedGifts`](../../apps/game/src/db/social.ts) `db/social.ts` | query equivalente em `UserGetGiftHandler.cs` | `player."Sys_Users_Gift"` |
| Carta avisando o destinatário | [`sendMail`](../../apps/game/src/db/social.ts) `db/social.ts` | `UserGiftSystem.MailTitle`, tipo 55 | `player."User_Messages"` |

## 3. Fluxo passo a passo
1. Jogador abre a Loja, escolhe um item presenteável (`Shop_Goods.AValue1 > 0`, ou
   seja, tem preço em Money pra presente), digita o nick do amigo e a quantidade:
   cliente manda `221 USER_SEND_GIFTS` (nick, `shopItemId`, `count`).
2. `sendGift()` confere: não presentear a si mesmo, `count` entre 1 e 9999, o item
   existe e é presenteável, o destinatário existe (online na memória ou carregado do
   banco pelo nick). Calcula `cost = AValue1 × count` em Money (cobrado de quem manda)
   e `charm = ItemTemplate.Property2 × count` (creditado em quem recebe).
3. Grava a linha do presente (`Sys_Users_Gift`), soma o Charme do destinatário
   **direto no banco** (`addCharmGP`, não espera o ciclo de save do jogador — funciona
   mesmo se o destinatário estiver offline) e manda a carta tipo 55.
4. Se o destinatário estiver online, atualiza `charmGP` dele em memória também
   (`online.info.charmGP += charm`) e manda `117`/`mailResponse` pra avisar em tempo
   real (sem precisar relogar pra ver o Charme ou a carta).
5. Quem recebeu abre a aba Presentes (Bolsa/Personagem): cliente manda
   `218 USER_GET_GIFTS` com o `userId` (o próprio ou de outra pessoa, pra ver o perfil
   dela); servidor soma todos os presentes já recebidos por `TemplateID` e devolve a
   lista + `charmGP` atual.

## 4. Quero mudar…
- **Quais itens da Loja são presenteáveis / preço em Money**: tabela
  `game."Shop_Goods"` campo `AValue1` (> 0 = presenteável, esse é o custo) — editável
  pelo recurso admin de itens (`apps/admin/src/resources/items.ts`) quando o item já
  está lá.
- **Quanto Charme cada item dá**: `ItemTemplate.Property2` (mesma tabela
  `Shop_Goods`) — multiplicado pela quantidade enviada.
- **Texto da carta**: chaves de idioma `UserGiftSystem.MailTitle` e
  `GoodsPresentHandler.Content`/`.NoUser`/`.NoMoney`/`.Success`
  (`apps/game/data/i18n/pt-BR/server-language.txt`).
- **Limite de quantidade por envio**: constante `9999` no topo de `sendGift()`
  (`handlers/loja/presentear.ts:29`), igual ao original.

## 5. Testes
- `apps/game/test/handlers.test.ts` — `221 USER_SEND_GIFTS`: cobra Money de quem
  manda, credita `charmGP` de quem recebe (online, atualizado em tempo real), grava a
  linha em `Sys_Users_Gift` e a carta em `User_Messages` tipo 55.
- `apps/game/test/handlers.test.ts` — `218 USER_GET_GIFTS`: manda o mesmo item de
  presente duas vezes e confere que a listagem soma num só `TemplateID`/`Count` (não
  duplica linha), junto com o `charmGP` atual.
- Status: **OK** — mandar presente (Money → Charme + carta) e listar presentes
  recebidos (somados por item) estão portados e testados.
