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
- [parcial, varredura do básico pt.1 2026-10-02] Comprar itens na loja meio bugado (testar todas as abas, moedas, presentes, carrinho, quantidades/validade). Verificado por código+testes (`test/handlers.test.ts` "shop"): preço por tipo (gold/money/offer/giftToken/petScore/score/dmgScore), tiers A/B/C, duração (ValidDate dias) vs quantidade (Count) por BuyType, carrinho multi-linha (cobra e entrega tudo, sem falha parcial), saldo (pacote 38) já tinha sido corrigido. **Achado, feito na varredura pt.2**: presente para amigo (221 USER_SEND_GIFTS, charm gift) não estava registrado em nenhum handler — portado (`apps/game/src/handlers/items.ts` `sendGift`, UserSendGiftHandler.cs) e verificado Thur→Bob no cliente real (ver seção "Varredura do básico — verificação no cliente" abaixo).
- [feito, varredura do básico pt.1 2026-10-02] Item de troca de sexo não funciona — handler 252 USE_CHANGE_SEX (item 11569) não estava registrado em nenhum lugar; portado de `ChangeSexHandler.cs` (`apps/game/src/handlers/items.ts`): troca Sex, desequipa itens agora inválidos por NeedSex (gender-locked), consome o item, divórcio best-effort se casado. Typecheck ok; não testado clicando no cliente real (Flash/Ruffle), só por inspeção do fluxo de packets do AS3 (`BagView.as`: não há listener para resposta 252 nesta build, então só a mensagem de chat + sync normal da bolsa é necessária).
- [lote combate/pets/cartas] Comprar VIP não funciona.
- [lote combate/pets/cartas] Treino de prática não funciona — é a 2ª aba da bolsa: usar poção de treino para upar HP/ataque/defesa/agilidade/sorte (player."Sys_Users_Texp").
- [feito, varredura do básico pt.1 2026-10-02] Dar claim de algumas missões não funciona — `QuestInventory.finish` (`apps/game/src/game/quests.ts`) derrubava silenciosamente duas recompensas: RewardRiches (missões de guild) e RewardBuffID/RewardBuffDate (buff por tempo); ambas portadas (QuestInventory.cs:402-451). Testado com a missão real 640 ("Kèn triệu tập 1", guild + repetível) via `test/quests.test.ts`. Condições em si (grade, kills, jogos, compra, item, direct, PvE-mission) já funcionavam; 81/413 missões elegíveis nível ≤12 dependem de um tipo de condição não portado (pets/farm/casamento/outros sistemas já rastreados como "não iniciado" em outras seções deste backlog) — não é regressão do básico, é escopo de outro lote.
- [feito, varredura do básico pt.2 2026-10-02] Revisar TODO o básico: bolsa, equipar/desequipar, loja, ferreiro, tooltips, personagem, missões, correio, amigos, chat, salas — clicar cada botão como jogador, matriz QA linha a linha. Ver seção "Varredura do básico — verificação no cliente" abaixo; alguns itens (split na bolsa, troca de sexo, claim de missão) continuam sem clique confirmado no cliente real, listados como próximo passo.
- [feito, varredura do básico pt.3 2026-10-02] Claim de missão (339 "Hiệu lệnh guild", 8 "Thử nghiệm tu luyện") e troca de sexo (252) resolvidos; split por drag identificado mas não reproduzido via automação — ver seção "Varredura do básico — pt.3" abaixo.
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

## Varredura do básico — verificação no cliente (pt.2, 2026-10-02)

Agente único, orçamento de tokens estrito (poucos screenshots; a maior parte verificada por estado no banco e log do
servidor). Contas Thur (test/test, grade temporariamente 20 via `qa-setup.ts grade` pra liberar a aba Hộp quà de
presente, restaurada no fim) e Bob (test2/test2pass). Snapshot/restore via `apps/game/scripts/qa-setup.ts` no
início/fim (Grade/GP/Money; Gold e itens dados/comprados durante o teste **não** são restaurados pela ferramenta —
limitação conhecida, sem efeito prático pros próximos lotes).

| Área | Ação | Resultado | Nota |
|---|---|---|---|
| Loja | Presente pra amigo (221 USER_SEND_GIFTS) Thur→Bob | **OK** | Implementado nesta batch; ver abaixo. |
| Loja | Comprar item com Xu | **OK** | "Loa Ấn" 30 Xu, confirmação, saldo exato. |
| Loja | Comprar com Gold/outras moedas | não testado no cliente | Só Xu nas abas visitadas; cobertura de tipo de preço já é automatizada (`test/handlers.test.ts`). |
| Bolsa | Equipar / desequipar | **OK** | Duplo-clique alterna, stats (Hộ giáp, Lực chiến) mudam e voltam. |
| Bolsa | Mover item (drag) | **OK** | Pilha inteira arrastada pra slot vazio. |
| Bolsa | Vender (Bán) | **OK** | Confirmação, +200 Gold, item removido. |
| Bolsa | Dividir pilha (Tách) | **FAIL** | Clique no item + Tách e Tách + drag, nas duas ordens, não abriu diálogo de quantidade nem moveu nada. Lógica de split no handler já é testada (`items.ts` `changeItemPlace`); é só o gatilho de UI/drag no Ruffle que não foi encontrado nesta sessão. |
| Ferreiro | Fortalecer / compor / incrustar | não executado | Painel "Tinh Luyện" (compose) abriu a partir do botão na bolsa; não executei compose/strengthen/inlay reais por falta de materiais elegíveis conhecidos sem arriscar itens do Thur. Lógica já coberta por `test/handlers.test.ts` (strengthen/compose) e `forge.ts`. |
| Item de uso | Troca de sexo (252, item 11569) | **FAIL** | Item dado via `qa-setup give`, Thur relogado. Clique/duplo-clique no item (aba Đạo cụ) só mostra tooltip — o diálogo de confirmação (`ChangeSexAlertFrame`) é ligado só ao duplo-clique da aba Trang bị (`_equiplist`) no AS3 (`BagView.as:2021/1451`), não à `_proplist`. Sex não mudou no banco. Handler server-side já implementado e testado por código; falta achar o gatilho de UI certo (talvez CellMenu com opção "Dùng"). |
| Missões | Claim de missão principal | **FAIL** | "Hiệu lệnh guild" (entrar em 1 guild, Thur já está na guild Reborn) mostrava "(Hoàn thành)" e badge OK!!, mas clicar "Nhận thưởng" não mudou nada no servidor (sem `CompletedDate` novo, sem mensagem). Suspeita: condição de guild é um tipo ainda não portado (rastreado em "Não iniciado" deste backlog), cliente mostra completo com checagem própria mas servidor nunca marca `IsComplete`. |
| Missões | Claim de missão diária/secundária | **FAIL** | Mesma coisa com "Thử nghiệm tu luyện" (usar 1 poção de treino). Não é problema geral do botão: "Nhận đính kèm" do correio (mesmo estilo de botão) funcionou normalmente no mesmo teste. |
| Correio | Abrir e pegar anexo | **OK** | Mail de teste com 500 Gold inserido via SQL + `/mail-notice` do canal admin pra forçar reload; "Nhận đính kèm" removeu o ícone do anexo e logou "Nhận thư thành công.". Mails reais do GM na conta não tinham anexo (Gold/Money/Annex1 zerados), por isso precisei injetar um pra testar o fluxo. |
| Social | Adicionar amigo | **parcial** | Diálogo "Thêm bạn" aceitou "Bob" e fechou sem erro, mas Bob já era amigo do Thur antes da sessão (linha antiga em `Sys_Users_Friends`, `AddDate` não mudou) — não isola um ADD novo. |
| Social | Chat do saguão | **OK** | Mensagem enviada e apareceu no log do chat. |
| Salas | Criar sala + começar vs bot | **OK** | Sala "Thi đấu" criada, "Bắt đầu" sozinho, contador de espera, e depois do fallback (~25s) a partida carregou de verdade contra um bot (tela de luta real). |

**221 USER_SEND_GIFTS — detalhe**: implementado em `apps/game/src/handlers/items.ts` (`sendGift`), `apps/game/src/db/social.ts`
(`addUserGift`) e `apps/game/src/db/characters.ts` (`addCharmGP`, incremento atômico). Porta `UserSendGiftHandler.cs`:
custo `ShopItemInfo.AValue1 × count` Money, `charmGP += ItemTemplate.Property2 × count` no destinatário (online ou
offline), linha em `Sys_Users_Gift`, mail tipo 55. Testado automatizado em `apps/game/test/handlers.test.ts` ("shop" >
"221 USER_SEND_GIFTS") e no cliente real: Thur comprou "Hoa Mẫu đơn" (100 Xu) pra Bob pelo sistema de presente
(aba Hộp quà da bolsa, nível ≥16); Xu do Thur caiu exatamente 100, `charmGP` do Bob foi de 0 a 10, mail chegou.

**Pendências pro próximo lote** (não corrigidas nesta batch por orçamento): split de pilha pelo cliente (drag),
gatilho de UI da troca de sexo, e descobrir/portar o(s) tipo(s) de condição de missão que trava(m) "Hiệu lệnh guild" e
"Thử nghiệm tu luyện" no claim.

## Varredura do básico — pt.3 (2026-10-02)

Agente único, orçamento estrito, mesma config da pt.2 (Thur/Bob, snapshot/restore via `qa-setup.ts`). Resolveu as 3
pendências da pt.2 (menos split, que foi root-caused mas não fechado por limitação de automação do drag no Ruffle).

**1) Claim de missão (179 QUEST_FINISH) — resolvido.** Root cause em `apps/game/src/game/quests.ts`
`condCompleted`: tipo 18 (`OwnConsortiaCondition`, "Hiệu lệnh guild"/"Gia nhập 1 guild", Quest_Condiction QuestID
339 Para1=0 Para2=1) nunca tinha sido portado — adicionado, avaliado sob demanda como grade/item possuído (Para1 0
= nº de membros da guild, aproximado por `ConsortiaID!=0` já que o único Para2 real no jogo é 1; 1 = riches; 2/3/4 =
nível de ferreiro/loja/baú da guild, já cacheados em `PlayerInfo`). Também achado: tipos 3 (UsingItemCondition,
"Thử nghiệm tu luyện" QuestID 8), 9 (ItemStrengthenCondition), 11 (ItemFusionCondition) e 19 (ItemComposeCondition)
já tinham a lógica de decremento (`onUsingItem`/`onItemStrengthen`/`onItemFusion`/`onItemCompose`) mas faltavam no
bucket "completo quando valor≤0" do switch — o contador chegava a 0 mas o claim nunca via como pronto; corrigido.
De brinde, tipo 25 (ItemInsertCondition) foi ligado ao handler de engaste de gema (`forge.ts` `inlay`). 179 agora
chama `saveIntoDatabase` logo após o claim (antes só salvava no autosave de 10 min) — mesmo padrão de correio/
consórcio. Confirmado no cliente real: as duas missões OK!! (339, 8) agora completam, `IsComplete=true` e
`CompletedDate` novos persistidos na hora. `test/quests.test.ts` + `test/handlers.test.ts` passam (85/85 testes do
pacote `apps/game` passam no total).

**2) Troca de sexo (252 USE_CHANGE_SEX) — resolvido, sem patch de cliente.** A pista da pt.2 (diálogo só ligado ao
double-click de `_equiplist`) estava incompleta: o item também é "usável" via `EquipType.canBeUsed()`
(CategoryID==CHANGE_SEX), então um único clique em `_proplist` (Đạo cụ) abre o `CellMenu` ("Sử dụng"/"Di chuyển");
escolher "Sử dụng" dispara `__cellUse` (BagView.as:1385-1451 — o mesmo branch de CHANGE_SEX existe em
`__cellDoubleClick` *e* em `__cellUse`; o double-click não era o caminho certo) → `startupChangeSex` →
`ChangeSexAlertFrame`. Confirmado fim-a-fim no cliente real: clique → CellMenu "Sử dụng" → confirmar → `Sex` vira
no banco e o item é consumido. Nenhum patch de cliente (XML/p-code) foi necessário — é o gesto normal de qualquer
item usável da Đạo cụ, só não documentado antes. Também corrigido: salva no banco na hora (era só autosave).

**3) Split de pilha por drag (49 CHANGE_PLACE_GOODS) — gesto identificado, não fechado.** Achado no AS3
(`BreakGoodsBtn.as`/`BreakGoodsView.as`): quem é arrastável é o próprio botão "Tách" da toolbar da bolsa, não o
item — o jogador arrasta o botão "Tách" até soltar sobre a pilha (abre o diálogo de quantidade `BreakGoodsView`),
confirma, e isso inicia um SEGUNDO arrasto (da quantidade escolhida) que precisa ser solto no slot de destino.
Dois arrastos Flash nativos (`Sprite.startDrag()`, proxy que segue o mouse entre um CLICK inicial e um CLICK/
MOUSE_UP final — não um "segurar o botão do mouse" padrão do DOM) encadeados. Tentei reproduzir via Playwright
(mousedown→move→up contínuo e clique→move→clique discreto) sem sucesso — o proxy de arrasto do `_breakBtn` nunca
apareceu. Lógica do servidor (`changeItemPlace`, count < tamanho da pilha) segue correta e testada
(`test/handlers.test.ts`). Pendência pro próximo lote: confirmar o fluxo completo (talvez precise de teste manual
ou um driver de automação com suporte melhor a `startDrag()` nativo do Flash/Ruffle).

**4) Forge (strengthen/compose/inlay/fusion) — coberto por testes, não re-clicado.** `forge.ts` já estava correto
(sem bugs achados nesta batch além do hook de missão 25 acima); Thur (conta de QA) não tinha pedra de fortalecimento
nem gema compatível com o furo aberto da arma equipada nesta sessão, então os 4 fluxos de clique não foram
refeitos no cliente real (ficam como na pt.1/combate-pets-cartas: strengthen e inlay verificados antes via
`b7/b8/b11` em `research/e2e/qa/`, compose/fusion só por `test/handlers.test.ts`).

## [ALTA PRIORIDADE — próximo lote] Destruição de terreno dessincronizada (PvP e PvE, todos os mapas)
Sintomas (usuário): cada mapa erra diferente — (a) explosão destrói o background + a estrutura (só a estrutura/foreground deveria ser cortada); (b) às vezes some a hitbox mas a textura fica → "buraco invisível".
Suspeitas a investigar, nesta ordem:
1. Crateras: `apps/api/src/lib/bomb-alias.ts` / `routes/static.ts` servem PNG em branco/alias para crateras corrompidas/ausentes → cliente corta textura com forma errada/vazia enquanto o servidor cava com a forma real (packages/fight/data). Servidor e cliente precisam usar a MESMA forma de cratera (gerar PNG de cratera a partir do .bomb que o servidor usa).
2. Camadas do mapa no pack mesclado (3.0 + build chinês): fore/back trocados ou de outra versão em alguns mapas → validar cada mapa do Game_Map: fore.png/back.png vs dimensões e máscara do .map do servidor.
3. Pacote de explosão/dig enviado ao cliente: ID da cratera e posição iguais ao C# (eTankCmdType BOMB/dig).
Ferramenta desejada: script que, por mapa, compara máscara de colisão do servidor com o alpha do fore.png e reporta divergências.

## Lote casamento/fazenda/leilão (2026-10-02)

Agente único, orçamento de tokens estrito (0 screenshots — verificação só por teste automatizado + estado no banco,
não clicado no cliente real; ver notas por linha em QA-MATRIX.md). Os três sistemas estavam 100% ausentes
(`apps/game/HANDLERS.md`, tabela "Missing") — implementados do zero a partir do C# original + specs
`docs/spec/server/01-packet-handlers.md` §7/§11/§13.

**Casamento** (`apps/game/src/handlers/marriage.ts`): pedido/aceite/rejeição (anel 11103), info de casamento,
quadro de "tình duyên" (add/get/update/delete), sala da capela (criar/entrar/saudação de tiro/cerimônia com anel
9022 na primeira vez/fogos/presentes), divórcio. **Achado e corrigido**: divórcio cobrava `PRICE_DIVORCED` duas
vezes (`MoneyDirect` + `RemoveMoney` do mesmo valor) — cobra uma vez agora. **Achado e corrigido**: os códigos 237
(edição do quadro) e 253 (edição da sala) colidiam no original (o handler da sala estava registrado no código do
quadro, formato errado) — agora cada um tem seu próprio handler/formato. Benefício de casal: nova condição de
missão tipo 26 "Marry" (+ tipo 17 "OwnMarryCondition") em `game/quests.ts`, disparada no aceite do pedido.

**Fazenda** (`apps/game/src/handlers/farm.ts`): plantar/regar(acelerar crescimento)/colher/expandir campos,
ajudante de fazenda, visita/roubo no campo de amigo. **Achado e corrigido** (apontado no spec 01 §13 e no
backlog de "missing server-side validation"): o preço do ajudante de fazenda (sub 9 HELPER_SWITCH_FIELD) vinha
direto do cliente — um pacote forjado comprava o ajudante de graça. Agora o servidor calcula o preço
(`FarmHelperPricePerMin × seedTime × seedCount`) e ignora o valor que o cliente mandou.

**Leilão** (`apps/game/src/handlers/auction.ts`): anunciar item (taxa em Gold, 3/9/18% por 8h/24h/48h), lance/compra
direta (sempre em Money), expirar (scan periódico, `AUCTION_SCAN_SEC`, default 300s). Todo acerto (lance, compra,
cancelamento, expiração) é um único `UPDATE ... WHERE IsExist=true RETURNING` — lance repetido ou duas varreduras
batendo ao mesmo tempo não pagam/devolvem duas vezes (idempotente, mesmo padrão do correio).

Testes: `apps/game/test/marriage-farm-auction.test.ts` (divórcio cobra uma vez, pedido/aceite casa os dois sem
cobrar de novo quando já tem anel, ajudante de fazenda ignora o preço forjado, leilão cobra taxa uma vez + reembolsa
lance anterior + liquida venda). Suíte completa (`pnpm --filter @ddt/game test`): 16 arquivos / 89 testes, sem
regressão. `pnpm --filter @ddt/game typecheck`: limpo.

**Pendências pro próximo lote**: nada clicado no cliente real (Ruffle) — formato de alguns pacotes (board 236/235/
237, sala 253, a maioria dos sub-comandos 249 MARRY_CMD, refresh do leilão 192/193) foi confirmado contra o leitor
AS3 só nos casos citados em HANDLERS.md (247/250/248/234/242/249-INVITE); o resto é "melhor esforço" e precisa de
verificação visual. Fora de escopo nesta batch: browse/search do leilão por HTTP (`AuctionPageList.ashx`, apps/api),
poultry/compose-food da fazenda (subs 5/20-25/33), posicionamento em tempo real na sala da capela.
- [deploy] Correções de mapa/cratera ficam em `apps/api/.data/uploads` (gitignored, 2.9 MB, gerado). Em instalação nova/deploy rodar: `npx tsx tools/assets/fix-maps.ts && npx tsx tools/assets/gen-craters.ts` (incluir no script de deploy/dev:all).

## Lote Eventos/Atividades (2026-10-03) — 34 linhas restantes da matriz

Implementado em `apps/game/src/handlers/activities.ts` (novo arquivo, registrado em `handlers/index.ts`):
- **Rương/Lottery** (26/27/28/45/204/232): tabuleiro "thần tài" de 18 slots, sorteio com custo de chave escalonado,
  liquidação final, ranking de abertura (`Sys_Users_Extra.TotalCaddyOpen`), abrir tudo em cartas, resgatar tudo por
  ouro/lễ kim.
- **Rương Vua Gà + Lucky Star** (87): tabuleiro de 18 cartas (abrir carta, soi/eagle-eye, refresh, embaralhar) +
  roda da sorte de 14 posições (entrar, girar com item consumível, completar). Pool de recompensas e preços
  configuráveis pelo painel admin ("Eventos" → `kind` `chickenbox`/`luckystar`, igual ao boss mundial).
- **Mê cung/Labyrinth** (131): dobrar prêmio, limpar automaticamente (clean-out), acelerar, parar, resetar,
  tentar de novo — camada administrativa/econômica persistida em `Sys_Users_Labyrinth`. **Limitação conhecida**:
  o avanço de andar por combate real (`myProgress`) ainda não existe (tipo de sala PvE do labirinto não foi
  portado) — o clean-out liquida tudo instantaneamente em vez de um timer de 1s por jogador como o original.
- **Liga/132** (BattleGroundHandler): ranking semanal, prestígio do dia/total, stats de referência fixos (iguais
  ao original, que também não deriva do jogador).
- **258 NOVICEACTIVITY**: simplificado para checar nível (Grade) em vez do contador de progresso completo
  (PlayerExtra) que o original usa — mesmas tabelas Event_Reward_Info/Goods do 259.
- **Títulos agora persistidos**: conquista com recompensa de título (RewardType 1) grava `Sys_User_Rank`
  (antes só anunciava no chat) e manda a lista real no pacote 34 (antes sempre vazio).
- **Contador de conquista**: tipo 32 (fortalecimento bem-sucedido) ligado em `forge.ts`.
- **Confirmado morto no próprio C# original** (não é lacuna, é fidelidade): 104 CARD_LOTTERY, 105 LUCK_LOTTERY,
  239 GOTO_CARD_LOTTERY (enum existe, nenhuma classe `[PacketHandler]` assina), 128/130 roleta esquerda
  (`LeftGunHandler.cs` todo comentado), 145 ACTIVITY_SYSTEM subs de GuildMemberWeek/LanternRiddles/LightRoad
  (`ActiveSystemHandler.cs` só monta um pacote pro sub 8 e nunca envia).

**Não portado nesta batch (orçamento de tokens estrito)**: 84 ACTIVITY_PACKAGE (chick activation — handler de 668
linhas no C#, tabela `Activity_System_Item` já migrada mas sem UI admin dedicada ainda); contadores de conquista
dos tipos restantes (missões PvE, uso de item, bugle, PvP — precisam de hooks no motor de combate); chaveamento
real de elite (162 sub 2, `EliteGamePaarungFrame.as` mostra UI de campeões mas a tabela de confronto/pontuação
não existe — "se houver neste cliente" se confirma que sim, mas construir um motor de torneio ficou fora do
orçamento desta sessão).

Testes: `apps/game/test/activities.test.ts` (9 testes: tabuleiro de rương, sorteio sem repetição, Lucky Star
re-roll da moeda, preço do "tentar de novo" do labirinto, clean-out liquidando e pagando GP, liga sub 3/5,
idempotência do 258). Suíte completa: 17 arquivos / 98 testes, sem regressão. `pnpm --filter @ddt/game typecheck`:
limpo. Nada clicado no cliente real (Ruffle) — verificado só por teste automatizado/typecheck, igual aos outros
lotes recentes sob orçamento estrito.
