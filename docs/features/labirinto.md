# Labirinto

## 1. O que é no jogo
Minigame separado da masmorra PvE normal ([pve-masmorras.md](./pve-masmorras.md)):
o jogador sobe "andares" do Labirinto lutando, acumula EXP/moeda, e pode:
- **Dobrar recompensa** (consome 1 item "Pergaminho"/`TemplateID` 11916).
- **Atualizar** (ver quanto tempo falta pra "limpar" os andares pendentes).
- **Limpar andares** (`Clean out`): gasta Cupom de presente pra resolver
  instantaneamente os andares que faltam, sem lutar.
- **Acelerar a limpeza** (`Speeded up clean out`): paga ouro por minuto pra
  terminar a limpeza na hora.
- **Reiniciar** o Labirinto do andar 1.
- **Tentar de novo** (`Try again`): depois de perder, paga ouro pra continuar.
- Também tem uma **loja própria** (`labyrinth/view/LabyrinthShopItem.as`) —
  mesmo fluxo de compra da [loja.md](./loja.md) (pacote `44 BUY_GOODS`), não
  documentado de novo aqui.

> Importante: a parte "subir de andar lutando contra NPC" ainda **não está
> ligada a uma sala PvE real** — ver seção 5. O que existe hoje é só a camada
> administrativa/econômica (dobrar prêmio, limpar, acelerar, tentar de novo).

## 2. Onde fica no código
| Ação | Cliente (AS3) | Pacote | Servidor TS | C# original | Tabelas |
|---|---|---|---|---|---|
| Entrar na tela do Labirinto | `labyrinth/LabyrinthManager.as`, `labyrinth/view/LabyrinthFrame.as` | 94 GAME_ROOM | [`rr`](../../apps/game/src/handlers/rooms.ts#L151) `handlers/rooms.ts:151` | `GameRoomHandler.cs` | — |
| Dobrar recompensa / atualizar / limpar / acelerar / reiniciar / tentar de novo | `labyrinth/LabyrinthManager.as` (`labyrinthDouble`, `labyrinthRequestUpdate`, `labyrinthCleanOut`/`labyrinthStopCleanOut`/`labyrinthSpeededUpCleanOut`/`labyrinthCleanOutTimerComplete`), `labyrinth/view/LabyrinthFrame.as`/`CleanOutFrame.as` | 131 LABYRINTH (sub 1/2/3/4/5/6/9) | [`labyrinthHandler`](../../apps/game/src/handlers/eventos/labirinto.ts#L67) `handlers/eventos/labirinto.ts:67`, registrado `"partial"` em `eventos/index.ts:76` | `LabyrinthHandler.cs` | `player."Sys_Users_Labyrinth"` |
| Comprar na loja do Labirinto | `labyrinth/view/LabyrinthShopItem.as` | 44 BUY_GOODS | mesmo fluxo de [loja.md](./loja.md) | — | `game."Shop_Goods"` |
| Convidar amigo de dentro do Labirinto | `labyrinth/view/CleanOutFrame.as` | 160 IM_CMD | [`im`](../../apps/game/src/handlers/social.ts#L115) `handlers/social.ts:115` | `IMHandler.cs` | — |

## 3. Fluxo passo a passo
1. Cliente manda `131 LABYRINTH` com um sub-código no início (`pkt.readInt()`).
   `labyrinthHandler` (`labirinto.ts:67`) primeiro confere se o evento
   `"labyrinth"` está habilitado (`isOpen`, config do admin) e carrega a linha
   do jogador em `player."Sys_Users_Labyrinth"` (`loadLabyrinth`, `:22`) —
   cria uma linha nova (andar 1, sem progresso) se não existir.
2. Se a data mudou desde o último acesso (`LastDate`), reseta o dia:
   `completeChallenge=true`, `accumulateExp=0`, `currentFloor=1` etc
   (`labirinto.ts:71-73`).
3. Executa o sub-código (switch em `:493-541`):
   - **sub 1 (dobrar)**: consome item `11916` da bolsa de props, liga
     `isDoubleAward`.
   - **sub 2 (atualizar)**: calcula `remainTime` como `2 min × andares
     pendentes` (`currentFloor..myProgress`).
   - **sub 3 (limpar)**: cobre `cleanOutGiftToken` cupons, chama
     `settleCleanOut` (`:469`) que soma EXP (`660 + 690×(andar-1)`, dobrado se
     `isDoubleAward`) e moeda forte (`10×andar`, também dobrado) de cada andar
     pendente, soma em `p.addGP`/`p.addHardCurrency`.
   - **sub 4 (acelerar)**: cobra `pricePerMin × minutos restantes` em ouro e
     chama `settleCleanOut` igual ao sub 3.
   - **sub 5 (parar limpeza)**: só desliga `isCleanOut`.
   - **sub 6 (reiniciar)**: se `tryAgainComplete`, volta pro andar 1.
   - **sub 9 (tentar de novo)**: cobra `labyrinthTryAgainMoney` (`:462`, preço
     "grande" se está exatamente no último andar liberado, senão "pequeno")
     em ouro.
4. Salva a linha (`saveLabyrinth`, `:449`) e responde `131` com o estado
   completo (`labyrinthUpdatePkt`, `:445`).

## 4. Quero mudar…
- **Preços** (`priceBig`, `priceSmall` de "tentar de novo"; `cleanOutGiftToken`;
  `pricePerMin` de acelerar): JSON de parâmetros do evento `labyrinth` no
  admin — `apps/admin/src/resources/event-systems.ts` (recurso de
  `ScheduledEvents`, hint de exemplo na linha 40:
  `labyrinth: {"priceBig":5000,"priceSmall":1000,"cleanOutGiftToken":100,"pricePerMin":10}`).
  Sem editar nada no admin, os valores padrão (mesmos do exemplo acima) ficam
  hard-coded em `labirinto.ts:45-46,90,101` via `num(ctx, "labyrinth",
  <chave>, <padrão>)`.
- **EXP/moeda por andar limpo**: fórmula fixa em `settleCleanOut`
  (`labirinto.ts:51-64`): `660 + 690 × (andar-1)` EXP e `10 × andar` moeda
  forte, dobrados se `isDoubleAward`. Não é tabela — é código; mudar exige
  editar a função e citar `LabyrinthHandler.cs` original.
- **Desligar o Labirinto temporariamente**: no admin, editar o evento
  `labyrinth` com `"enabled": false` no JSON de parâmetros (fecha sem apagar o
  progresso dos jogadores) — ver `isOpen()` em `eventos/agendador.ts`.
- **Item que dobra a recompensa**: `TemplateID` 11916 está fixo no código
  (`labirinto.ts:78`); pra mudar qual item destrava o dobro, edite essa
  constante.

## 5. Testes + status
- `apps/game/test/activities.test.ts` → `describe("131 LABYRINTH economy")`
  cobre dobrar/limpar/acelerar/reiniciar/tentar de novo (a camada econômica).
- Status: **OK** a camada administrativa (dobrar prêmio, limpar andares,
  acelerar, reiniciar, tentar de novo, loja) — rota real, com teste.
  **Falta portar**: subir de andar *lutando* contra NPC de verdade. Hoje
  `myProgress` (quantos andares o jogador já venceu) só é lido, nunca
  incrementado por uma luta — não existe ainda uma sala PvE tipo "Labirinto"
  equivalente a `RoomType.Dungeon` (ver o cabeçalho de
  `handlers/eventos/labirinto.ts`: "`myProgress` ... tem nada a resolver até
  o tipo de sala PvE do Labirinto ser ligado"). Pra portar: criar um
  `RoomType` novo pro Labirinto (mesmo padrão de
  [pve-masmorras.md](./pve-masmorras.md) seção 2/3) que, ao vencer um andar,
  incremente `myProgress` nessa mesma tabela `player."Sys_Users_Labyrinth"`.
