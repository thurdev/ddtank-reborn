# Backlog (feedback do usuário jogando)

Ordem de execução: PvE (em andamento) → sociedade/GvG → eventos → hall da fama/laboratório/escola/spa → PT-BR completo → redesign.

## Bugs reportados
- [em PvE] Entrar na sala demora (tela preta longa antes de aparecer).
- [em PvE] Não consegue criar sala pelo cliente.
- [feito, QA-MATRIX] Ferreiro: não consegue fortalecer (level up) arma/chapéu com pedras de fortalecimento nível 4/5 — portar strengthen/compose/fusion/refine completos (15 handlers, spec 02-systems.md).
- [feito, QA-MATRIX] Cálculo de FC (poder de combate / FightPower) não funciona — portar fórmula completa (atributos base + equipamentos + fortalecimento + gemas + cartas + pets + suits + totens).
- [feito, QA-MATRIX] Abrir/usar item no inventário não funciona (caixas, poções, itens de uso).
- [feito, QA-MATRIX — saldo não atualizava: pacote 38 sem petScore] Gastar dinheiro na loja — verificar fluxo completo (cupom/ouro/medalha, saldo atualiza, item chega na bolsa).

## Método: QA completo (pedido do usuário)
Revisar TODAS as features do básico ao avançado, testando cada botão no cliente real e garantindo o fluxo completo.
Ferramenta: `docs/QA-MATRIX.md` — matriz gerada do cliente (cada tela/botão do AS3 `Source Flash/src`) × pacotes do servidor (spec 01-packet-handlers.md),
com status (ok / quebrado / não implementado) e evidência (screenshot). Cada lote de agente pega uma área da matriz, implementa, testa no cliente e marca.

## Feedback 2026-10-02 (tarde) — "o básico ainda não funciona 100%"
- [lote combate/pets/cartas] Ao terminar instância (PvE) trava na tela das cartas.
- [lote combate/pets/cartas] Popup de hover do item (tip) não aparece — armas, roupas, itens com atributos; não dá pra ver fortalecimento, pedras aplicadas, atributos.
- [parcial, varredura do básico pt.1 2026-10-02] Comprar itens na loja meio bugado (testar todas as abas, moedas, presentes, carrinho, quantidades/validade). Verificado por código+testes (`test/handlers.test.ts` "shop"): preço por tipo (gold/money/offer/giftToken/petScore/score/dmgScore), tiers A/B/C, duração (ValidDate dias) vs quantidade (Count) por BuyType, carrinho multi-linha (cobra e entrega tudo, sem falha parcial), saldo (pacote 38) já tinha sido corrigido. **Achado**: presente para amigo (221 USER_SEND_GIFTS, charm gift) não está registrado em nenhum handler — falta implementar (spec 01 §2:95). Faltou testar no cliente real (Ruffle) clicando cada aba/moeda.
- [feito, varredura do básico pt.1 2026-10-02] Item de troca de sexo não funciona — handler 252 USE_CHANGE_SEX (item 11569) não estava registrado em nenhum lugar; portado de `ChangeSexHandler.cs` (`apps/game/src/handlers/items.ts`): troca Sex, desequipa itens agora inválidos por NeedSex (gender-locked), consome o item, divórcio best-effort se casado. Typecheck ok; não testado clicando no cliente real (Flash/Ruffle), só por inspeção do fluxo de packets do AS3 (`BagView.as`: não há listener para resposta 252 nesta build, então só a mensagem de chat + sync normal da bolsa é necessária).
- [lote combate/pets/cartas] Comprar VIP não funciona.
- [lote combate/pets/cartas] Treino de prática não funciona — é a 2ª aba da bolsa: usar poção de treino para upar HP/ataque/defesa/agilidade/sorte (player."Sys_Users_Texp").
- [feito, varredura do básico pt.1 2026-10-02] Dar claim de algumas missões não funciona — `QuestInventory.finish` (`apps/game/src/game/quests.ts`) derrubava silenciosamente duas recompensas: RewardRiches (missões de guild) e RewardBuffID/RewardBuffDate (buff por tempo); ambas portadas (QuestInventory.cs:402-451). Testado com a missão real 640 ("Kèn triệu tập 1", guild + repetível) via `test/quests.test.ts`. Condições em si (grade, kills, jogos, compra, item, direct, PvE-mission) já funcionavam; 81/413 missões elegíveis nível ≤12 dependem de um tipo de condição não portado (pets/farm/casamento/outros sistemas já rastreados como "não iniciado" em outras seções deste backlog) — não é regressão do básico, é escopo de outro lote.
- [próximo lote: varredura do básico] Revisar TODO o básico: bolsa, equipar/desequipar, loja, ferreiro, tooltips, personagem, missões, correio, amigos, chat, salas — clicar cada botão como jogador, matriz QA linha a linha, nada fica "parcial".
- [lote combate/pets/cartas] Auras de fortalecimento: arma/roupa/chapéu a partir de +5 (tiers ~+5, +9, +12) mostram aura no personagem; item dourado (pedra de dourar) tem efeito dourado; o sprite da ARMA muda de design nesses tiers. Verificar campos enviados (strengthen/isGold no estilo/equip) e arquivos de efeito no pack.

## Lote combate/pets/cartas — status (2026-10-02)

Evidências: `research/e2e/batch4/`. Testes: `apps/game/test/pets-cards-vip.test.ts`, `packages/fight/test/pve-cards.test.ts`.

**Feito e verificado no cliente**
- Tooltip de itens (armas/roupas): crash `GoodTip.createMainProperty` (foreItems[1] = GhostStarContainer ausente no coreI.xml 4.1). Corrigido com overlay `apps/api/assets/flash/ui/vietnam/xml/xml.png` (coreI.xml com `ddt.view.tips.GhostStarContainer`), servido antes do FLASH_DIR. — 03-tip-weapon.png
- VIP: compra/renovação 92 (preço do cartão 11992, Xu debitado, nível por VIPExpForEachLv, expiração) e cartão VIP (183/P1 23); Sys_VIP_Info salvo; caixa VIP diária fecha o pop-up (CanTakeVipReward). — 16-vip-buy*.png, 15-vipcard.png
- Treino (Tu luyện, 99 TEXP): poção na StoreBag[0] → exp do atributo → nível → stats/FC. Corrigido também o split de pilha para outra bolsa (49). — 17-texp-done.png
- Auras de reforço: Nimbus (GetUserNimbus: +5/+9/+12/+15, dourado = 5) calculado em recalcStats; aura circular aparece com arma/chapéu +12 (arquivos `image/equip/circlelight|sinplelight/*.swf` existem em _assets/merged). — 30-aura-bag.png
- Pets: chocar ovo (68/2), lista (68/1 no login e sob pedido), pet de batalha (68/17, segue no salão), alimentar (68/4), renomear/soltar/skill (68/9/8/7) no servidor. — 07-hatch.png, 08-pet-bag.png, 34-reload.png
- Cartas: bolsa de cartas (216 no login), abrir caixa de cartas (216/2), equipar (216/0, FC sobe), upgrade (216/3). — 11/12/13/14-*.png
- Combate PvP: props 1/2/3 (+ataque/triplo), tiro, vitória e volta à sala. — 20-props.png, 22-shot2.png, 25-pvp-end.png

**Feito, verificado só por testes/log (não no cliente)**
- Base attack/defence reais (stats.ts) no spec da luta; caixas de drop na batalha (Drop_Condiction tipo 2, coleta por tiro → 49 + item na FightBag/TempBag, 53 ao sumir); movimento fantasma (GHOST_TARGET → MOVESTART tipo 2, caixas-fantasma = psychic); props de aliado morto (place −1, custo psychic, efeito no atirador atual); 10015/10016/10020/10022/cat.17, Property6 encerra turno; healstone (slot 18); punição de fuga (−grade×12 GP, −5/−15 offer); skill de pet em combate (144: MP, cooldown, NewBallID) + pet no GAME_CREATE/GAME_LOAD; fome do pet por partida.
- PvE cartas: última missão vencida = 2 cartas (PVEGame.cs:798, antes 0); TAKE_CARD(100) do cronômetro sem escolhas restantes agora responde SHOW_CARDS (89) para o quadro fechar (desvio). Ainda **não reproduzido em vitória no cliente** depois da correção (as partidas de teste perderam).

**Não iniciado / faltando**
- Pets: adoção (5/6), reverter (18), equipamento de pet (20/21), estrela/evolução (22/23), comer pets (33); exp de pet só por comida (como o original).
- Cartas: reset de propriedades (196), Card_Buff/efeitos de conjunto em combate.
- Efeitos de skills de pet (Pet_Skill_Element) e de equipamentos/gemas/guilda em combate (só stats).
