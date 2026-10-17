# Totem

## 1. O que é no jogo
Um "totem" é um bônus passivo permanente de atributo (ataque/defesa/agilidade/
sorte/vida/dano/guarda) que o jogador ganha conforme sobe de totem, pagando Honra
(sistema de honra, ícone `HonorUpIcon` no hall). No Reborn, tanto o **efeito do
totem no atributo** quanto a **ação de subir/trocar de totem pela UI já estão
portados** (ver `research/qa/port-B.md`).

## 2. Onde fica no código
| O que | Servidor TS | C# original | Tabelas |
|---|---|---|---|
| Efeito do totem no atributo total | [`getTotemProp`](../../apps/game/src/game/stats.ts#L98) `game/stats.ts:98`, usado em `:169,183,272-274` | `TotemMgr.GetTotemProp` (`TotemMgr.cs:104`) | `game."Totem_Info"`, `game."Totem_Honor_Template"` |
| Subir de totem (gasta Honra) | 136 TOTEM | [`totemOpenOne`](../../apps/game/src/handlers/progressao/totem.ts#L54) `handlers/progressao/totem.ts:54`, registro em `progressao/index.ts` | `OpenOneTotemHandler.cs:14-68` | `Sys_Users_Detail.totemId`, `Sys_Users_Detail.myHonor` |
| Comprar/ganhar pontos de Honra | 96 HONOR_UP_COUNT | [`honorUp`](../../apps/game/src/handlers/progressao/honra.ts#L23) `handlers/progressao/honra.ts:23`, registro em `progressao/index.ts` | `HonorUpHandler.cs:13-55` | `Sys_Users_Detail.MaxBuyHonor`, `.myHonor`, `.Money` |
| Setar o totem atual do jogador | [`addTotem`](../../apps/game/src/game/player.ts#L326) `game/player.ts:326` | `GamePlayer.AddTotem` (`GamePlayer.cs:6013`) | `Sys_Users_Detail.totemId` |
| Cache dos templates de totem | [`templates.ts:408-416`](../../apps/game/src/db/templates.ts#L408) | `TotemMgr`/`TotemHonorMgr` | `game."Totem_Info"`, `game."Totem_Honor_Template"` |
| Pacote de atualização (servidor→cliente) | 136 TOTEM | [`out.ts:747`](../../apps/game/src/packets/out.ts#L747) `SendPlayerRefreshTotem` | — |

## 3. Fluxo passo a passo
0. Requisito de nível 20 (`OpenOneTotemHandler.cs:19-22`): bypassado quando
   `cfg.ALL_OPEN=true` (QA dev switch, ver `config.ts`), igual aos outros gates que ele
   cobre — pra testar totem sem precisar upar até 20.
1. Jogador clica no ícone de Honra/Totem (`HonorUpIcon`) e confirma subir de totem:
   cliente manda `136 TOTEM` (sem corpo — o pacote não lê nada extra).
2. `totemOpenOne()` (`progressao/totem.ts:54`) cobra Honra e Money, e sobe `totemId` via
   `addTotem()`. **Bug original preservado de propósito**: `OpenOneTotemHandler.cs:49`
   tem um `;` solto depois do `if (client.Player.MoneyDirect(...))`, fazendo o corpo
   do `if` rodar sempre — na prática o totem sobe e a Honra é gasta mesmo sem Money
   suficiente (só o Money não é descontado nesse caso). Reproduzido tal e qual, com
   comentário grande explicando — o dono pode decidir corrigir trocando uma linha.
3. `getTotemProp(totems, totemId, campo)` soma os bônus de **todos os totens de
   `10001` até o `totemId` atual** (`TotemMgr.GetTotemProp`: é cumulativo, não só o
   nível atual) — ver `stats.ts:97-98`. Esse valor entra direto no cálculo de
   ataque/defesa/agilidade/sorte/vida/dano/guarda (`updatePlayerProperties` → `stats.ts`).
4. `96 HONOR_UP_COUNT` tipo 2 (`honorUp()`, `progressao/honra.ts:23`) deixa o jogador
   comprar mais Honra gastando Money, respeitando o limite `MaxBuyHonor`.

## 4. Quero mudar…
- **Bônus de atributo por totem**: tabela `game."Totem_Info"` (campos `AddAttack`,
  `AddDefence`, `AddAgility`, `AddLuck`, `AddBlood`, `AddDamage`, `AddGuard`) — sem
  recurso admin dedicado ainda.
- **Custo de Honra por nível de totem**: `game."Totem_Honor_Template"` — idem, ainda
  sem admin.
- **Corrigir o bug do `;` solto** (totem sobe sem Money suficiente): remover o `;`
  equivalente na lógica de `totemOpenOne()` (`progressao/totem.ts:54-76`, comentário
  no código indica a linha exata).
- **Limite de Honra comprável**: `Sys_Users_Detail.MaxBuyHonor`, ajustado por
  `honorUp()` (`progressao/honra.ts:23`).

## 5. Testes
- `apps/game/test/progression.test.ts` — cobre `18 GET_PLAYER_CARD`, `402`
  AVATAR_COLLECTION e os pacotes sem handler C# (ver `research/qa/port-B.md`).
- `apps/game/test/persist-all.test.ts` (describe "Progressão gravada pelo
  protocolo") — cobre persistência de `136 TOTEM` e `96 HONOR_UP_COUNT` tipo 2.
- Status: **OK** — subir de totem, comprar Honra e o efeito matemático no
  atributo estão todos portados e testados.
