# QA geral — checklist viva (tarefa `qa-geral`)

Atualizado 2026-10-27. Verificação no **cliente real** (PixiJS, `apps/client`, build gerado por
`tools/as3-to-ts`), Playwright headless (`chromium.launch()`, contexto novo a cada sessão — nunca
MCP/perfil real), falando com `apps/api`/`apps/game` do dono (8080/9200/9300, não parados). Contas de
teste próprias (`qaGeral1`/`qaGeral2`, senha só neste ambiente, nunca commitada), criadas via
`POST /api/auth/register`; moedas de teste (Cupons/Dinheiro/Medalhas) dadas só a essas contas via
`PATCH /api/admin/players/:id` (admin API, não toca em nenhuma conta de outro agente).

Harness reutilizável: `apps/client/qa-*.local.mjs` (gitignorado, `*.local.mjs`) — login via
`/api/auth/login` (ticket `user`/`key` de curta duração, buscado de novo a cada sessão), boot do cliente em
`http://localhost:5182/?user=...&key=...&debug=true` (porta 5181 já em uso por outro agente concorrente
nesta máquina), ferramentas de depuração nativas do cliente (`ddtDebug`, `packages/flash/src/debug.ts`)
expostas via `?debug=true` para andar a árvore de exibição e computar coordenadas de clique (viewport
Playwright fixado em 1000x600 = resolução lógica do Stage, sem escala, então coordenadas do Stage = pixel
da página 1:1).

Achados reaproveitáveis pra quem continuar este QA:
- **Popups promocionais no saguão (hall) são recorrentes e assíncronos** ("NEWGUN" = anúncio de item
  cosmético, aviso de torneio diário) — não há um único "feche uma vez e pronto"; aparecem em momentos
  imprevisíveis nos primeiros 5-10s após entrar no hall e empilham. Workaround que funcionou de forma
  confiável: clicar repetidamente (12-14x, ~700ms entre cliques) nas duas posições fixas onde os botões de
  fechar desses popups sempre renderizam — `(592,372)` ("Confirmar" do aviso de torneio) e `(705,124)` (X do
  anúncio de item) — antes de tentar qualquer interação no hall.
- **A árvore de exibição (`ddtDebug`/`stage.getChildAt`) não é confiável para todo painel.** Vários
  containers (o popup de aviso, os itens da lista "Popularidade" da loja) redirecionam `addChild` para um
  Sprite interno sem expor isso em `numChildren`/`getChildAt` (mesma ressalva já documentada em
  `packages/flash/src/debug.ts` `symbolsInside`) — andar a árvore por nome/texto simplesmente não encontra
  esses nós, mesmo visíveis na tela. Nesses casos, coordenada de pixel fixa (tirada de um screenshot) é mais
  confiável que busca por texto/classe.
- **Primeiro boot por sessão é lento (cold cache): ~75-80s** carregando ~13 arquivos de recurso
  (`Carregando[Arquivo do sistema]: N/13`) antes do hall aparecer — cada run do Playwright usa um contexto
  novo (sem cache de disco entre sessões, por design da tarefa), então esse custo se paga em TODA sessão,
  não só na primeira. Fator decisivo no tempo total do QA; não é bug, é esperado dado "sempre contexto novo".

## Loja (Shop)

| Feature | Status | Evidência | Nota |
|---|---|---|---|
| Abrir painel (ícone "Shop" no hall) | ✅ ok | `shop-02-settled.png` | Título "Shopping", abas Recomendado/Equipamento/Beleza/Itens/Troca/Receba Gratuitamente, sub-abas Promoção/Oferta, painel "Popularidade" à direita, preview de personagem + Carrinho à esquerda — tudo 100% PT-BR. |
| Timing: painel abre "preto" (só os 300px da esquerda renderizam) se screenshot tirado < ~3s após o clique | ⚠️ não é bug | `shop-01-opened.png` (sessão com captura cedo) vs `shop-02-settled.png` (mesma sessão, +5s depois, completo) | Os bitmaps de fundo do painel direito (`asset.shop.RightViewBg`/`RightViewBg1`, confirmado presentes em `apps/client/public/assets/flash/ui/vietnam/swf/shop/images/`) decodificam/sobem pra GPU mais devagar que o texto; textos dos itens já aparecem corretos na árvore antes do fundo terminar de desenhar. É timing de decode de textura, não asset faltando (nenhum 404 relacionado — o único 404 visto em toda sessão é `/flash/weekly/weeklyinfo.xml`, de outra feature). Deixado como observação pra quem for avaliar performance (fora do escopo desta tarefa — `perf-cliente`). |
| Moedas exibidas (Cupons/Dinheiro/Medalhas) | ✅ ok | idem | `Gold`→"Cupons" confirmado (PATCH admin `Gold:5000` → UI mostrou "Cupons 5000"). `Money`/`Medal` setados via PATCH mas UI continuou mostrando "Dinheiro 0"/"Medalhas 0" — não investigado a fundo (pode ser outra coluna/sincronização; não bloqueou o teste de compra, que só precisava de Cupons). |
| Comprar item (fluxo completo) | ✅ ok | `buy-01-after-comprar-click.png`, `buy-02-after-confirm.png` | Testado com "Megafone Grande" (30 Cupons): clique em "Comprar" no card → abre modal "Comprar" com seletor de quantidade/tier (30 Cupons/1 unidade vs 300 Cupons/11 unidades — desconto por atacado), resumo "A pagar" (cupom/moedas grátis/medalhas) → "confirma compra" → modal fecha, Cupons debitado corretamente (5000→4970, exatos 30), card do item destacado em verde (feedback de compra recente). Fecha o loop do pacote 44 `BUY_GOODS` (`docs/qa-matrix.json` já tinha `verified:yes` só por teste automatizado de pacote — isto comprova no cliente real também). |
| Entrega do item na mochila | ⏳ pendente | — | Não confirmado ainda (checar na seção Bolsa, próxima). |
| Presentes (comprar pra amigo) | ⏳ pendente | — | `57:sendPresentGoods` ainda não testado nem no cliente nem (conhecidamente) no servidor — ver nota em `44:sendBuyGoods` no qa-matrix: "presente pra amigo (221 USER_SEND_GIFTS) não está registrado em handler nenhum" — candidato a bug real, precisa de 2ª conta. |
| Venda de item (sendSellGoods) | ⏳ pendente | — | Testar na seção Bolsa. |

### Navegação: como voltar do hall pra qualquer painel (achado reaproveitável)

Toda sessão de teste caiu numa armadilha: depois de abrir um painel (Shop, Bolsa...), nem clique fixo em
"Voltar" (946,571, chute por screenshot) nem tecla Escape fechavam o painel — o personagem ficava
"preso" nesse painel em TODO login seguinte (o servidor lembra o último estado/cena do jogador e o cliente
restaura direto nela, sem passar pelo hall). Causa raiz do clique fixo falhar: `(946,571)` caía fora da
área real de clique do botão "Voltar" da `MainToolBar` (a área real tem centro em `(963,570)` — a barra de
ferramentas é persistente entre painéis, igual pro Shop quanto pro hall, `ddt/view/MainToolBar.ts`, e
`__onReturnClick` chama `StateManager.back()`, que volta pro hall de qualquer painel cujo `getBackType()`
seja `StateType.MAIN`, como é o caso do Shop). Solução: achar o botão dinamicamente pela `tipData` ("Voltar")
em vez de chutar pixel, e clicar o CENTRO da bounding box — funciona de forma confiável. Harness atualizado
(`reachCleanHall`/`returnToHall` em `qa-harness.local.mjs`).

## Bolsa/Inventário

| Feature | Status | Evidência | Nota |
|---|---|---|---|
| Abrir painel (tecla de atalho "B", hotbar "Mochila (B)") | ✅ ok | `bag3-01-bag-open.png` | Painel completo: equipamento (boneco de papel com todos os slots — Chapéu/Óculos/Cabelo/Face/Roupa/Olhos/Terno/Asas/Pulseiras/Anéis/Colar/Bolha/Anel de casamento/Proteção/Arma/Itens/Animal), stats (Ataque/Agilidade/Defesa/Sorte/Dano/Proteção/Vida/Força física), FC (fight power), nível, "Escolher título", Ranking, Méritos, selo VIP, grade de inventário (10x5, vazia — conta nova), botões "Arrumar a mochila"/"Refinar"/"Segunda senha", abas direita Equips/Itens/Cartas, controles "Atalho/Divid."/"Recarregar/Vender". Tudo renderiza sem área preta (ao contrário do timing da Loja) e 100% PT-BR, EXCETO um achado abaixo. |
| Localização: aba "Thú cưng" (pets) na barra de abas do topo | 🐞 bug encontrado, não corrigido | `bag3-01-bag-open.png` (zoom no topo: "Perfil, Práticas, Presentes, Thú cưng, Totem") | Mesma classe de bug que `docs/qa/PVE-QA.md` item 4 (nome de masmorra em bitmap não traduzido): o botão da aba é `ComponentFactory.Instance.creatComponentByStylename("bagAndGiftFrame.petBtn")`, estilo `unSelectedStyle="asset.petBtn1" selectedStyle="asset.petBtn2"` (`vendor/DDTank41/.../xml/bagAndInfo.xml:308`) — **bitmap exportado do SWF original com o texto "Thú cưng" desenhado na imagem**, nunca um `TextField` dinâmico, então não existe chave de tradução pra sobrescrever (confirmado: a única chave de tradução relacionada a pets nessa área, `ddt.petSystem.openPetBtn.text`, é só o TOOLTIP "Só a partir do nível 25...", já 100% PT-BR — `data/i18n/pt-BR/client-language.txt:3297` e confirmado servido corretamente pelo `apps/api` ao vivo). Fix exigiria reexportar a arte (`asset.petBtn1`/`petBtn2`) com texto traduzido ou um patch de overlay (`tools/as3-to-ts/patches`, como o da masmorra) — não aplicado nesta rodada por ser um painel novo (preview geométrico incerto sem poder validar visualmente iteração a iteração); documentado pra próxima rodada. |
| Venda de item (sendSellGoods) | ⏳ pendente | — | Não alcançado nesta rodada (ver "Áreas não concluídas" no relatório final). |
| Equipar/usar/dividir item | ⏳ pendente | — | Inventário da conta de teste está vazio (precisa dar item via admin API antes, ver `44:sendBuyGoods`/`give-item`) — não alcançado nesta rodada. |
| Bag lock / captcha | ⏳ pendente | — | "Segunda senha" visível no painel, fluxo não testado. |

## `/flash/weekly/weeklyinfo.xml` 404 em toda sessão (achado, não é bug)

Toda sessão no hall dispara 4x `GET /flash/weekly/weeklyinfo.xml` → 404 (`times/TimesManager.ts`
`createTimesInfo()`, parte do sistema de desafio/ranking semanal). Investigado: o arquivo nunca existiu em
lugar nenhum (nem no `vendor/DDTank41` original) — no jogo original esse XML era **gerado dinamicamente**
pelo backend ASP.NET, não um asset estático; `apps/api` ainda não tem essa rota. O handler de erro do
cliente (`TimesManager.__onLoadError`) é um no-op vazio **no AS3 original também** — doador-fiel, falha
silenciosa por desenho, não trava nada (confirmado: todo screenshot desta rodada mostra o hall/painéis
funcionando normalmente apesar do 404). Não é bug de UI; é lacuna de feature (endpoint de desafio semanal
não implementado) — mais perto de "Eventos/Atividades" que de QA geral; documentado, não corrigido.

## Correio (Mail)

| Feature | Status | Evidência | Nota |
|---|---|---|---|
| Abrir painel (atalho de teclado "R", hotbar "Correio (R)") | ✅ ok | `mail-01-opened.png` | Abre como modal flutuante SOBRE o painel atual (não troca de cena como a Loja/Bolsa) — abas "Lista de e-mails/E-mails não lidos/Enviados", colunas "De/Assunto", botão "+Amigo", "Selecionar tudo/Apagar/Receber anexos", rodapé "Escrever e-mail/Responder/Retornar/Manual/Cancelar". Caixa vazia (conta nova) — esperado. 100% PT-BR. |
| Escrever e-mail / enviar entre contas | ⏳ não concluído | — | Tentativas de clicar "Escrever e-mail" sempre esbarraram em navegação instável do hall (ver seção de navegação) antes de conseguir uma captura limpa do formulário de composição — não é um bug observado, é falta de tempo desta rodada pra estabilizar o clique. |

## Ferreiro (Forja)

| Feature | Status | Evidência | Nota |
|---|---|---|---|
| Abrir painel (prédio "Forja" no hall) | ✅ ok | captura no histórico do harness (painel "Ferreiro") | Painel completo e bem renderizado (SEM o atraso de bitmap preto que a Loja tem): abas superiores "Ferraria/Forno/[não traduzida]", abas laterais "Fortalecimento/Montagem/Composição/Transferência/Fusão", painel de Fortalecimento com seletor de equipamento (1 Equip) e item (2 Item), % de pedras/amuleto/sociedade/VIP, "% Êxito", botão "Fortalecimento", "? Ajuda", moedas no rodapé. |
| Localização: 3ª aba superior ("Gia Công") | 🐞 bug encontrado, não corrigido | mesma captura acima | Mesma classe de bug que a aba "Thú cưng" da Bolsa e o nome de masmorra já corrigido pelo `pve-qa` — texto em vietnamita não traduzido. Não achei a chave de tradução nem a definição do asset em `vendor/DDTank41` nesta rodada (pode vir de um vendor diferente, ex. `DDT-6600`, ou ser puramente bitmap sem registro de string) — precisa de investigação futura em `apps/client/src/game/store/forge/ForgeMainView.ts` pra achar o `stylename` exato do botão da aba. |
| Fortalecer equipamento (fluxo completo) | ⏳ pendente | — | Bolsa da conta de teste vazia — precisa dar um equipamento via admin API antes de testar o fluxo de fato. |

## Amigos/Social — achado ambíguo (provável falha de infraestrutura compartilhada, não bug de feature)

Em uma tentativa de abrir o painel social (atalho "F"), apareceu um diálogo de erro real do jogo: "Lembrete"
→ "Desculpa, não foi possível conectar. Por favor, tente mais tarde!" (chave `tank.manager.RoomManager.
break`/`.false`, disparada em `SocketManager.__socketClose`/`__socketError` — ou seja, o socket TCP/WS do
jogo caiu NAQUELE instante, não é um erro específico do painel social). Investigado: os PIDs de `apps/api`
(porta 8080) e `apps/game` (portas 9200/9300) mudaram entre o início e o fim desta sessão de QA — a stack
inteira do dono foi reiniciada em algum momento no meio do trabalho (não por mim — nunca executei comando de
restart; 4 agentes compartilham esta máquina e o dono também pode ter reiniciado manualmente). Uma 2ª
tentativa logo depois (`apps/game` já confirmado estável de novo) não reproduziu o erro. **Não registrado
como bug da feature Amigos/Social** — causa raiz confirmada: `apps/game` do dono roda via `tsx watch
src/index.ts` (visto na lista de processos), que reinicia o processo sozinho a cada edição de arquivo em
`apps/game/src` — e há 3 outros agentes editando esse mesmo diretório nesta tarefa (`pve-batalha` entre
eles, dono da área de batalha). Cada reinício derruba toda conexão WS ao vivo, inclusive a minha sessão de
teste — reproduzido 2x nesta rodada, sempre com o PID do processo do jogo mudando entre antes/depois. O
cliente reage exatamente como devia (mostra o aviso, não trava). Fica como nota pra quem revisar: é
esperado nesse ambiente compartilhado, não precisa investigar como bug de feature.

## Navegação: dificuldade geral de voltar ao hall a partir de um painel aberto via teclado

Depois do achado do botão "Voltar" (ver seção Bolsa acima), ainda restou instabilidade pra abrir painéis
cujo atalho de teclado só funciona com o foco do Stage em um estado específico — às vezes a tecla (`B`/`R`/
`F`/...) não dispara nada visível mesmo com o foco dado por um clique em área neutra, provavelmente porque
o KeyboardShortcutsManager do jogo também observa `StateManager.currentStateType` e pode ignorar atalhos
fora do hall puro. Não deu tempo nesta rodada de mapear essa regra com precisão — quem continuar deve
preferir, quando disponível, o clique direto no ícone da hotbar (coordenadas por `tipData`, não por pixel
fixo — ver `qa-harness.local.mjs` `returnToHall`) em vez do atalho de teclado.

## Sociedade (Guilda)

| Feature | Status | Evidência | Nota |
|---|---|---|---|
| Abrir painel (prédio "Sociedade" no hall) | ✅ ok | `guild2-01-opened.png` | "Clube da Sociedade": busca ("Busca Soc."), lista "Lista Soc." com colunas Nome/Líder/Número/Nível/Méritos Soc — mostra a guilda REAL `Reborn` (líder `Thur`, nível 10) já existente no banco compartilhado do dono, confirmando que a listagem lê dado de verdade, não mock. Painel "Declaração" (anúncio), abas "Convites"/"Aplicações", botões "Aplicar"/"Busca aleatória". 100% PT-BR. |
| Criar sociedade (fluxo completo) | ⏳ pendente | — | Não alcançado nesta rodada — a tela encontrada foi a listagem/busca; o botão/fluxo específico de "criar" (geralmente exige nome + custo em ouro, conta de teste já tem 100k ouro e nível 20 via admin API pra isso) fica pra próxima sessão. |

## Achado de harness: clique "seguro" em (705,124) não é 100% seguro

O ponto usado pra fechar o popup "NEWGUN" (`(705,124)`, ver notas de navegação acima) fica perto o
suficiente da área de clique REAL do prédio "Forja" (maior que a arte visível) que, clicado ~16x por sessão
(como o `reachCleanHall` faz), abre a Forja por acidente com bastante frequência — reproduzido em 3 contas
novas independentes (`qaGeral2`, `qaGeral3`, `qaGeral4`), sempre caindo no painel "Ferreiro". Não corrigido
nesta rodada (a Forja tem seu próprio X vermelho de fechar, não o "Voltar" da `MainToolBar` — usado como
contorno pontual nos scripts, não uma correção geral do ponto de clique). Quem continuar deveria trocar esse
ponto "seguro" por um canto realmente vazio (ex. bem no topo, `y<10`) ou, melhor, achar o botão de fechar da
NEWGUN dinamicamente.

## `cd apps/game && npx vitest run --maxWorkers=1` (rodado 1x ao final, pedido pela tarefa)

**602 testes, 86 arquivos — todos passando** (nenhuma mudança de código nesta rodada, só documentação/notas
em `docs/qa-matrix.json`, então era esperado continuar verde). Levou ~22 min (contenção normal — 4 agentes
dividindo a mesma máquina, `maxWorkers=1` de propósito).

## Áreas não alcançadas nesta rodada

Igreja (Casamento), Fazenda, Leilão, Academia, Hall da Fama, Termas, Eventos/Calendário (além do gap de
`weeklyinfo.xml` já documentado), Missões, Salas PvP (criar/entrar/batalha completa contra bot),
configurações/rename, criação de sociedade — não verificadas nesta rodada por tempo. Ver relatório final da
tarefa (resposta do agente) pra avaliação honesta do que falta e por quê.
