# Cartas

## 1. O que é no jogo
Bolsa de cartas de buff (ataque/defesa/agilidade/sorte...): equipar/mover entre
slots principal e reserva, organizar, resetar atributo de uma carta (reroll pago),
e evoluir ("upgrade") uma carta gastando cópias/dinheiro.

## 2. Onde fica no código
| Ação (sub de `216 CARDS_DATA`) | Servidor TS | C# original | Tabelas |
|---|---|---|---|
| Roteador geral | [`cardCommand`](../../apps/game/src/handlers/pets.ts#L357) `handlers/pets.ts:357`, registro `:413` | `CardDataHandler.cs` | `player."Sys_Users_Card"` |
| Mover carta | sub 0 | `pets.ts:362` | — | — |
| Abrir slot reserva (vice) | sub 1 | `pets.ts:368` | `CardDataHandler case 1` | — |
| Abrir caixa de carta | sub 2 | `pets.ts:375` | — | `game."Card_Group"`/`game."Card_Info"` |
| Upgrade (evoluir carta) | sub 3 | `pets.ts:392`, lógica em [`upgradeCard`](../../apps/game/src/game/cards.ts#L160) `game/cards.ts:160` | — | `game."CardUpdateCondition"`, `game."CardUpdateInfo"` |
| Ordenar cartas | sub 4 | — | — | — |
| Primeira carga de cartas | sub 5 | — | — | — |
| Resetar atributo (reroll) | 196 CARD_RESET (pacote próprio, não sub de 216) | [`items.ts:717`](../../apps/game/src/handlers/items.ts#L717) | `CardResetHandler.cs:548` | `game."CardUpdateCondition"` |
| Lógica pura de rolagem/valor pequeno | — | [`nextSmallValue`](../../apps/game/src/game/cards.ts#L17), [`copyProp`](../../apps/game/src/game/cards.ts#L41) | — | — |

## 3. Fluxo passo a passo (resetar atributo de uma carta — 2 passos)
1. Jogador clica "prévia" (modo `0`): `196 CARD_RESET` com `mode=0`. O servidor rola
   os 4 deltas possíveis (`nextSmallValue` por atributo) usando o custo de
   `CardUpdateCondition` (cópias da carta ou Money) e **guarda o resultado em memória**
   (`cardResetTemp`, `WeakMap` por jogador) sem aplicar ainda — o cliente só mostra o
   preview.
2. Jogador confirma: `196 CARD_RESET` de novo com outro `mode`. O servidor aplica os
   deltas guardados nos campos `*Reset` da carta; se uma cópia dessa carta estiver
   equipada, espelha o novo atributo nela também (`CopyProp`/`copyProp()`).
3. Cartas na zona de slots equipados (`slot < 5`) não podem ser resetadas direto —
   só a cópia na bolsa.

## 4. Quero mudar…
- **Custo do reset (cópias/Money) por nível**: tabela `game."CardUpdateCondition"`.
- **Faixa de valores que cada reroll pode sortear**: `nextSmallValue(min, max, rnd)`
  em `apps/game/src/game/cards.ts:17` — quem chama define `min`/`max` por atributo.
- **Requisitos/recompensa de upgrade (evoluir carta)**: `upgradeCard()`
  (`game/cards.ts:160`) + tabela `game."CardUpdateInfo"`.
- **O que cada caixa de carta pode dar**: tabelas `game."Card_Group"`/`game."Card_Info"`.

## 5. Testes
- `apps/game/test/pets-cards-vip.test.ts` — `describe("cards (CardDataHandler)")`.
- Status: **OK** (subs principais de `216 CARDS_DATA` e `196 CARD_RESET` implementados).
