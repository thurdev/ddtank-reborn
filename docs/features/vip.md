# VIP

## 1. O que é no jogo
Assinatura VIP (níveis 0-9, com `typeVIP` 1 normal / 2 "VIP maior" quando compra 3+
meses de uma vez). Dá acesso à caixa diária VIP, mais Texp por dia, e outros bônus
espalhados pelas outras features (ex. bônus de fortalecer). Comprado/renovado pela
tela do personagem ou usando uma carta VIP da bolsa.

## 2. Onde fica no código
| Ação | Pacote | Servidor TS | C# original | Tabelas |
|---|---|---|---|---|
| Comprar/renovar VIP (pra si ou de presente) | 92 VIP_RENEWAL | [`openVip`](../../apps/game/src/handlers/use.ts#L211) `use.ts:211`, registro `use.ts:271` | `OpenVipHandler.cs` | `Sys_Users_Detail` (`typeVIP`, `VIPLevel`, `VIPExp`, `VIPExpireDay`...) |
| Usar carta VIP da bolsa | 183 CARD_USE (case 23) | [`use.ts:166`](../../apps/game/src/handlers/use.ts#L166) | `CardUseHandler.cs` case 23 | `player."Sys_Users_Goods"` |
| Caixa diária VIP / login | 13 DAILY_AWARD sub 3 | [`dailyAward`](../../apps/game/src/handlers/eventos/recompensa-diaria.ts#L70) caso `3`, `recompensa-diaria.ts:70` | `DailyAwardHandler.cs` | `Sys_Users_Detail` |
| Regras puras de nível/expiração VIP | — | [`game/vip.ts`](../../apps/game/src/game/vip.ts) | `GamePlayer.cs:1270-1990, 3709-3770` | — |

## 3. Fluxo passo a passo
1. Cliente manda `92 VIP_RENEWAL` com `nick` (pode ser o próprio ou de um amigo, pra
   dar de presente) e `days`.
2. `openVip()` (`use.ts:211`) acha o item de preço VIP (`TemplateID` fixo `11992` na
   tabela `game."Shop_Goods"`), calcula o preço pros dias pedidos (`vipPrice`), confere
   ouro suficiente e nível máximo (9).
3. `applyVipDays()` (`game/vip.ts`) estende `VIPExpireDay` (soma a partir de agora se
   já expirou, ou a partir da data atual de expiração se ainda ativo —
   `renewalExpire()`). `setTypeVIP()` decide `typeVIP` 1 ou 2 (2 quando `days/31 >= 3`,
   ou se já era 2).
4. `addExpVip()` soma o valor gasto como XP de VIP e sobe `VIPLevel` (0-9) conforme a
   tabela `vipExpTable()`.
5. Responde `Out.openVip(...)` pro cliente atualizar a UI; `updateProperties()`
   repropaga bônus de atributo se houver.

## 4. Quero mudar…
- **XP necessário por nível VIP (1→9)**: chave de config `VIPExpForEachLv` em
  `Server_Config` (default `"1|300|700|1400|2500|4100|6100|8500|11300"`, lida por
  `vipExpTable()` em `apps/game/src/game/vip.ts`). Editar essa linha de config no
  banco (tabela de config do servidor) muda a curva sem tocar em código.
- **Preço por dia de VIP**: entrada `TemplateID 11992` em `game."Shop_Goods"` — editar
  pelo admin em **Loja** (`/items` ou `/shop`, procurar esse TemplateID) se o recurso
  cobrir, senão via SQL.
- **Regra de quando vira "VIP maior" (`typeVIP 2`)**: `setTypeVIP()` em
  `apps/game/src/game/vip.ts` — hoje é `days/31 >= 3` (3 meses de uma vez).
- **Nível máximo (9)**: checagem hardcoded em `openVip()` (`use.ts:217`,
  `p.info.VIPLevel === 9`) e em `addExpVip()` (`game/vip.ts`).

## 5. Testes
- `apps/game/test/pets-cards-vip.test.ts` — `describe("VIP")`.
- Status: **OK**.
