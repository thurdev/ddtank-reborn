# Leilão

## 1. O que é no jogo
Casa de leilão: colocar um item seu à venda (leilão ou compra direta), dar lance,
cancelar seu próprio leilão. A busca/listagem de leilões em andamento é por HTTP
(não pacote de jogo).

## 2. Onde fica no código
Desde a refatoração de legibilidade, o módulo mora em
`apps/game/src/handlers/leilao/` — um arquivo por ação, montado em `leilao/index.ts`.

| Ação | Pacote | Servidor TS | C# original | Tabelas |
|---|---|---|---|---|
| Colocar item à venda | 192 AUCTION_ADD | [`add`](../../apps/game/src/handlers/leilao/colocar-a-venda.ts#L13) `colocar-a-venda.ts:13` | `AuctionAddHandler.cs` | tabela de leilão (`player."Auction"`, ver `db/` do módulo) |
| Dar lance / comprar direto | 193 AUCTION_UPDATE | [`update`](../../apps/game/src/handlers/leilao/lance-comprar.ts#L14) `lance-comprar.ts:14` | `AuctionUpdateHandler.cs` | idem |
| Cancelar seu leilão | 194 AUCTION_DELETE | [`remove`](../../apps/game/src/handlers/leilao/cancelar.ts#L14) `cancelar.ts:14` | `AuctionDeleteHandler.cs` | idem |
| Varredura de expiração (sem tela, timer) | — | [`scanExpiredAuctions`](../../apps/game/src/handlers/leilao/expirar.ts#L11) `expirar.ts:11` | `SP_Auction_Scan` | idem |
| Listar/buscar leilões (é HTTP) | `.ashx` `AuctionPageList` | `apps/api/src/request/` | `Tank.Request/AuctionPageList.ashx` | idem |

## 3. Fluxo passo a passo (colocar à venda)
1. Jogador arrasta um item pra tela de leilão e define preço/duração.
2. Cliente manda `192 AUCTION_ADD`.
3. `add()` (`leilao/colocar-a-venda.ts:13`) cobra a **taxa de listagem em Ouro**: `needGold =
   max(1, preço * 0.03 * {1, 3, 6})`, onde o multiplicador depende da duração
   escolhida (curta/média/longa).
4. O item some da bolsa do jogador e entra na tabela de leilão; outros jogadores
   acham ele pela busca HTTP.
5. Quando alguém dá lance (`193 AUCTION_UPDATE`), o **lance em si é sempre cobrado em
   Cupom (`Money`)** — o C# original força `payType = 1` (Money) mesmo que o cliente
   mande outro tipo; o Reborn mantém esse comportamento de propósito (não é bug a
   corrigir, é fidelidade ao original).
6. Liquidação (quem ganhou, taxa cobrada do vendedor) é feita em
   `SP_Auction_Scan`-equivalente (ver `research/db/.../procedures`).

## 4. Quero mudar…
- **Taxa de listagem (% do preço)**: fórmula `needGold = max(1, price * 0.03 *
  {1,3,6})` dentro de `add()`, `apps/game/src/handlers/leilao/colocar-a-venda.ts`
  (buscar a constante `0.03` e o array de multiplicador por duração).
- **Moeda do lance**: hoje hardcoded em Cupom (Money) — ver comentário no topo de
  `leilao/comum.ts` ("o original hard-codes `payType = 1`"); mudar isso é uma mudança de
  **comportamento**, não um parâmetro simples.
- **Duração disponível pro leilão**: array de opções de duração em
  `leilao/colocar-a-venda.ts` (mesmo lugar que define o multiplicador de taxa).

## 5. Testes
- `apps/game/test/marriage-farm-auction.test.ts` — `describe("192/193/194 Auction")`.
- Status: **OK** (192/193/194 implementados, taxa em Ouro + lance em Money fiel ao
  original); listagem/busca HTTP não revisada aqui (ver [docs/API.md](../API.md)).
