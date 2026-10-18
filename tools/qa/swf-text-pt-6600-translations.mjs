// Trilha de auditoria + ferramenta de aplicação da 1a leva de tradução turco->PT-BR dos textos estáticos
// (DefineText/DefineEditText) do pack 6600 (2026-10-18, 564 registros em 69 SWFs -- ver docs/CLIENT.md).
// `T` abaixo é a tradução feita à mão, swf por swf; `node tools/qa/swf-text-pt-6600-translations.mjs` funde
// em research/i18n/swf-text-pt-6600.json, validando que cada entrada tem o mesmo nº de registros que o
// "tr" já semeado por swf-text-seed-6600.mjs (reporta divergência em vez de gravar, pra corrigir e rerodar).
// Útil como referência pra próximas levas (SWFs novos, textos que mudaram) -- não faz parte do fluxo
// padrão (`build-client-art.mjs --only-swf-text-6600` só lê o .json já pronto).
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const ROOT = join(import.meta.dirname, "..", "..");
const dbPath = join(ROOT, "research", "i18n", "swf-text-pt-6600.json");
const db = JSON.parse(readFileSync(dbPath, "utf8"));

const T = {};
function set(swf, charId, lines) {
  T[swf] ??= {};
  T[swf][charId] = lines;
}

// ---- avatarcollection.swf ----
set("avatarcollection.swf", 26, ["1. Pode ativar este desenho com a", "roupa correspondente."]);
set("avatarcollection.swf", 27, ["2. Colete os desenhos para obter atributos,", "ao atingir a metade da coleta você obtém", "1/2 da habilidade, e ao completar a coleta", "obtém todo o atributo."]);
set("avatarcollection.swf", 28, ["3. Depois que o tempo de coleta acabar,", "pode ser estendido gastando Honra."]);

// ---- battleground.swf ----
set("battleground.swf", 23, ["3. O valor de Prestígio também aumenta o", "exército de batalha; quanto maior o valor do", "exército de batalha, maiores os itens obtidos", "no mercado da liga."]);
set("battleground.swf", 24, ["2. Participar da batalha rende valor de", "Prestígio.(No máximo por dia", "pode ser ganho e não é apagado)."]);
set("battleground.swf", 25, ["4. Horário de abertura do campo de batalha", "."]);
set("battleground.swf", 26, ["5. Quando os jogadores alcançam o nível do", "adversário, obtêm o que o", "adversário possui."]);
set("battleground.swf", 27, ["6. Patentes do exército: soldado, alferes,", "tenente, 1º tenente, cabo, capitão,", "major, tenente-coronel, coronel, brigadeiro,", "general de divisão, general de corpo, general de exército,", "marechal, grande-almirante chefe do estado-maior."]);
set("battleground.swf", 28, ["1. Jogadores de nível podem participar", "da batalha; depois de entrar na batalha,", "o sistema, de acordo com os atributos do", "personagem, distribui automaticamente", "as missões; equipamentos não obtidos", "afetam isso."]);
set("battleground.swf", 31, ["                                    todo", "dia 10:30-12:30, 16:00-18:00"]);
set("battleground.swf", 32, ["nome"]);

// ---- bombking.swf ----
set("bombking.swf", 46, ["1.                     A Partida é uma área entre servidores,", "ocorre toda semana às         , personagens de nível .", "podem participar da partida."]);
set("bombking.swf", 47, ["(os 100 mais fortes)"]);
set("bombking.swf", 48, ["2. A partida dura um mês, há 3 partidas no total, eliminatória", "        , partida de promoção                , e partida", "final                 ."]);
set("bombking.swf", 49, ["3. A eliminatória e a partida de promoção são por pontos; a", "classificação é feita pela pontuação, e a final é escolhida", "entre os mais fortes        ."]);
set("bombking.swf", 50, ["4. Na fase final, forma-se a tabela de batalha dos", "selecionados; eliminando os grupos menores na batalha,", "restam os 3 primeiros."]);
set("bombking.swf", 51, ["5. Se os competidores perderem a partida na hora da final,", "são desclassificados automaticamente e o adversário avança direto."]);
set("bombking.swf", 52, ["6. Durante a partida, o sistema faz o pareamento no", "horário determinado em cada partida; os competidores devem", "completar a partida na fase de classificação de pontos da eliminatória/promoção."]);
set("bombking.swf", 53, ["Domínio Extremo do Rei Bombom"]);
set("bombking.swf", 56, ["16º"]);
set("bombking.swf", 58, ["(os 3 mais fortes)"]);
set("bombking.swf", 59, ["(os 16 mais fortes)"]);

// ---- campbattle.swf ----
set("campbattle.swf", 33, ["O evento Batalha de Acampamentos abre toda semana", "segunda, terça e sexta à noite,", "das 20:00 às 21:00; os personagens que vão participar", "do evento precisam ter alcançado o", "nível 30."]);
set("campbattle.swf", 34, ["3. Matar o animal guardião da passagem do", "acampamento dá pontos; depois de eliminar totalmente o", "animal guardião, o portão de", "envio daquele acampamento se abre."]);
set("campbattle.swf", 35, ["2. Depois que o evento começa, todos", "os jogadores são divididos aleatoriamente em 4 acampamentos."]);
set("campbattle.swf", 36, ["4. Todos os jogadores podem passar por este portão", "de envio do acampamento; por ele podem entrar na", "região da estátua do deus e tomá-la. Os", "jogadores nessa região podem obter a", "estátua do deus; tanto vencendo quanto perdendo,", "em ambos os casos ganham uma quantidade", "de pontos maior do que matando um", "jogador normal."]);
set("campbattle.swf", 37, ["5. Atacar jogadores de outro acampamento em", "qualquer região rende pontos; atacar quem está", "controlando a estátua do deus ou ajudar", "nisso vale pontos mais altos."]);
set("campbattle.swf", 38, ["6. Depois que a batalha começa, quando o seu", "lado tiver menos de 4 jogadores, outros jogadores", "podem entrar na batalha e ajudar; no meio do PVP,", "os jogadores que ajudam", "caem em pontos de nascimento determinados,", "e precisam escapar desses pontos de", "nascimento determinados em até 2 rodadas."]);
set("campbattle.swf", 39, ["7. Depois que o evento termina, a classificação", "é feita pelos pontos de acampamento e a distribuição", "de recompensas ocorre conforme os pontos pessoais."]);

// ---- catchbeast.swf ----
set("catchbeast.swf", 73, ["3. Depois que a atividade diária é concluída,", "pela interface pode-se solicitar a taxa de dano", "dos prêmios do tesouro."]);
set("catchbeast.swf", 74, ["1. A atividade da fera só pode ser", "iniciada uma vez por dia."]);
set("catchbeast.swf", 75, ["4. O dano causado ao matar a fera pode acumular,", "e depois disso os prêmios são obtidos."]);
set("catchbeast.swf", 76, ["2. Antes do início da atividade, junto com o BUFF", "a taxa de dano de 30000 e 30000", "de HP aumentam; o BUFF tem efeito crítico aqui."]);
set("catchbeast.swf", 77, ["5. A batalha com a fera precisa terminar no", "mesmo dia da atividade."]);

// ---- catchinsect.swf ----
set("catchinsect.swf", 93, ["1. Há 3 tipos de inseto na floresta: Libélula, Borboleta e Cigarra; depois de capturar", "com sucesso, você obtém os pontos de férias de verão correspondentes."]);
set("catchinsect.swf", 94, ["2. Armas normais não atingem o inseto. Mas você pode capturá-lo com a rede. Além disso, o inseto voa após 3", "turnos."]);
set("catchinsect.swf", 95, ["3. Quando a fada do inseto captura o inseto, ela aparece com chance muito baixa. Não pode", "ser capturada com a rede, mas você a captura usando a bola. A vida da fada do inseto é baixa,", "a chance de captura é alta, mas se for morta não pode mais ser capturada."]);
set("catchinsect.swf", 96, ["4. Depois de capturar a fada do inseto, você pode receber pontos de férias de verão como recompensa rica.", "A fada do inseto gosta de isca. Use isca para atraí-la."]);
set("catchinsect.swf", 97, ["5. Pacote de presente de férias de verão. Jogadores que ficarem entre os 10 primeiros na classificação", "de pontos desta área/entre servidores ganham um título de luxo com efeito de 3 meses."]);
set("catchinsect.swf", 98, ["6. Entre servidores e nesta área na classificação, a recompensa de classificação entre servidores", "é dada, e a recompensa da área também é dada junto."]);

// ---- changecolor.swf ----
set("changecolor.swf", 30, ["Chapéu"]);
set("changecolor.swf", 31, ["Óculos"]);
set("changecolor.swf", 34, ["Conjunto"]);

// ---- christmas.swf ----
set("christmas.swf", 95, ["1. Durante o evento, a arena de gelo fica aberta o dia todo. Todos os", "dias é possível entrar 1 vez gratuitamente. A duração é de 30 minutos.", "Tempos não usados no mesmo dia não se acumulam."]);
set("christmas.swf", 96, ["3. Quanto mais o monstro for atacado, mais", "fácil e rápido a batalha termina. Isso não tem", "relação com o dano causado ao monstro. Quando o Boneco de Neve atingir um", "certo número, você pode receber imediatamente", "os prêmios do rico pacote de presentes."]);
set("christmas.swf", 97, ["2. Para fazer o Boneco de Neve é preciso consumir", "bolas de neve. Atacar o monstro do lugar nevado pode", "dar bolas de neve; ao fazer o Boneco de Neve, usando o \"acréscimo", "em dobro\" você pode ganhar o dobro de", "bolas de neve."]);
set("christmas.swf", 98, ["4. Se um certo número de bonecos de neve for feito todo dia, você pode", "receber as recompensas do Papai Noel do lugar nevado. Cada pessoa, por", "dia, pode receber no máximo 2 vezes. É limitado, quem chega", "primeiro recebe primeiro."]);

// ---- cloudBuy.swf ----
set("cloudBuy.swf", 98, ["3. Se a contagem regressiva terminar sem completar o grau do", "sorteio, o jogador recebe um grande prêmio de sorte; ao mesmo tempo", "o número de chances de sorte do jogador, a porcentagem do prêmio médio e as chances de compra", "restantes no pacote de presente valioso são zeradas"]);
set("cloudBuy.swf", 99, ["1. O jogador pode receber diariamente o item do pacote de presente valioso,", "o grau de conclusão do sorteio da sorte atual", "aumenta 1 ponto."]);
set("cloudBuy.swf", 100, ["4. Quando os cupons gastos no pacote de presente valioso chegarem a cada 500,", "o jogador ganha uma chance única de caça ao tesouro"]);
set("cloudBuy.swf", 101, ["2. Quando o grau de conclusão do sorteio da sorte atual se completar,", "há recompensa para os jogadores que comprarem o item do pacote de presente", "valioso"]);

// ---- consortiabattle.swf ----
set("consortiabattle.swf", 82, ["1. Toda semana, as sociedades que subirem automaticamente entre as", "8 primeiras na classificação por aumento direto de patrimônio", "ganharão automaticamente autorização para participar da", "Guerra de Sociedades."]);
set("consortiabattle.swf", 83, ["3. Depois que cada membro da sociedade entra no campo de batalha,", "é distribuído para pontos de ressurreição", "determinados; depois que os personagens morrem,", "cada um ressuscita no seu próprio", "ponto de ressurreição."]);
set("consortiabattle.swf", 84, ["2. Na Guerra de Sociedades, o jogador da sociedade que mata o", "inimigo ganha pontos; esses pontos no final", "determinam a classificação da Guerra de Sociedades."]);
set("consortiabattle.swf", 85, ["4. Encerrar uma sequência de mortes e comprar o dobro de", "pontos pode ser obtido, aumentando o", "ponto extra."]);
set("consortiabattle.swf", 86, ["5. O personagem que vencer consecutivamente entra", "na próxima batalha com a quantidade de sangue atual."]);
set("consortiabattle.swf", 87, ["6. Durante a batalha, equipamentos de batalha e", "da mesma forma montarias também não podem ser usados."]);
set("consortiabattle.swf", 88, ["7. A Guerra de Sociedades ocorre toda semana no sábado", "às 19:00."]);

// ---- cryptBoss.swf ----
set("cryptBoss.swf", 14, ["3. Quando o desafio à batalha for bem-sucedido,", "você recebe uma recompensa extra; todo dia", "quando o desafio falhar,", "ele não é contado no número de desafios."]);
set("cryptBoss.swf", 15, ["1. De segunda a quinta-feira", "o boss correspondente pode ser desafiado uma", "vez; de sexta a domingo", "os 2 boss correspondentes podem ser desafiados", "uma vez."]);
set("cryptBoss.swf", 16, ["4. Boss diferentes têm atributos diferentes de", "ataque e defesa; o resultado final é afetado", "pelos atributos de ataque e ataque mágico, etc.", "do jogador."]);
set("cryptBoss.swf", 17, ["2. Em cada ponto de verificação do boss há dificuldade de cinco", "estrelas; de uma estrela a cinco", "estrelas, a dificuldade aumenta gradualmente."]);

// ---- ddtauction.swf ----
set("ddtauction.swf", 91, ["1. Para procurar itens você pode usar a visualização da interface à esquerda e a busca", "aproximada."]);
set("ddtauction.swf", 92, ["2. Preste atenção à diferença entre o valor do lance no leilão e o", "preço fixo."]);
set("ddtauction.swf", 93, ["3. Itens comprados por leilão serão enviados por e-mail", "pelo sistema. Verifique, por favor."]);
set("ddtauction.swf", 94, ["5. Para itens vendidos em leilão, é gasto apenas", "uma pequena quantia de ouro como taxa de manutenção."]);
set("ddtauction.swf", 95, ["4. Itens em leilão não podem ser cancelados. Por favor, verifique o preço pelo qual deseja", "vender no leilão e adicione com atenção!"]);
set("ddtauction.swf", 96, ["6. Depois que o tempo de leilão do item terminar, o sistema", "enviará uma mensagem por e-mail. Verifique a tempo,", "senão o item pode ser excluído pelo sistema."]);

// ---- ddtawardsystem.swf ----
set("ddtawardsystem.swf", 584, ["1. De acordo com os pontos obtidos no dado lançado, o avatar", "vai até a célula indicada, e o item é obtido", "automaticamente. Depois do evento o item não vai desaparecer,", "o item de cada célula pode ser obtido novamente.", "2. A cada passo você obtém pontos de sorte. Quando o ponto", "de sorte atingir o estágio indicado, como recompensa", "o ponto de sorte será obtido automaticamente.", "3. O ponto de sorte está sempre disponível. Depois de obter", "o prêmio do ponto de sorte do último estágio,", "a barra de pontos é totalmente zerada. Os pontos excedentes obtidos", "na última vez são adicionados ao primeiro estágio.", "4. Ao sair do jogo ou ficar offline,", "os pontos não são zerados. Depois que o evento termina, os pontos", "serão zerados."]);
set("ddtawardsystem.swf", 679, ["    O sistema de fundição de ouro ajuda o jogador a aumentar o dano da arma e", "a defesa do equipamento. Durante a", "fundição de ouro, preste atenção aos seguintes pontos:"]);
set("ddtawardsystem.swf", 680, ["1. Com a fundição de ouro, o equipamento entra nos 12 mais fortes: arma, chapéu e roupa", "."]);
set("ddtawardsystem.swf", 681, ["2. Depois que cada fundição de ouro é bem-sucedida, o dano da arma e a defesa", "da roupa e do chapéu aumentam, e a aparência também muda."]);
set("ddtawardsystem.swf", 682, ["3. A pérola do desejo de ataque só pode fazer fundição de ouro na arma.", "A pérola do desejo de defesa só pode fazer fundição de ouro nas roupas.", "A pérola do desejo de atributo só pode fazer fundição de ouro no chapéu."]);
set("ddtawardsystem.swf", 684, ["4. Depois que a fundição de ouro for bem-sucedida, há efeito sobre a", "chance de o equipamento sair", "；", "quer o equipamento seja usado ou não,", "a chance mostra efeito automaticamente a tempo."]);
set("ddtawardsystem.swf", 685, ["5. Depois que o tempo de desejo atual expirar, o equipamento volta a ser o", "equipamento fortalecido para 12 antigo."]);
set("ddtawardsystem.swf", 686, ["6. Quando o tempo válido do equipamento fortalecido para 12 for muito curto", "não pode ser dourado."]);
set("ddtawardsystem.swf", 908, ["Os seguintes itens super podem ser", "encontrados neste evento:"]);
set("ddtawardsystem.swf", 909, ["1.Começar: Abra a interface e clique no botão ", "começar para começar a tirar cartas. ", "A cada vez ", "a quantidade de cupons pedida é diferente. Quando a chance de tirar carta ", "chegar a zero, o sistema entrará automaticamente ", "na próxima Caça ao Tesouro.", "2.Renovar: Se você não gostar ", "dos prêmios da interface, gaste cupons e clique no botão ", "renovar para renová-los.", "3.Renovar gratuitamente: Quando a contagem regressiva ", "de renovação terminar, você recebe gratuitamente uma ", "nova chance de renovar um item valioso ", ".", "4.Olho de falcão: Ao tirar carta, gastando ", "cupons você pode espiar os prêmios ", "escondidos na carta. Com a espiada não é possível tirar carta.", " ", "5.Se você sair no meio da Fazenda do Tesouro, ", "o sistema salvará automaticamente as informações ", "atuais de tirar carta."]);

// ---- ddtbagandinfo.swf ----
set("ddtbagandinfo.swf", 163, ["Chapéu"]);
set("ddtbagandinfo.swf", 164, ["Óculos"]);
set("ddtbagandinfo.swf", 166, ["Conjunto"]);
set("ddtbagandinfo.swf", 187, ["1. Lute junto com seu cônjuge na arena e ganhe +1 de Amor.", "Pode-se receber 20 pontos por dia."]);
set("ddtbagandinfo.swf", 188, ["2.Lutando junto com o cônjuge, no último turno da exploração e após passar", "a fase de virar cartas, ganhe +5 de Amor.", "Pode-se receber no máximo 20 de Amor por dia."]);
set("ddtbagandinfo.swf", 189, ["3.\"Amor Eterno\" e \"Chocolate do Coração\" podem aumentar", "o Amor entre vocês. Depois de 5 usos por dia", "você não pode mais obter pontos de Amor."]);
set("ddtbagandinfo.swf", 190, ["4.Em caso de divórcio o ponto de Amor não muda,", "mas também não vai mais subir."]);
set("ddtbagandinfo.swf", 191, ["5. Ao atingir Amor Nv10 a habilidade \"Ouro Mais Forte Nv1\"", "é desbloqueada. Essa habilidade só fica ativa quando o casal", "forma um conjunto. Ao atingir o próximo valor de Amor,", "a habilidade do próximo Nv será desbloqueada."]);
set("ddtbagandinfo.swf", 193, ["Recompensa"]);
set("ddtbagandinfo.swf", 237, ["Classificação"]);
set("ddtbagandinfo.swf", 241, ["Óculos"]);
set("ddtbagandinfo.swf", 242, ["Chapéu"]);
set("ddtbagandinfo.swf", 243, ["Acessório", "facial"]);
set("ddtbagandinfo.swf", 244, ["Cabelo"]);
set("ddtbagandinfo.swf", 245, ["Olhos"]);
set("ddtbagandinfo.swf", 247, ["Enfeite"]);
set("ddtbagandinfo.swf", 248, ["Conjunto"]);
set("ddtbagandinfo.swf", 249, ["Anel"]);
set("ddtbagandinfo.swf", 250, ["Identificação"]);
set("ddtbagandinfo.swf", 254, ["Anel de", "casamento"]);
set("ddtbagandinfo.swf", 255, ["Outro"]);
set("ddtbagandinfo.swf", 256, ["Auxiliar"]);
set("ddtbagandinfo.swf", 285, ["    Pelo sistema de refino de itens, itens em excesso podem ser", "reciclados. Os pontos a serem observados ao", "reciclar são os seguintes:"]);
set("ddtbagandinfo.swf", 286, ["1. A taxa de sucesso do refino de item é 100%,", "ou seja, algo sempre é produzido."]);
set("ddtbagandinfo.swf", 287, ["2. Itens com validade expirada podem ser reciclados."]);
set("ddtbagandinfo.swf", 288, ["3. O item resultante do refino de item", "é aleatório."]);
set("ddtbagandinfo.swf", 289, ["4. O custo do refino de item é menor que 400 de ouro."]);

// ---- ddtbaglocked.swf ----
set("ddtbaglocked.swf", 9, ["Depois que a função de segunda senha é ativada, o avatar", "desta conta entra automaticamente em estado", "bloqueado todas as vezes que entrar no jogo. O avatar bloqueado", "não pode realizar as seguintes ações:"]);
set("ddtbaglocked.swf", 10, ["1. Compra e venda de itens"]);
set("ddtbaglocked.swf", 11, ["2. Compra e venda no leilão"]);
set("ddtbaglocked.swf", 12, ["3. Compra e venda de cupons"]);
set("ddtbaglocked.swf", 13, ["4. Doação para a sociedade"]);
set("ddtbaglocked.swf", 14, ["5. Operações na Forja"]);
set("ddtbaglocked.swf", 15, ["6. Descartar itens"]);
set("ddtbaglocked.swf", 16, ["Toda vez que entrar, clique no botão \"abrir trava\" e digite corretamente a segunda", "senha para poder usar as funções acima."]);
set("ddtbaglocked.swf", 17, ["Obs.: Para proteger sua conta, recomendamos que clique no botão \"configurar senha\"", "para definir sua segunda senha.", "    * A segunda senha não deve ser igual à senha de login.", "    * Depois de escrita a pergunta e a resposta de segurança da senha,", "não podem mais ser alteradas ou excluídas."]);

// ---- ddtbead.swf ----
set("ddtbead.swf", 305, ["Clicando na caixa de pérola você pode obter uma pérola", "。"]);
set("ddtbead.swf", 307, ["Colocando as pérolas no tanque e mantendo pressionado o botão \"sintetizar\",", "você pode aumentar a experiência da sua pérola de nível mais baixo."]);
set("ddtbead.swf", 309, ["Os lotes de síntese na mochila podem ser mais numerosos do que", "todas as sínteses de pérolas de nível mais baixo."]);
set("ddtbead.swf", 311, ["Clicando no \"cadeado\" e pressionando o botão de novo, você pode entrar", "no modo sem trava/remover a trava. Enquanto estiver", "trancado você pode aumentar o nível, mas não pode fazer síntese", "nem formar lotes de síntese."]);
set("ddtbead.swf", 312, ["Os equipamentos podem ser posicionados e trocados livremente."]);
set("ddtbead.swf", 314, ["Para abrir furos de selo de níveis diferentes, é necessário usar", "pontas de broca de nível diferente. Furos de selo de", "níveis diferentes exigem pérolas", "com características diferentes."]);

// ---- ddtburied.swf ----
set("ddtburied.swf", 301, ["1. Quanto maior a estrela do mapa do tesouro escondido,", "maior será a recompensa ganha."]);
set("ddtburied.swf", 302, ["3. As missões acionadas dentro do mapa do tesouro escondido", "aparecerão na coluna de missões do mapa do tesouro escondido na", "lista de missões."]);
set("ddtburied.swf", 303, ["2. Todo dia pode-se investir 10 vezes de graça, e consumindo", "cupons é possível aumentar 50 vezes a chance de investimento."]);
set("ddtburied.swf", 304, ["4. A pedra de animal escondido ganha no mapa do tesouro escondido", "pode ser trocada por equipamento de animal de estimação no mercado de", "pedras preciosas."]);
set("ddtburied.swf", 305, ["5. No ponto inicial do mapa do Tesouro Escondido, apertando o botão", "\"aumentar estrela\" a estrela do mapa do tesouro pode ser aumentada", "diretamente."]);
set("ddtburied.swf", 306, ["6. Depois de ganhar a missão do mapa do tesouro escondido, a missão", "precisa ser concluída e a recompensa recebida; só assim", "você pode continuar investindo para buscar tesouro."]);
set("ddtburied.swf", 307, ["7. Os baús de tesouro na parte superior são renovados toda semana", "após domingo às 23:59."]);

// ---- ddtcardsystem.swf ----
set("ddtcardsystem.swf", 69, ["Lavagem: Toda vez que o processo de lavagem é concluído, o valor de todos os atributos da carta atual pode ser alterado aleatoriamente 1 vez, mas o atributo não pode ser trocado. Ao fazer a lavagem, o valor de espírito indicado é gasto."]);
set("ddtcardsystem.swf", 70, ["Troca: Depois que a lavagem é concluída, você pode clicar no botão \"trocar\". Depois de clicar, o valor de atributo mais novo atual pode ser salvo."]);
set("ddtcardsystem.swf", 74, ["1. Toda vez que uma caixa de carta é aberta, uma quantidade", "determinada de valor de espírito de carta é obtida; o valor de espírito", "de carta aumenta o nível do slot de carta."]);
set("ddtcardsystem.swf", 75, ["2. Cada carta tem três tipos: ouro, prata e bronze;", "toda vez que uma caixa de carta é aberta há uma chance", "determinada de obter carta de cobre, e uma chance muito pequena", "de melhorar a carta atual."]);
set("ddtcardsystem.swf", 76, ["3. O nível de cada slot de carta pode subir; depois que o nível", "sobe, o atributo base do slot de carta", "aumenta; ao subir de nível, o valor de", "espírito é gasto."]);
set("ddtcardsystem.swf", 77, ["4. O atributo de um slot de carta sem carta", "não pode ser ativado."]);

// ---- ddtconsortion.swf + ddtconsortion1.swf (same content, different charIds) ----
for (const swf of ["ddtconsortion.swf", "ddtconsortion1.swf"]) {
  const off = swf === "ddtconsortion.swf" ? 0 : 8;
  set(swf, 96 + off, ["1. A ação militar da Sociedade registra o sucesso e o", "desempenho da Sociedade e de seus", "membros na guerra de", "hegemonia da Sociedade."]);
  set(swf, 97 + off, ["3. A guerra de hegemonia da Sociedade ocorre todo sábado", "entre 19:00 e 20:00; na sua Sociedade os jogadores que", "ficarem entre os 20 primeiros por pontos pessoais ganham", "recompensa generosa."]);
  set(swf, 98 + off, ["2. Na classificação da guerra de hegemonia da Sociedade,", "quanto mais alto estiver sua Sociedade, mais", "pontos de experiência de embelezamento de colar", "externo ela ganha."]);
  set(swf, 99 + off, ["5. Toda semana, a Sociedade que ficar entre as 8 primeiras", "na classificação de aumento semanal de patrimônio ganha", "autorização para participar das guerras de hegemonia da Sociedade."]);
  set(swf, 100 + off, ["4. Na nova região, as guerras de hegemonia da Sociedade", "começam duas semanas depois que o servidor abre."]);
  const off2 = swf === "ddtconsortion.swf" ? 0 : 8;
  set(swf, 115 + off2, ["1.Começa quando o BOSS da Sociedade atinge o nível 3."]);
  set(swf, 116 + off2, ["3.Na batalha contra o BOSS da Sociedade, ganha-se honra e valor", "de doação individual; dentro do tempo", "determinado o golpe fatal no BOSS", "é concluído; todos os membros querem", "ganhar a recompensa extra do golpe fatal."]);
  set(swf, 117 + off2, ["2.O BOSS da Sociedade, de acordo com o líder, começa uma vez", "por dia e exige gastar a riqueza da", "Sociedade; dura 20 minutos.", "    "]);
  set(swf, 118 + off2, ["4.Os jogadores estão limitados a uma batalha contra o BOSS", "da Sociedade por dia."]);
  set(swf, 119 + off2, ["5.O líder pode gastar a riqueza da Sociedade", "para estender o tempo do golpe fatal, podendo usar isso no máximo", "3 vezes por dia. Cada vez", "aumenta 10 minutos; o tempo estendido deve ser usado", "dentro da duração do golpe fatal."]);
  const off3 = swf === "ddtconsortion.swf" ? 0 : 8;
  set(swf, 136 + off3, ["1. A ordem da Sociedade é uma ordem com alto lucro, completada", "dentro da Sociedade."]);
  set(swf, 137 + off3, ["muito trabalho, muita recompensa"]);
  set(swf, 138 + off3, ["2. Cada vez que uma ordem é emitida, o conteúdo é aleatório."]);
  set(swf, 139 + off3, ["3. Cada ordem dura 6 horas; a ordem que não terminar dentro de 6 horas", "falha."]);
  set(swf, 140 + off3, ["4.Quanto mais alto o nível da Sociedade, maior o gasto de riqueza e a", "dificuldade da ordem, mas a recompensa também aumenta."]);
  set(swf, 141 + off3, ["5. Cada pessoa recebe recompensa diferente conforme a situação,"]);
  set(swf, 142 + off3, ["6. No clube da Sociedade, fique atento para concluir a situação dentro de", "\"ordem da Sociedade\"."]);
  set(swf, 143 + off3, ["7. Ordens não concluídas podem ser reiniciadas aleatoriamente,", "o novo pagamento aleatório custa 500 cupons."]);
  set(swf, 144 + off3, [" alto lucro"]);
  set(swf, 145 + off3, ["completada dentro da Sociedade"]);
  set(swf, 146 + off3, ["dura 6 horas"]);
}

// ---- ddtelitegame.swf ----
set("ddtelitegame.swf", 21, ["O Elite               é vinculado e formado pelo", "grupo                 , é no formato de batalha atlética individual. Consiste", "em 2 fases:                     e                     ."]);
set("ddtelitegame.swf", 23, ["A partida por pontos ocorre na sala aberta pelo jogador; o horário", "de início é todo sábado entre         . A Partida", "dos 16 Mais Fortes ocorre por comparação do sistema; o horário de abertura é", "todo sábado entre         ."]);
set("ddtelitegame.swf", 24, ["A partida por pontos começa com 1000 pontos; a vitória soma 10 pontos,", "a derrota reduz 10 pontos. Ao mesmo tempo, o lado vencedor", "recebe ponto de bônus de tempo; o ponto de bônus de tempo soma", "no máximo 5 pontos de uma vez. Se o jogador perder a conexão", "ou saia de propósito, é considerado como derrota."]);
set("ddtelitegame.swf", 25, ["Jogadores com classificação         de pontos podem participar da", "Partida dos 16 Mais Fortes. A Partida dos 16 Mais Fortes é feita por eliminação individual,", "cada partida dura 10 minutos, e quando os 10 minutos terminam,", "o resultado é decidido pelo dano total."]);
set("ddtelitegame.swf", 26, ["Na corrida de entrada de 16 para 8, de 8 para 4, semifinal e", "final, o horário de batalha do sistema é ajustado para", "        . Antes da partida começar, o jogador deve", "se preparar e ficar on-line esperando na área do jogo;", "o sistema envia o convite para o jogo nesse horário", "e entra na sala de batalha; jogadores que não entrarem a tempo", "são automaticamente desistentes."]);
set("ddtelitegame.swf", 27, ["Se o jogador participar da partida por pontos, ganha recompensa extra de experiência; depois de entrar nos 16", "mais fortes, pode receber grande recompensa; jogadores que ficarem entre os três primeiros", "da classificação ganham recompensa muito maior."]);
set("ddtelitegame.swf", 28, ["ponto da partida"]);
set("ddtelitegame.swf", 29, ["Partida dos 16 Mais Fortes"]);
set("ddtelitegame.swf", 32, ["nível 30-40"]);
set("ddtelitegame.swf", 33, ["nível 41-60"]);
set("ddtelitegame.swf", 36, ["Durante a partida por pontos, apenas jogadores que participarem mais de 10 vezes da corrida por pontos", "podem participar da Partida dos 16 Mais Fortes."]);

// ---- ddtemail.swf ----
set("ddtemail.swf", 36, ["Ao usar o e-mail preste atenção", "ao seguinte:"]);
set("ddtemail.swf", 37, ["1.Cupons, dinheiro e itens vinculados não podem ser enviados pelo correio."]);
set("ddtemail.swf", 38, ["5. Quando os e-mails chegarem, verifique", "os pagamentos com atenção para evitar ser enganado."]);
set("ddtemail.swf", 39, ["4.As mensagens são válidas por     dias, depois", "são excluídas."]);
set("ddtemail.swf", 40, ["3.O destinatário pode clicar no destinatário no canto superior esquerdo e escolher", "amigos ou a lista da sociedade."]);
set("ddtemail.swf", 41, ["2.Depois que o remetente envia, os pagamentos dentro do destinatário", "são reenviados para você."]);

// ---- ddtgiftsystem.swf ----
set("ddtgiftsystem.swf", 66, ["    Depois que o jogador atinge o nível 16, pode usar a caixa", "de presentes."]);
set("ddtgiftsystem.swf", 67, ["Jogadores de nível menor que 16 podem receber presentes; depois do nível 16", "podem usar a caixa de presentes para visualizar os presentes", "obtidos."]);
set("ddtgiftsystem.swf", 68, ["O desenvolvimento do nível de charme está relacionado aos presentes obtidos. Quanto", "mais presentes bonitos forem obtidos, mais rápido o valor de charme", "se desenvolve."]);
set("ddtgiftsystem.swf", 69, ["Os presentes na caixa de presentes são guardados por tempo indeterminado."]);
set("ddtgiftsystem.swf", 70, ["No Salão de Jogos ou no Cais de Exploração, os presentes dados nas", "informações do jogador podem ser visualizados. Assim é possível dar", "presentes rapidamente para amigos."]);
set("ddtgiftsystem.swf", 71, ["Nos registros de presentes ficam guardados no máximo 10 registros de presentes", "dados/recebidos. Registros em excesso são adicionados excluindo a", "mensagem mais antiga do final da página."]);
set("ddtgiftsystem.swf", 72, ["De cada vez só pode ser escolhido um tipo de presente para dar a um amigo.", "O mesmo presente pode ser dado em grande quantidade."]);

// ---- ddthall.swf ----
set("ddthall.swf", 204, ["Missão disponível"]);
set("ddthall.swf", 208, ["Missão disponível"]);
set("ddthall.swf", 210, ["Missão atual"]);
set("ddthall.swf", 212, ["Missão atual"]);

// ---- ddtroom.swf ----
set("ddtroom.swf", 173, ["1.Jogadores acima do", "nível 20 podem participar", "do evento"]);
set("ddtroom.swf", 174, ["2. Ao final da batalha apenas", "os pontos são acumulados"]);
set("ddtroom.swf", 175, ["3. Para acessório aleatório é necessário", "cupom vinculado; quando o cupom", "vinculado for insuficiente,", "cupom pode ser usado"]);
set("ddtroom.swf", 176, ["4. A recompensa é enviada por", "correio depois que o evento termina,", "apenas a recompensa correspondente", "à maior pontuação pode ser", "recebida"]);

// ---- ddtshop.swf ----
set("ddtshop.swf", 86, ["Chapéu"]);
set("ddtshop.swf", 90, ["Conjunto"]);
set("ddtshop.swf", 91, ["Óculos"]);
set("ddtshop.swf", 92, ["Acessório", "facial"]);
set("ddtshop.swf", 93, ["Olhos"]);
set("ddtshop.swf", 95, ["Cabelo"]);
set("ddtshop.swf", 100, ["Chapéu"]);
set("ddtshop.swf", 101, ["Óculos"]);
set("ddtshop.swf", 104, ["Conjunto"]);

// ---- ddtstore.swf + ddtstore(1).swf: shared forge-help popups (Transfer/Fortalecer/Fusão/Encaixe/Síntese/Evolução) ----
const TRANSFER_INTRO = ["    Usando o sistema de transferência, dois itens do mesmo tipo podem", "transferir entre si o atributo de fortalecimento, o nível de fortalecimento,", "o furo selado e a pérola. Ao transferir", "você deve prestar atenção aos seguintes pontos:"];
const TRANSFER_3 = ["3. O equipamento da esquerda e da direita deve ser do mesmo tipo."];
const TRANSFER_1 = ["1. A taxa de sucesso da transferência de atributo é de 100%."];
const TRANSFER_4 = ["4. Depois de transferir, o atributo de fortalecimento dos dois equipamentos,", "o atributo de síntese e o furo selado são trocados entre si e", "ficam vinculados."];
const TRANSFER_2 = ["2. Porém, dentro do prazo de validade, apenas equipamentos de qualidade", "acima de refinado podem usar a opção de transferência de", "atributo."];
const TRANSFER_5 = ["5. A taxa de transferência é menor que 10000 de ouro."];
const STRENGTHEN_INTRO = ["    Pelo sistema de fortalecimento você aumenta o dano", "das suas armas e a defesa dos seus equipamentos. Ao fortalecer,", "preste atenção aos seguintes", "pontos:"];
const STRENGTHEN_1 = ["1. Itens que podem ser fortalecidos: arma, chapéu e roupa."];
const STRENGTHEN_2 = ["2. A cada fortalecimento bem-sucedido, o dano da arma", "aumenta 10% em relação ao anterior; a defesa do chapéu e da roupa", "aumenta 10% em relação ao anterior."];
const STRENGTHEN_3 = ["3. Conforme o nível de fortalecimento sobe, a quantidade de pedra de", "fortalecimento necessária em cada nível também aumenta.", "Virando VIP através de recarga ou aumentando o nível da forja", "da sua Sociedade, você pode aumentar a experiência", "que cada pedra de fortalecimento concede."];
const STRENGTHEN_4 = ["4. Ao selecionar \"adicionar tudo\", clicando no botão de fortalecer, todas as", "pedras de fortalecimento se esgotam, ou a quantidade de pedras de fortalecimento necessária para", "fortalecer o equipamento atual se esgota."];
const FUSION_INTRO = ["    Para transformar itens de nível baixo em nível avançado, o", "sistema de fusão pode te ajudar. Ao fazer a", "fusão, preste atenção aos", "seguintes pontos:"];
const FUSION_1 = ["1. O tipo de item depende do tipo do item que você quer fundir. Depois que os 4 espaços", "de fusão estiverem completamente preenchidos, você pode começar a fazer a fusão."];
const FUSION_RESULT = ["O prazo de validade do item resultante é o menor prazo de validade entre os itens da fusão.", "(O prazo de validade do equipamento obtido pela fusão", "é de 3 dias.)"];
const FUSION_2 = ["2. Usando Pedra do Sapo, Pedra da Tartaruga, Pedra do Dragão, Pedra do Limão, Pérola, Anel,", "Identificação e outros fragmentos de item é possível fazer a fusão para", "um item de nível mais avançado."];
const FUSION_3 = ["3. Fundindo 4 pedras de síntese, anéis, identificações, pérolas ou fragmentos do mesmo tipo", "o item de nível avançado correspondente pode ser produzido."];
const FUSION_RING1 = ["Porém, a fusão só pode ser feita quando o anel e a identificação tiverem o mesmo nome e nível;", "o anel e a identificação obtidos pela fusão", "têm atributo de síntese 0."];
const FUSION_RING2 = ["Porém, a fusão só pode ser feita quando o item do tipo fragmento tiver o mesmo nome e nível", "."];
const FUSION_RING3 = ["O anel e a identificação, fundidos, podem chegar no máximo a +5."];
const SOCKET_INTRO = ["    Pelo sistema de encaixe você pode encaixar pérolas para adicionar efeito", "extra ao equipamento. Ao encaixar,", "preste atenção aos seguintes pontos:"];
const SOCKET_1 = ["1. Ao fortalecer, o slot de fortalecimento da arma, da roupa ou do chapéu é", "aberto; usando a broca, o furo selado", "é aberto."];
const SOCKET_RESULT = ["Com o slot de fortalecimento, fortalecendo você pode chegar ao nível mais alto,", "e pode encaixar pérola de qualquer nível;", "no furo selado, usando a broca o nível", "pode ser elevado; pérola que exceda o nível", "do slot atual não pode ser encaixada."];
const SOCKET_2 = ["2. O slot se divide em três tipos: ataque, defesa e atributo. No slot correspondente", "a pérola relacionada pode ser encaixada."];
const SOCKET_3 = ["3. A pérola de ataque adiciona efeito de ataque; a pérola de defesa adiciona efeito especial ao", "ser atacado; a pérola de atributo adiciona atributo ao seu", "equipamento."];
const SOCKET_REMOVE = ["Para remover uma pérola encaixada é preciso gastar 500 cupons."];
const SYNTH_INTRO = ["    O sistema de síntese adiciona o atributo da pedra de monstro sagrado", "ao seu equipamento ou arma. Ao sintetizar", "preste atenção aos seguintes pontos:"];
const SYNTH_1 = ["1.A pedra de monstro sagrado pode ser adicionada a qualquer equipamento,", "pedras de monstro sagrado diferentes adicionam atributos diferentes."];
const SYNTH_2 = ["2. Pedras de monstro sagrado de nível mais avançado têm", "taxa de sucesso menor ao serem adicionadas ao equipamento."];
const SYNTH_3 = ["3. Cada atributo de cada equipamento recebe efeito de apenas uma pedra", "de monstro sagrado."];
const SYNTH_4 = ["4. Pedra de monstro sagrado de nível baixo não pode", "sobrepor o efeito de uma de nível mais avançado."];
const UPGRADE_INTRO = ["1. Boina, Roupa e Acessório, Arma, Auxiliar,", "depois de fortalecidos até o nível 12,", "podem ser evoluídos; após a evolução o valor", "do equipamento pode ser bastante aumentado."];
const UPGRADE_CHANCE_RESET = ["3. O valor de sorte é zerado todo dia às 24:00; por", "isso recomendamos concluir a evolução", "de uma vez."];
const UPGRADE_CHANCE_GAIN = ["2. Cada vez que a evolução falha, um certo", "valor de sorte é obtido; quanto mais alto for o valor", "de sorte, maior também", "será a chance de evolução."];
const ENCHANT_INTRO3 = ["3. Você pode elevar o encanto do equipamento com a Conta de Sabedoria.", "A Conta de Sabedoria de nível baixo pode ser fundida", "para níveis mais altos.", "Conforme o nível aumenta, a taxa de sucesso", "do encanto também aumenta."];
const ENCHANT_1 = ["1. Equipamentos podem receber encanto. Armas com", "dano mais alto podem receber", "mais efeito."];
const ENCHANT_2 = ["2. Quando o encanto sobe com sucesso você recebe", "uma habilidade especial no equipamento; você pode aumentar o atributo", "dessa habilidade com o encanto."];
const ENCHANT_4 = ["4. Quando o encanto da arma e do equipamento chega ao", "nível 10, um efeito especial é obtido."];

for (const [charId, val] of Object.entries({ 181: TRANSFER_INTRO, 182: TRANSFER_3, 183: TRANSFER_1, 184: TRANSFER_4, 185: TRANSFER_2, 186: TRANSFER_5, 188: STRENGTHEN_INTRO, 189: STRENGTHEN_1, 190: STRENGTHEN_2, 191: STRENGTHEN_3, 192: STRENGTHEN_4, 194: FUSION_INTRO, 195: FUSION_1, 196: FUSION_RESULT, 197: FUSION_2, 198: FUSION_3, 203: FUSION_RING1, 204: FUSION_RING2, 205: FUSION_RING3, 207: SOCKET_INTRO, 208: SOCKET_1, 209: SOCKET_RESULT, 210: SOCKET_2, 211: SOCKET_3, 214: SOCKET_REMOVE, 216: SYNTH_INTRO, 217: SYNTH_1, 218: SYNTH_2, 219: SYNTH_3, 220: SYNTH_4, 385: UPGRADE_INTRO, 386: UPGRADE_CHANCE_RESET, 387: UPGRADE_CHANCE_GAIN })) {
  set("ddtstore(1).swf", Number(charId), val);
}
for (const [charId, val] of Object.entries({ 195: TRANSFER_INTRO, 196: TRANSFER_3, 197: TRANSFER_1, 198: TRANSFER_4, 199: TRANSFER_2, 200: TRANSFER_5, 202: STRENGTHEN_INTRO, 203: STRENGTHEN_1, 204: STRENGTHEN_2, 205: STRENGTHEN_3, 206: STRENGTHEN_4, 208: ENCHANT_INTRO3, 209: ENCHANT_1, 210: ENCHANT_2, 211: ENCHANT_4, 213: FUSION_INTRO, 214: FUSION_1, 215: FUSION_RESULT, 216: FUSION_2, 217: FUSION_3, 222: FUSION_RING1, 223: FUSION_RING2, 224: FUSION_RING3, 226: SOCKET_INTRO, 227: SOCKET_1, 228: SOCKET_RESULT, 229: SOCKET_2, 230: SOCKET_3, 233: SOCKET_REMOVE, 235: SYNTH_INTRO, 236: SYNTH_1, 237: SYNTH_2, 238: SYNTH_3, 239: SYNTH_4, 404: UPGRADE_INTRO, 405: UPGRADE_CHANCE_RESET, 406: UPGRADE_CHANCE_GAIN })) {
  set("ddtstore.swf", Number(charId), val);
}

// ---- ddttexpsystem.swf ----
set("ddttexpsystem.swf", 46, ["4. Quanto mais alto for o nível de treino,", "maior será o aumento de atributo em", "cada nível."]);
set("ddttexpsystem.swf", 47, ["1. Usando a Poção de Treino você pode obter", "experiência de treino."]);
set("ddttexpsystem.swf", 48, ["2. Poções de Treino podem ser obtidas em missões."]);
set("ddttexpsystem.swf", 49, ["3. O aumento de atributo obtido pelo treino", "é permanente, e não desaparecerá mesmo que", "o nível do equipamento mude."]);
set("ddttexpsystem.swf", 50, ["5. O limite máximo de nível de treino de cada atributo é", "o nível do avatar + 5."]);
set("ddttexpsystem.swf", 51, ["6. O aumento de vida obtido pelo treino de vida", "é a vida base do avatar. Pode ser afetado por colares e", "habilidades da Sociedade."]);
set("ddttexpsystem.swf", 52, ["Pelo sistema de treino os atributos base do avatar", "podem ser elevados. Ao treinar, preste atenção", "aos seguintes pontos:"]);

// ---- ddtvipview.swf (VIP privilege list, mostly 1 record = 1 full sentence) ----
set("ddtvipview.swf", 105, ["1. Recompensa de missão começa a partir de 3 estrelas", "2. Bônus de experiência de fortalecimento de 50%", "3.", "4. Batalha contra o boss é desbloqueada", "5. A ferramenta de suporte de mira pode ser usada gratuitamente 7 vezes por dia.", "6. A conclusão de missão com um toque aumenta 4 vezes", "7. O auxiliar de plantio pode ser usado gratuitamente", "8. O quinto slot de habilidade do animal de estimação pode ser desbloqueado.", "9. O Deus da Colheita pode ser comprado", "10. O Desejo de Milanda é desbloqueado gratuitamente: Presente de extensão de etapa,", "Palha de resgate, Presente de tirar carta, Vento de cura, Poder divino,", "Mestre de treino, Superman de abrir caixa.", "11. O limite máximo de cupom vinculado aumenta 3999", "12. O bônus de experiência de batalha multiplica por 2.2.", "13. O dinheiro VIP pode ser aberto 15 vezes por dia.", "14. Ao perder na batalha, a recompensa cortada é reduzida à metade.", "15. Desconto de 30% para tirar carta em servidor remoto", "16. Pacote de presente VIP de nível 12: Broca, Poção de Treino, Acessório, Caixa", "de carta, Pérola, Fragmento de arma divina, Semente.", " "]);
set("ddtvipview.swf", 106, ["Pacote de presente VIP de nível 12"]);
set("ddtvipview.swf", 109, ["O anúncio de todos os servidores ficará on-line, o intervalo de tempo é de 1 hora"]);
set("ddtvipview.swf", 113, ["1. Recompensa de missão começa a partir de 3 estrelas", "2. Bônus de experiência de fortalecimento de 50%", "3.", "4. O auxiliar de plantio pode ser usado gratuitamente", "5. O quinto slot de habilidade do animal de estimação pode ser desbloqueado.", "6. Batalha contra o boss é desbloqueada", "7. A ferramenta de suporte de mira pode ser usada gratuitamente 6 vezes por dia.", "8. A conclusão de missão com um toque aumenta 3 vezes", "9. O Desejo de Milanda é desbloqueado gratuitamente: Presente de extensão de etapa,", "Palha de resgate, Presente de tirar carta, Vento de cura, Poder divino,", "Mestre de treino, Superman de abrir caixa.", "10. O limite máximo de cupom vinculado aumenta 3999", "11. O bônus de experiência de batalha multiplica por 2.1.", "12. O dinheiro VIP pode ser aberto 13 vezes por dia.", "13. Ao perder na batalha, a recompensa cortada é reduzida à metade.", "14. Desconto de 30% para tirar carta em servidor remoto", "15. Pacote de presente VIP de nível 11: Broca, Poção de Treino, Acessório, Caixa", "de carta, Pérola, Fragmento de arma divina, Semente.", " "]);
set("ddtvipview.swf", 114, ["Pacote de presente VIP de nível 11"]);
set("ddtvipview.swf", 116, ["Superman de abrir caixa."]);
set("ddtvipview.swf", 117, ["O Deus da Colheita pode ser comprado"]);
set("ddtvipview.swf", 123, ["1. Recompensa de missão começa a partir de 3 estrelas", "2. Bônus de experiência de fortalecimento de 50%", "3.", "4. O quinto slot de habilidade do animal de estimação pode ser desbloqueado.", "5. Batalha contra o boss é desbloqueada", "6. A ferramenta de suporte de mira pode ser usada gratuitamente 5 vezes por dia.", "7. A conclusão de missão com um toque aumenta 3 vezes", "8. O Desejo de Milanda é desbloqueado gratuitamente: Presente de extensão de etapa,", "Palha de resgate, Presente de tirar carta, Vento de cura, Poder divino,", "Mestre de treino, Superman de abrir caixa.", "9. O limite máximo de cupom vinculado aumenta 3999", "10. O bônus de experiência de batalha multiplica por 2.", "11. O dinheiro VIP pode ser aberto 12 vezes por dia.", "12. Ao perder na batalha, a recompensa cortada é reduzida à metade.", "13. Desconto de 20% para tirar carta em servidor remoto", "14. Pacote de presente VIP de nível 10: Broca, Poção de Treino, Acessório, Caixa", "de carta, Pérola, Fragmento de arma divina.", " "]);
set("ddtvipview.swf", 124, ["Pacote de presente VIP de nível 10"]);
set("ddtvipview.swf", 126, ["O auxiliar de plantio pode ser usado gratuitamente"]);
set("ddtvipview.swf", 130, ["Fragmento de arma divina."]);
set("ddtvipview.swf", 132, ["1. Recompensa de missão começa a partir de 3 estrelas", "2. Bônus de experiência de fortalecimento de 50%", "3.", "4. Batalha contra o boss é desbloqueada", "5. A ferramenta de suporte de mira pode ser usada gratuitamente 4 vezes por dia.", "6. A conclusão de missão com um toque aumenta 3 vezes", "7. O Desejo de Milanda é desbloqueado gratuitamente: Presente de extensão de etapa,", "Palha de resgate, Presente de tirar carta, Vento de cura, Poder divino,", "Mestre de treino, Superman de abrir caixa.", "8. O limite máximo de cupom vinculado aumenta 2999", "9. O bônus de experiência de batalha multiplica por 1.9.", "10. O dinheiro VIP pode ser aberto 11 vezes por dia.", "11. Ao perder na batalha, a recompensa cortada é reduzida à metade.", "12. Desconto de 20% para tirar carta em servidor remoto", "13. Pacote de presente VIP de nível 9: Broca, Poção de Treino. Acessório, Caixa", "de carta, Pérola, Fragmento de arma divina."]);
set("ddtvipview.swf", 135, ["O quinto slot de habilidade do animal de estimação pode ser desbloqueado."]);
set("ddtvipview.swf", 136, ["Pacote de presente VIP de nível 9"]);
set("ddtvipview.swf", 140, ["1. Recompensa de missão começa a partir de 3 estrelas", "2. Bônus de experiência de fortalecimento de 50%", "3.", "4. Batalha contra o boss é desbloqueada", "5. O Desejo de Milanda é desbloqueado gratuitamente: Presente de extensão de etapa,", "Palha de resgate, Presente de tirar carta, Vento de cura, Poder divino,", "Mestre de treino.", "6. O limite máximo de cupom vinculado aumenta 2999", "7. A conclusão de missão com um toque aumenta 2 vezes", "8. O bônus de experiência de batalha multiplica por 1.8.", "9. O dinheiro VIP pode ser aberto 10 vezes por dia.", "10. Ao perder na batalha, a recompensa cortada é reduzida à metade.", "11. Desconto de 20% para tirar carta em servidor remoto", "12. Pacote de presente VIP de nível 8: Broca, Poção de Treino, Acessório, Caixa", "de carta, Pérola."]);
set("ddtvipview.swf", 143, ["Mestre de treino."]);
set("ddtvipview.swf", 144, ["Pacote de presente VIP de nível 8"]);
set("ddtvipview.swf", 145, ["A ferramenta de suporte de mira pode ser usada gratuitamente 3 vezes por dia."]);
set("ddtvipview.swf", 146, ["Pérola."]);
set("ddtvipview.swf", 149, ["1. Recompensa de missão começa a partir de 3 estrelas", "2. Bônus de experiência de fortalecimento de 50%", "3.", "4. O Desejo de Milanda é desbloqueado gratuitamente: Presente de extensão de etapa,", "Palha de resgate, Presente de tirar carta, Vento de cura, Poder divino.", "5. O limite máximo de cupom vinculado aumenta          ", "6. A conclusão de missão com um toque aumenta 2 vezes", "7. O bônus de experiência de batalha multiplica por 1.7.", "8. O dinheiro VIP pode ser aberto 9 vezes por dia.", "9. Ao perder na batalha, a recompensa cortada é reduzida à metade.", "10. Desconto de 20% para tirar carta em servidor remoto", "11. Pacote de presente VIP de nível 7: Broca, Poção de Treino, Acessório, Caixa", "de carta.", " "]);
set("ddtvipview.swf", 151, ["Divino"]);
set("ddtvipview.swf", 153, ["Pacote de presente VIP de nível 7"]);
set("ddtvipview.swf", 155, ["Batalha contra o boss é desbloqueada"]);
set("ddtvipview.swf", 157, ["poder."]);
set("ddtvipview.swf", 160, ["1. Recompensa de missão começa a partir de 3 estrelas", "2. Bônus de experiência de fortalecimento de 50%", "3. O Desejo de Milanda é desbloqueado gratuitamente: Presente de extensão de etapa, Palha de resgate,", "Presente de tirar carta, Vento de cura.", "4. O limite máximo de cupom vinculado aumenta 29999", "5. A conclusão de missão com um toque aumenta 2 vezes", "6. O bônus de experiência de batalha multiplica por 1.8.", "7. Ao perder na batalha, a recompensa não será cortada.", "8. Desconto de 20% para tirar carta em servidor remoto", "9. Pacote de presente VIP de nível 6: Pedra de fortalecimento, Pedra de síntese, Poção de experiência,", "Pedra sagrada, Broca, Carta, Acessório.", "a"]);
set("ddtvipview.swf", 161, ["Pacote de presente VIP de nível 6"]);
set("ddtvipview.swf", 162, ["Vento de cura."]);
set("ddtvipview.swf", 163, ["Acessório."]);
set("ddtvipview.swf", 166, ["Ao abrir de uma vez por 6 meses, o VIP chega ao nível 6, e os seguintes privilégios", "são obtidos:"]);
set("ddtvipview.swf", 168, ["1. Recompensa de missão começa a partir de 2 estrelas", "2. Bônus de experiência de fortalecimento de 25%", "3. O Desejo de Milanda é desbloqueado gratuitamente: Presente de extensão de etapa,", "Palha de resgate, Presente de tirar carta.", "4. O limite máximo de cupom vinculado aumenta 1999", "5. A conclusão de missão com um toque aumenta 2 vezes", "6. O bônus de experiência de batalha multiplica por 1.5.", "7. O dinheiro VIP pode ser aberto 7 vezes por dia.", "8. Ao perder na batalha, a recompensa cortada é reduzida à metade.", "9. Desconto de 10% para tirar carta em servidor remoto            ", "10. Pacote de presente VIP de nível 5: Pedra de fortalecimento, Pedra de síntese,", "Poção de experiência, Pedra sagrada, Broca, Poção de Treino."]);
set("ddtvipview.swf", 169, ["Pacote de presente VIP de nível 5"]);
set("ddtvipview.swf", 171, ["Presente de tirar carta."]);
set("ddtvipview.swf", 172, ["Poção de Treino."]);
set("ddtvipview.swf", 174, ["1. Recompensa de missão começa a partir de 2 estrelas", "2. Bônus de experiência de fortalecimento de 35%", "3. O Desejo de Milanda é desbloqueado gratuitamente: Presente de extensão de etapa, Palha de resgate.", "4. O limite máximo de cupom vinculado aumenta 19999", "5. O bônus de experiência de batalha multiplica por 1.4.", "6. Ao perder na batalha, a recompensa não será cortada.", "7. Desconto de 10% para tirar carta em servidor remoto", "8. Pacote de presente VIP de nível 4: Pedra de fortalecimento, Pedra de síntese, Poção de experiência,", "Pedra sagrada, Broca."]);
set("ddtvipview.swf", 175, ["Pacote de presente VIP de nível 4"]);
set("ddtvipview.swf", 180, ["Ao abrir de uma vez por 3 meses, o VIP chega ao nível 4, e os seguintes privilégios", "são obtidos:"]);
set("ddtvipview.swf", 182, ["palha."]);
set("ddtvipview.swf", 184, ["1. Recompensa de missão começa a partir de 2 estrelas", "2. Bônus de experiência de fortalecimento de 25% ", "3.", "4. O limite máximo de cupom vinculado aumenta 999", "5. A conclusão de missão com um toque aumenta 1 vez", "6. O bônus de experiência de batalha multiplica por 1.3.", "7. O dinheiro VIP pode ser aberto 5 vezes por dia", "8. Ao perder na batalha, a recompensa cortada é reduzida à metade.", "9. Desconto de 10% para tirar carta em servidor remoto", "10. Pacote de presente VIP de nível 3: Pedra de fortalecimento, Pedra de síntese,", "Poção de experiência, Pedra sagrada."]);
set("ddtvipview.swf", 185, ["Pacote de presente VIP de nível 3"]);
set("ddtvipview.swf", 187, ["Pedra sagrada."]);
set("ddtvipview.swf", 189, ["O Desejo de Milanda é desbloqueado gratuitamente:"]);
set("ddtvipview.swf", 191, ["1. Recompensa de missão começa a partir de 2 estrelas", "2. Bônus de experiência de fortalecimento de 25%", "3. O limite máximo de cupom vinculado aumenta 999", "4. A conclusão de missão com um toque aumenta 1 vez", "5. O bônus de experiência de batalha multiplica por 1.2.", "6. O dinheiro VIP pode ser aberto 4 vezes por dia.", "7. Ao perder na batalha, a recompensa cortada é reduzida à metade.", "8. Desconto de 10% para tirar carta em servidor remoto", "9. Pacote de presente VIP de nível 2: Pedra de fortalecimento, Pedra de síntese,", "Poção de experiência.", " "]);
set("ddtvipview.swf", 192, ["Pacote de presente VIP de nível 2"]);
set("ddtvipview.swf", 194, ["Poção de experiência."]);
set("ddtvipview.swf", 197, ["1. Recompensa de missão começa a partir de 2 estrelas", "2. Bônus de experiência de fortalecimento de 25%", "3. O bônus de experiência de batalha multiplica por 1.1.", "4. Ao perder na batalha, a recompensa não será cortada.", "5. Pacote de presente VIP de nível 1: Pedra de fortalecimento, Pedra de síntese."]);
set("ddtvipview.swf", 198, ["Ao abrir de uma vez por 1 mês, o VIP chega ao nível 1,", "os seguintes privilégios são obtidos:"]);

// ---- dragonboat.swf ----
set("dragonboat.swf", 35, ["1. As recompensas de classificação desta região e da região já ultrapassada", "podem ser obtidas novamente; nesta região e na região a ultrapassar, de forma", "igual, alcançando o ponto de evento desejado a recompensa pode ser ganha."]);
set("dragonboat.swf", 36, ["2. Quando o nível de conclusão do barco-dragão atingir 80%, todo o", "tempo de ganho em dobro de experiência da região recebe mais 24 horas", "adicionadas; quando o nível de conclusão atingir 100%, todo o tempo de", "ganho em triplo de experiência da região recebe mais 24 horas adicionadas."]);
set("dragonboat.swf", 37, ["3. Os pontos acumulados no evento devem ser trocados dentro de 48", "horas após o fim do evento; depois desse tempo são trocados", "automaticamente por experiência ou pontos de contribuição."]);
set("dragonboat.swf", 40, ["3.Depois de 48 horas do fim da atividade", "a EXP pode ser trocada", "automaticamente."]);
set("dragonboat.swf", 41, ["2.No momento da atividade, depois que os jogadores do Bombom", "passarem pelas fases principais, a \"Estátua do Rei", "Bombom\" se abre. Ao alcançar 80%", "você ganha EXP em dobro por 24 horas,", "ao alcançar 100% você ganha EXP em triplo e 24", "horas adicionais."]);
set("dragonboat.swf", 42, ["1.As recompensas são classificadas em", "principal e cruzada."]);

// ---- enchant.swf ----
set("enchant.swf", 7, ["1. Os tipos de equipamento mágico podem ser adicionados a braceletes e anéis;", "equipamentos mágicos recebem o atributo de magia."]);
set("enchant.swf", 8, ["2. A fase de adição de magia tem no máximo 5 fases; conforme o nível de magia", "sobe, o atributo que pode ser adicionado também sobe."]);
set("enchant.swf", 9, ["3. Depois que a adição de magia é bem-sucedida, o efeito da magia", "mostra efeito a partir do nível 5 de fusão da roupa inicial."]);

// ---- farm.swf ----
set("farm.swf", 182, ["1. A Árvore Brilhante pode subir de nível regando com amor,", "a partir de um certo nível é necessário coletar luz,", "depois que a Árvore Brilhante termina de coletar", "luz ela avança para a próxima fase de", "crescimento!"]);
set("farm.swf", 183, ["2. A Árvore Brilhante pode invocar o Demônio Borboleta;", "depois que o Demônio Borboleta é despertado, pode entrar em estado", "de alimentação; depois que a alimentação termina, o Demônio", "Borboleta pode ser morto e a recompensa", "pode ser recebida!"]);
set("farm.swf", 184, ["3. Ajudando um amigo a criar monstros você ganha Amor,", "Amor e Luz do Sol também podem ser obtidos", "matando monstros."]);
set("farm.swf", 185, ["4. Para o Demônio Borboleta entre servidores é necessário", "estar casado para formar o par."]);
set("farm.swf", 504, ["    As rações produzidas podem ser usadas para alimentar animais,", "alimentar traz muitos benefícios; ao fazer ração para", "animais de estimação e ao alimentar, preste atenção aos", "seguintes pontos:"]);
set("farm.swf", 505, ["6. A ração aumenta o limite superior de experiência do animal de estimação."]);
set("farm.swf", 506, ["1. Ao fazer a ração do animal de estimação, a planta correspondente é gasta;", "quando a quantidade de plantas for menor que uma, a ração do animal de estimação", "não pode ser feita."]);
set("farm.swf", 507, ["2. Depois de feita, a ração do animal de estimação fica guardada na mochila."]);
set("farm.swf", 508, ["4. Ao alimentar o animal de estimação, arraste a ração do animal de estimação até a tela", "de alimentação e depois clique no botão alimentar."]);
set("farm.swf", 509, ["3. A ração aumenta o grau de saciedade do animal de estimação; o grau de saciedade", "afeta o atributo adicionado quando o equipamento participa da batalha."]);
set("farm.swf", 510, ["5. Quando a saciedade do animal de estimação for menor que um coração, o animal", "de estimação não pode batalhar."]);
set("farm.swf", 512, ["2. Quando o auxiliar é usado, todos os produtos atuais da fazenda", "serão retirados."]);
set("farm.swf", 513, ["1 Ao usar o assistente de plantio, você precisa escolher a semente e selecionar", "automaticamente o horário de plantio."]);
set("farm.swf", 514, ["3. Se o auxiliar for interrompido antes de terminar o horário automático de plantio, apenas", "uma parte da ração do animal de estimação é obtida.", "A semente restante não pode ser devolvida."]);
set("farm.swf", 515, ["4. Depois de começar o plantio automático, a fazenda fica em estado bloqueado,", "nenhuma operação pode ser feita."]);
set("farm.swf", 516, ["5. No início, se a semente estiver em falta, uma mensagem aparece no mercado, e por", "conta própria também pode ser comprada no mercado."]);

// ---- foodactivity.swf ----
set("foodactivity.swf", 61, ["3. Depois de obter a quantidade de preparo", "você pode escolher o modo de preparo você mesmo."]);
set("foodactivity.swf", 62, ["1. O tempo acumulado on-line é medido em", "minutos; depois de entrar na sessão", "do jogo começa a ser calculado,", "quem acumular uma certa", "quantidade on-line", "recebe uma certa quantidade de preparo."]);
set("foodactivity.swf", 63, ["4. Depois que o preparo terminar, clique na imagem", "da comida deliciosa para receber a recompensa, não se", "esqueça. Dica: a quantidade de preparo é zerada todo dia", "às 24:00, por favor", "use a tempo!"]);
set("foodactivity.swf", 64, ["2. Depois que o jogador obtém a quantidade de preparo,", "deve usar e terminar a quantidade de preparo da fase anterior,", "mas assim o acúmulo on-line da fase", "seguinte pode ser feito."]);
set("foodactivity.swf", 67, ["1. As regras de cálculo do grau de atividade", "estão ligadas à atividade do sistema;", "quem alcançar certa atividade ganha", "quantidade de preparo.         "]);
set("foodactivity.swf", 68, ["2. O jogador pode usar o grau de atividade acumulado em todas as", "quantidades de preparo. Por exemplo:", "o jogador A, com grau de atividade 60, obtém", "certa quantidade de preparo; o jogador B,", "com grau de atividade 80, obtém certa quantidade de preparo; a", "quantidade de preparo obtida por jogadores com", "grau de atividade 80 é A+B."]);

// ---- gotopage.swf ----
set("gotopage.swf", 47, ["1. O nível mínimo para participar da partida é nível 20; o horário", "de participação na partida é de segunda a sexta, das 19:30 às 21:30", "."]);
set("gotopage.swf", 49, ["2. No horário da Partida da Sociedade, quando a partida começa, pode-se lutar", "livremente ou como Sociedade no formato 2 vs 2, recebendo pontos da partida", "da Sociedade. O campo de batalha é ajustado por padrão para entre", "servidores."]);
set("gotopage.swf", 50, ["3. Em cada batalha dentro da Sociedade, os pontos são dados conforme a situação", "de vitória, a taxa de dano, o número de inimigos e a taxa de cura; além disso, todo dia nas", "primeiras 10 batalhas da Partida da Sociedade", "os pontos recebidos são maiores."]);
set("gotopage.swf", 51, ["4. No horário da Partida da Sociedade, cada batalha recebe uma certa taxa de", "recompensa de experiência. (Todo dia há um limite máximo de recompensa de experiência)", "Jogadores com nível máximo recebem recompensa", "extra"]);
set("gotopage.swf", 52, ["5. Todo semana o sistema dá recompensas correspondentes aos pontos recebidos;", "jogadores de níveis diferentes têm recompensas diferentes. A recompensa é", "enviada por correio; toda semana o campeão da Sociedade recebe a", "roupa especial \"deus da guerra\"."]);
set("gotopage.swf", 53, ["no formato 2 vs 2"]);
set("gotopage.swf", 54, ["Campo de batalha"]);
set("gotopage.swf", 58, ["nas primeiras 10 batalhas"]);
set("gotopage.swf", 59, ["recompensa extra"]);
set("gotopage.swf", 60, ["entre"]);
set("gotopage.swf", 61, ["pode-se lutar livremente ou como Sociedade"]);
set("gotopage.swf", 62, ["recompensa de experiência"]);

// ---- grouppurchase.swf ----
set("grouppurchase.swf", 7, ["1. Durante o evento de compra em grupo, pela interface do evento você pode", "comprar itens disponíveis para compra em grupo; comprando o mesmo item em", "outros locais não é possível aproveitar o desconto de compra", "em grupo."]);
set("grouppurchase.swf", 8, ["3. Para as recompensas de classificação é necessário alcançar a quantidade de compra", "determinada e também alcançar a", "classificação determinada."]);
set("grouppurchase.swf", 9, ["2. O dinheiro disponível em cada evento de compra em grupo não é", "fixo, mas pode ser verificado pela", "interface de compra."]);
set("grouppurchase.swf", 10, ["4. Quando a compra em grupo terminar, a taxa de cupom devolvida", "aumentará de acordo com a quantidade total de compras", "daquela região."]);
set("grouppurchase.swf", 11, ["5. Quando itens de compra em grupo são comprados com cupom,", "depois que o evento termina, a quantidade de cupom determinada", "pode ser devolvida conforme a taxa."]);
set("grouppurchase.swf", 12, ["6. A coluna de classificação aparecerá em pouco tempo;", "se houver problema de sincronização na exibição da quantidade de", "compras, você pode resolver fechando a interface,", "abrindo de novo e atualizando as", "informações."]);

// ---- guildmemberweek.swf ----
set("guildmemberweek.swf", 18, ["1. Durante o evento, quando a contribuição do jogador alcançar      ,", "ele ganha a recompensa de dedicação; além disso", "pode ser classificado."]);
set("guildmemberweek.swf", 19, ["2. Depois que o evento termina, os dez primeiros jogadores na", "classificação de nível de contribuição recebem as recompensas", "correspondentes às suas classificações, e também recebem extra a", "recompensa de aumento de aposta."]);
set("guildmemberweek.swf", 20, ["3. Jogadores de cargo acima de autoridade na Sociedade podem fazer", "aumento de aposta nas recompensas dos 10", "primeiros."]);
set("guildmemberweek.swf", 21, ["4. A quantidade de cupom de aumento de aposta de nenhuma posição pode ser", "menor que      ; depois do aumento de aposta,", "10% de imposto é deduzido dos cupons de aumento de aposta. A", "quantidade de cupom após a dedução do imposto é a quantidade de cupom", "que essa posição vai ganhar."]);
set("guildmemberweek.swf", 22, ["5. Quando o nível de contribuição dos jogadores for igual,", "a classificação é feita conforme quem alcançar esse", "nível de contribuição primeiro."]);
set("guildmemberweek.swf", 26, ["6. As informações de classificação são renovadas a cada dez minutos.", "As recompensas, depois que o evento termina, são enviadas por e-mail", "para as caixas de e-mail dos jogadores. Não se esqueça de", "verificar quando chegar a hora."]);

// ---- gypsyshop.swf ----
set("gypsyshop.swf", 16, ["3. A loja se renova automaticamente uma vez todo dia ao meio-dia, às 18:00,", "o jogador pode renovar manualmente gastando cupom."]);
set("gypsyshop.swf", 17, ["1. A Cigana vende diversos itens e fragmentos de arma,", "e também pode ter, com certa chance, cartas raras (Carta de totem", "de montaria, carta de chamado de troca de montaria, carta de título)"]);
set("gypsyshop.swf", 19, ["2. A Cigana aparece todo dia por volta do meio-dia, às 12:00, e desaparece", "à noite quando chega às 24:00", "；"]);

// ---- halloween.swf ----
set("halloween.swf", 14, ["3. Se você receber e-mails contendo cartas, por favor pegue as cartas o mais rápido possível e suba sua classificação."]);
set("halloween.swf", 15, ["1. Jogadores que coletarem Cartas Fantasma suficientes podem ganhar armas ou equipamentos Fantasma exclusivos."]);
set("halloween.swf", 16, ["2. A Carta Fantasma não é vinculada e pode ser vendida, mas recomendamos não vendê-la nem excluí-la até o fim do evento."]);
set("halloween.swf", 17, [" 4、Jogadores que completarem o número mínimo de cartas receberão a classificação e as recompensas correspondentes. Caso contrário, &nbsp;a classificação da recompensa é considerada a partir de 11&apos;."]);

// ---- hometemple.swf ----
set("hometemple.swf", 286, ["1. O cadeado do templo é desbloqueado no nível 35 e você recebe", "a primeira forma de oferenda. Depois, a cada", "10 níveis você tem uma nova forma de", "oferenda."]);
set("hometemple.swf", 288, ["2. A Oração Antiga pode ser elevada dando oferendas.", "Oferendas de nível baixo têm chance de cair em", "etapas; oferendas de nível alto podem ser", "compradas diretamente."]);
set("hometemple.swf", 289, ["3. Depois de dar a oferenda, a chance de golpe crítico", "vai aumentar. Com golpe crítico pequeno a", "experiência da oferenda aumenta 150%; com golpe", "crítico grande a experiência da oferenda aumenta", "200%."]);
set("hometemple.swf", 290, ["4. A oferenda na sua mochila será usada", "por padrão. Se houver dois tipos diferentes de oferenda,", "a oferenda de nível mais baixo será", "usada primeiro."]);

// ---- horse.swf ----
set("horse.swf", 493, ["3. Na fase de elevar nível/elevar estrela da montaria,", "conforme o nível diferente, diferentes habilidades", "de montaria são obtidas."]);
set("horse.swf", 494, ["1. No sistema de elevação da montaria, o nível de estrela da montaria", "pode ser elevado; conforme o nível de estrela sobe,", "o atributo adicionado também aumenta."]);
set("horse.swf", 495, ["4. No sistema de elevação de cada nível é gasta 1", "ferramenta de elevação; marcando \"elevar automaticamente para a próxima estrela\"", "de nível, use a ferramenta para elevar a montaria", "para o próximo nível."]);
set("horse.swf", 496, ["2. Depois que a montaria sobe de nível e alcança 10 estrelas,", "ao mesmo tempo que recebe a elevação de nível de montaria também", "há mudança de estado."]);
set("horse.swf", 499, ["3. Clicando no botão \"obter\" sob a imagem da habilidade não obtida,", "você pode entender especificamente o", "acesso da habilidade."]);
set("horse.swf", 500, ["1. O limite máximo de nível de habilidades diferentes também é diferente;", "clicando no botão de nível sob a imagem da habilidade,", "entre no sistema de elevação de nível."]);
set("horse.swf", 501, ["2. Clique na habilidade de montaria que você possui; quando o equipamento", "tiver a habilidade, pode ser usada em batalha."]);

// ---- kingbless.swf (structured list; number/separator records normalized, content translated) ----
set("kingbless.swf", 26, ["1", ",", "poder de proteção divina", ":", "Atributo de aprimoramento de atributo básico do personagem", "100 pontos, efeito de portal e área secreta.", "2", ",", " renovação de animal de estimação", ":", "Ter um animal de estimação, 1 vez por dia", "gratuita.", "3", ",", " pérola mestra", ":", "3 vezes por dia, obtenção gratuita de pérola.", "4", ",", "espírito da vara", ":", "Aumenta mais 1 vez a quantidade de uso diário", "das varas.", "5", ",", " guerreiro explorador", ":", "O portal de batalha do BOSS com muita gente.", "abrir, além disso 1 chance gratuita de ganhar por dia.", "6", ",", " espírito de energia", ":", "Use no avatar da missão a poção de energia que você", "comprou na interface de missões."]);
set("kingbless.swf", 28, ["Na assinatura única de 1 mês, você obtém os seguintes privilégios."]);
set("kingbless.swf", 32, ["1", ",", "poder de proteção divina", ":", "Atributo de aprimoramento de atributo básico do personagem", "150 pontos, efeito de portal e área secreta.", "2", ",", " renovação de animal de estimação", ":", "Ter um animal de estimação, 2 vezes por dia", "gratuita.", "3", ",", " pérola mestra", ":", "4 vezes por dia, obtenção gratuita de pérola.", "4", ",", "espírito da vara", ":", "Aumenta mais 1 vez a quantidade de uso diário", "das varas.", "5", ",", " guerreiro explorador", ":", "O portal de batalha do BOSS com muita gente.", "abrir, além disso 1 chance gratuita de ganhar por dia.", "6", ",", " espírito de energia", ":", "Use no avatar da missão a poção de energia que você", "comprou na interface de missões."]);
set("kingbless.swf", 33, ["Na assinatura única de 3 meses, você obtém os seguintes privilégios."]);
set("kingbless.swf", 39, ["1", ",", "poder de proteção divina", ":", "Atributo de aprimoramento de atributo básico do personagem", "200 pontos, efeito de portal e área secreta.", "2", ",", " renovação de animal de estimação", ":", "Ter um animal de estimação, 2 vezes por dia", "gratuita.", "3", ",", " pérola mestra", ":", "6 vezes por dia, obtenção gratuita de pérola.", "4", ",", "espírito da vara", ":", "Aumenta mais 2 vezes a quantidade de uso diário", "das varas.", "5", ",", " guerreiro explorador", ":", "O portal de batalha do BOSS com muita gente.", "abrir, além disso 2 chances gratuitas de ganhar por dia.", "6", ",", " espírito de energia", ":", "Use no avatar da missão a poção de energia que você", "comprou na interface de missões."]);
set("kingbless.swf", 40, ["Na assinatura única de 6 meses, você obtém os seguintes privilégios."]);

// ---- kingdivision.swf ----
set("kingdivision.swf", 95, ["3.Nível básico 30."]);
set("kingdivision.swf", 96, ["1.\"Mestre Rei\" inclui Qualificações em Servidor Único, Promoção", "em Servidor Único, Qualificações entre Todos os", "Servidores e Nocaute entre Todos os Servidores."]);
set("kingdivision.swf", 97, ["4.O tempo de competição dura 1 hora por dia e cada", "jogador tem direito a participar 10 vezes da batalha."]);
set("kingdivision.swf", 98, ["2.A qualificação é ajustada conforme a pontuação total da Sociedade; as", "16 melhores Sociedades avançam para a próxima rodada. O campeão", "do servidor pode participar da eliminatória entre todos os servidores."]);
set("kingdivision.swf", 100, ["5.A Sociedade vencedora ganha 10 pontos, a Sociedade perdedora", "perde 3 pontos. Se o período de pareamento passar de 60", "segundos, o jogador vence por padrão e usa 1", "chance de competição."]);
set("kingdivision.swf", 101, ["6.Para cada recompensa você precisa de mais de N pontos", "pessoais."]);
set("kingdivision.swf", 102, ["7.Se você sair da Sociedade durante o evento, seus pontos", "pessoais serão zerados."]);

// ---- labyrinth.swf ----
set("labyrinth.swf", 43, ["1. Na área secreta pode-se desafiar uma vez por dia; usando pedra", "sagrada mágica você pode multiplicar o benefício."]);
set("labyrinth.swf", 44, ["3. Nas incursões da área secreta, no andar mais alto já ultrapassado,", "todos os benefícios podem ser obtidos; é necessário gastar uma", "quantidade determinada de Medalha."]);
set("labyrinth.swf", 45, ["4. Usando o ouro da área secreta, ferramentas misteriosas podem ser", "compradas na loja da área secreta."]);
set("labyrinth.swf", 46, ["2. Nas incursões da área secreta, nas incursões que ficaram paradas,", "clicando de novo em atacar a incursão pode continuar no espelho", "misterioso, ou depois de desafiar a carta pode continuar; jogadores acima de VIP9", "podem fazer incursão rápida."]);
set("labyrinth.swf", 51, ["1. O guerreiro pode desafiar 1 vez por dia; usando a pedra sagrada", "do limite      , a recompensa a ganhar", "pode dobrar."]);
set("labyrinth.swf", 52, ["3.No limite de arraste, gastando uma certa quantidade de ouro,", "arrastando você pode obter os ganhos de", "nível mais alto."]);
set("labyrinth.swf", 53, ["2.Se o jogador não morrer, pode ser puxado de volta", "ao limite novamente, voltar ao ponto de controle e", "continuar o desafio, clicando em carregar de novo", "você pode começar", "o desafio."]);
set("labyrinth.swf", 54, ["4.Usando o dinheiro do limite, peças valiosas podem ser", "compradas no centro de compras."]);

// ---- latentenergy.swf ----
set("latentenergy.swf", 5, ["1.O equipamento ativado pode ganhar atributo potencial,", "o atributo potencial pode mudar na", "forja.       "]);
set("latentenergy.swf", 6, ["2. A ativação de potencial do equipamento é bem-sucedida;", "cada vez exige gastar pedra de energia."]);
set("latentenergy.swf", 7, ["3.O atributo potencial tem efeito por tempo determinado,", "depois que o tempo passa ele falha; ative de novo", "com pedra de energia."]);
set("latentenergy.swf", 8, ["4.Pedra de energia de melhor qualidade ativa atributo", "potencial de nível mais avançado; o potencial", "avançado completa o nível mais baixo."]);
set("latentenergy.swf", 9, ["5.Ativar o atributo potencial pode dar um novo", "atributo."]);

// ---- lightroad.swf ----
set("lightroad.swf", 99, ["1. No horário do evento, coletando o item correspondente", "a recompensa correspondente pode ser obtida; quanto mais tempo você continuar,", "mais rica será a recompensa que pode ser obtida."]);
set("lightroad.swf", 100, ["2. O item do evento não pode ser obtido novamente; o progresso dos", "itens a coletar deve ser acompanhado."]);
set("lightroad.swf", 101, ["3. Todos os itens coletados precisam ser feitos todo dia dentro", "do horário do evento do jogo."]);

// ---- luckstar.swf ----
set("luckstar.swf", 32, ["1. Para iniciar a Estrela da Super Sorte", "é necessário gastar Estrela da Sorte."]);
set("luckstar.swf", 33, ["3. A recompensa mínima do Reservatório de", "Acúmulo de Cupom é de 1000 cupons."]);
set("luckstar.swf", 34, ["2. Cada vez que uma Estrela da Sorte é gasta,", "50 cupons se acumulam no Reservatório de", "Acúmulo de Cupom."]);
set("luckstar.swf", 35, ["4. A pessoa cuja sorte sair o desconto de cupom", "ganha todos os cupons no Reservatório de", "Acúmulo de Cupom."]);
set("luckstar.swf", 36, ["5. Quando a quantidade de Estrelas da Sorte usadas atingir       ", "a recompensa de classificação é ganha."]);
set("luckstar.swf", 37, ["6. Depois que sua sorte sair o desconto de cupom,", "a quantidade de cupom no Reservatório de", "Acúmulo de Cupom será no mínimo", "1000 cupons."]);

// ---- magichouse.swf ----
set("magichouse.swf", 95, ["1.Para ativar as estatísticas relacionadas, você deve coletar armas.", "Depois de ativar, complete uma elevação mágica para", "aumentar as estatísticas de ativação base."]);
set("magichouse.swf", 96, ["2. Armas não vinculadas ficam em estado vinculado durante o evento."]);
set("magichouse.swf", 97, ["3. Para elevar a magia é necessária a poção mágica, produzida", "através do baú do tesouro mágico"]);
set("magichouse.swf", 107, ["1.De alguns itens é possível obter essência. Essa essência pode ser", "usada para fusão."]);
set("magichouse.swf", 108, ["2.Depois que a extração for feita, de itens diferentes se obtém", "quantidades diferentes de essência. Para isso são necessários", "materiais diferentes!"]);
set("magichouse.swf", 109, ["3.Depois que a essência de um item for retirada, o item", "desaparecerá. Tenha cuidado, por favor."]);

// ---- magicstone.swf ----
set("magicstone.swf", 94, ["1.A Pedra Mágica pode ser obtida por exploração e", "batalhas de cena."]);
set("magicstone.swf", 95, ["2.Pedras Mágicas de cores diferentes representam qualidades diferentes,", "Pedras Mágicas de tipos diferentes têm atributos diferentes."]);
set("magicstone.swf", 96, ["3.Pedras Mágicas podem ser combinadas para melhorar,", "combinar pedras de qualidade requer confirmação."]);
set("magicstone.swf", 97, ["4.A Pedra Mágica pode chegar no máximo ao Nv 10 e, conforme", "o nível sobe, os atributos das pedras também aumentam."]);
set("magicstone.swf", 98, ["5.A exploração de Pedra Mágica dá pontos, e esses pontos", "podem ser usados para troca."]);
set("magicstone.swf", 99, ["6.Pedras Mágicas com o mesmo atributo não podem ser", "combinadas de novo. (Atributo único e pedra de dois cantos)"]);

// ---- magpiebridge.swf ----
set("magpiebridge.swf", 430, ["1. Os jogadores podem procurar, na pista do caminho, a Ponte da Pega", "que a Tecelã construiu com a ajuda do pastor da Pega.", "Cada vez que encontrar uma pega, o grau da ponte", "da pega sobe um ponto; depois que a construção", "terminar, o pacote do festival das estrelas pode ser", "comprado", "；"]);
set("magpiebridge.swf", 431, ["2. Clicando no pato-mandarim você pode avançar e encontrar", "diversas condições; clicar no pato-mandarim gasta energia", "de movimento; andando você pode encontrar", "diversas recompensas de ferramentas", "；"]);
set("magpiebridge.swf", 432, ["3. Em cada fase de busca de tesouro de cada pista do caminho,", "você pode obter o pacote de presente do pastor e da Tecelã;", "no ponto final você recebe o baú do tesouro fixo", "rico de finalização", "；"]);
set("magpiebridge.swf", 433, ["4. Todo dia é possível obter gratuitamente 5 pontos de energia de movimento,", "a energia de movimento obtida por compra no segundo dia", "de estabelecimento permanece."]);

// ---- newfightlib.swf ----
set("newfightlib.swf", 75, ["Poder"]);
set("newfightlib.swf", 89, ["Poder"]);
set("newfightlib.swf", 123, ["Poder"]);
set("newfightlib.swf", 124, ["Poder"]);

// ---- newhandopencartoon.swf (pirate tutorial dialogue) ----
set("newhandopencartoon.swf", 176, ["Se não quer morrer, tire o tesouro agora, este mar é meu."]);
set("newhandopencartoon.swf", 379, ["O navio pirata está cada vez mais perto; o segredo do tesouro escondido nunca pode ser contado a eles..."]);
set("newhandopencartoon.swf", 399, ["Ah, finalmente chegaram ao píer, espero que um guerreiro nos salve."]);
set("newhandopencartoon.swf", 587, ["Parece que alguém está me chamando?"]);
set("newhandopencartoon.swf", 602, ["Piratas"]);
set("newhandopencartoon.swf", 605, ["Piratas"]);

// ---- newyearrice.swf ----
set("newyearrice.swf", 26, ["1. Colete os ingredientes para fazer o prato de", "Ano Novo correspondente", "2. Depois que o prato de Ano Novo for concluído,", "convide seus amigos para abrir juntos,", "depois de abrir, o anfitrião e os convidados recebem recompensa", "3. Com os membros completos na abertura, o anfitrião recebe recompensa extra", "4. Todo dia é possível receber 5 convites de prato de Ano Novo", "5. A recompensa é enviada por correio, por favor certifique-se", "de recebê-la"]);

// ---- petsbag.swf ----
set("petsbag.swf", 447, ["3. Depois que as formas de animais são chamadas, recebe-se o efeito de chamado:", "Proteção de vida e proteção de energia."]);
set("petsbag.swf", 448, ["1. Depois que formas de animais diferentes são chamadas,", "andam ao lado do jogador; vá para o salão."]);
set("petsbag.swf", 449, ["2. Para chamar formas de animais são necessárias as cartas de chamado", "correspondentes; as cartas são obtidas pela ferramenta de fusão do", "coração de proteção."]);
set("petsbag.swf", 451, ["4. Os efeitos de chamado das formas de animais podem se acumular, e também", "são adicionados automaticamente sobre o personagem."]);
set("petsbag.swf", 452, ["5. Melhorar aumenta a barra de atributo de equipamento do animal;", "depois que o equipamento do animal é vestido, o efeito permanece"]);
set("petsbag.swf", 453, ["6. Montarias de três estrelas ou mais podem se transformar em broto de experiência;", "depois de se transformar em broto de experiência, o animal desaparece; conforme o nível", "do animal sobe, a experiência a ser obtida também sobe"]);
set("petsbag.swf", 455, ["    O animal de estimação não apenas aumenta o atributo na batalha,", "mas também traz funções muito úteis. Ao usar o", "sistema de animal de estimação é necessário prestar atenção", "aos seguintes pontos:"]);
set("petsbag.swf", 456, ["1. Depois do nível 25, na fazenda de animais de estimação você pode escolher o animal", "de estimação que quiser."]);
set("petsbag.swf", 457, ["2. Depois que o animal de estimação é alimentado, ele ganha limite de experiência. Ao mesmo", "tempo, depois que a ração do animal de estimação é dada, o grau de", "felicidade do animal de estimação aumenta."]);
set("petsbag.swf", 458, ["3. Cada vez que o animal de estimação é levado para participar da batalha, o grau de felicidade", "do animal de estimação diminui."]);
set("petsbag.swf", 459, ["4. Conforme o grau de felicidade sobe, o atributo do animal de estimação também", "aumenta; quando está muito baixo o animal de estimação não pode ir à batalha."]);
set("petsbag.swf", 460, ["5. Com a planta cultivada na fazenda de animais de estimação, a ração do animal", "de estimação pode ser criada."]);
set("petsbag.swf", 461, ["6. Apenas os animais de estimação que vão à batalha podem afetar o atributo de batalha,", "ao mesmo tempo os animais de estimação que vão à batalha ganham experiência."]);
set("petsbag.swf", 462, ["7. O nível de estrela do animal de estimação afeta o atributo inicial e o desenvolvimento", "de atributo do animal; quanto mais estrelas, mais o poder também aumenta."]);
set("petsbag.swf", 463, ["8. O nível do animal de estimação não pode passar do nível atual do jogador."]);

// ---- playerdress.swf ----
set("playerdress.swf", 15, ["1. Você pode facilmente organizar e vestir qualquer moda aleatória,", "pode personalizar a aparência, no máximo pode personalizar", "três conjuntos."]);
set("playerdress.swf", 17, ["2. Depois que sua aparência atual for ajustada, você pode salvar", "a aparência novamente."]);
set("playerdress.swf", 21, ["3. Depois de salvo, a cor atual e todos os itens de moda que estão", "nela não podem ser trocados; além disso a aparência", "atual é salva."]);
set("playerdress.swf", 22, ["4. Você pode trocar a aparência aleatoriamente;", "depois de trocar, todos os fortalecimentos, sínteses etc. que", "estavam na moda anterior e todos os atributos transferidos são", "transferidos para a nova moda."]);
set("playerdress.swf", 23, ["5. Depois que a aparência da moda for vestida, o efeito da moda", "é calculado."]);
set("playerdress.swf", 25, ["6. Se o tempo da moda expirar ou faltar dinheiro, os", "atributos não podem ser transferidos durante a troca,", "é necessário transferir manualmente na forja."]);

// ---- quest.swf ----
set("quest.swf", 161, ["Você tem uma nova missão!"]);

// ---- rescue.swf ----
set("rescue.swf", 54, ["8. O grau de nível de estrela afeta a recompensa fixa que o jogador obtém. Na recompensa de", "alcançar a primeira estrela, você também recebe um pacote de presente de nível de estrela."]);
set("rescue.swf", 55, ["9. As atividades ficam abertas toda terça e quinta-feira, das 10:00 às 22:00."]);
set("rescue.swf", 56, ["1. O jogador precisa acertar o pintinho com o arco e flecha sem que ele morra, assim", "o pintinho se salva."]);
set("rescue.swf", 57, ["2. Depois que todos os pintinhos forem salvos e as doninhas eliminadas, a batalha", "é concluída com sucesso."]);
set("rescue.swf", 58, ["3. O ponto fraco da doninha é a cabeça; acertando a cabeça, ela pode ser morta", "com um único golpe."]);
set("rescue.swf", 59, ["4. Depois que todas as flechas forem usadas, ou se um pintinho morrer na missão, a batalha", "falha."]);
set("rescue.swf", 60, ["5.A vida de resgate e as flechas aumentam a chance de passar"]);
set("rescue.swf", 61, ["6. Toda vez que o evento for aberto, todos têm 3 chances de pular a contagem regressiva ao falhar", "em cada passagem. Quando a batalha for bem-sucedida, pode aparecer a carta de pular a contagem", "regressiva. Depois que a contagem regressiva terminar, pode-se batalhar de novo."]);
set("rescue.swf", 62, ["7. Acertando ouro ou diamante você pode aumentar os pontos correspondentes. Você pode", "elevar o grau de nível de estrela."]);

// ---- roulette.swf ----
set("roulette.swf", 29, ["    Bem-vindo à roleta da sorte! Desejamos boa sorte! Por favor", "preste atenção ao seguinte:"]);
set("roulette.swf", 30, ["1. O evento foi aberto, você tem direito a girar a roleta 1 vez."]);
set("roulette.swf", 31, ["2. A conversão de recarga em cupom só é válida", "durante o horário do evento."]);
set("roulette.swf", 32, ["3. O maior valor de conversão é          cupons."]);
set("roulette.swf", 33, ["4. Se o evento da roleta for fechado no meio, a taxa de conversão da recompensa", "é mantida até o evento terminar."]);
set("roulette.swf", 34, ["5. Todos os cupons obtidos vão direto para a mochila, ou", "são enviados por correio."]);

// ---- sevendaytarget.swf ----
set("sevendaytarget.swf", 73, ["1.Os eventos são atualizados com frequência."]);
set("sevendaytarget.swf", 74, ["2. Depois de completar o nível 25, as recompensas são enviadas para o", "seu correio."]);
set("sevendaytarget.swf", 75, ["3.As atividades só podem ser concluídas uma vez; as recompensas são vinculadas."]);
set("sevendaytarget.swf", 77, ["1. Jogadores recém-cadastrados podem entrar neste evento."]);
set("sevendaytarget.swf", 78, ["2. Tem efeito enquanto o evento durar, ou enquanto os sete dias de login", "se acumularem."]);
set("sevendaytarget.swf", 79, ["3. Todo dia a recompensa pode ser recebida uma vez de forma limitada; pode ser recebida", "dentro de sete dias de login."]);
set("sevendaytarget.swf", 80, ["4. Quando o evento do oitavo dia terminar, as recompensas não recebidas", "não podem mais ser recebidas."]);

// ---- sevendoubleicon.swf ----
set("sevendoubleicon.swf", 12, ["1. Todo dia é possível participar gratuitamente 3 vezes do evento", "de escolta."]);
set("sevendoubleicon.swf", 13, ["3. Se você participar do evento de escolta entre 12:00 e 14:00", "todo dia, as recompensas são dobradas."]);
set("sevendoubleicon.swf", 14, ["2. Quanto mais avançado for o veículo de escolta", "que você chamar, maior será a recompensa ao chegar", "ao último destino, e também", "maior será a velocidade de movimento."]);
set("sevendoubleicon.swf", 15, ["4. Durante a escolta você não pode sair", "da cena; se a contagem regressiva de escolta terminar", "sem que você chegue ao destino, a escolta", "fica incompleta."]);
set("sevendoubleicon.swf", 16, ["5. Durante a escolta, usando com eficácia as habilidades \"esconder\", \"saltar para frente\"", "e \"purificar\" você pode evitar", "problemas e evitar que o ganho de", "BUFF diminua."]);
set("sevendoubleicon.swf", 17, ["6. Os 4 primeiros jogadores a chegar ao destino", "aumentam a recompensa que vão ganhar."]);

// ---- storefinebringup.swf ----
set("storefinebringup.swf", 26, ["O jogador pode fazer a criação de acessório pela interface; depois de colocar o", "acessório que deseja obter no reservatório de criação, clicando em criar com um", "toque, o acessório criado engole", "todos os acessórios não trancados na mochila do jogador.", "Ao criar com um toque é necessário prestar atenção aos", "seguintes pontos:"]);
set("storefinebringup.swf", 27, ["1. Os acessórios usados ficam trancados diretamente na", "interface de Criação."]);
set("storefinebringup.swf", 28, ["2. Atualmente existem três qualidades de criação de acessórios; apenas quando", "o acessório de qualidade de criação mais baixa engole o acessório de qualidade", "de criação de nível mais alto, uma grande quantidade de", "Experiência é perdida"]);
set("storefinebringup.swf", 29, ["4. Dos acessórios criados, o de validade mais baixa terá a sua validade", "válida. Se você usar um acessório de curta duração para aumentar a experiência de um", "acessório de longa duração, a validade do acessório de curta", "duração será a válida."]);
set("storefinebringup.swf", 30, ["3. Acessórios trancados não podem ser engolidos, mas podem ser criados."]);

// ---- storefineforge.swf ----
set("storefineforge.swf", 42, ["1. Quando o jogador atingir o nível 50, a seção de evolução", "é desbloqueada."]);
set("storefineforge.swf", 43, ["2. Você só pode usar equipamentos de nível de evolução menor que o", "seu próprio para a evolução."]);
set("storefineforge.swf", 44, ["3. Você pode usar de uma vez todos os equipamentos não trancados.", "Ou clicando no botão \"evoluir\"", "você pode usar um único item para a", "evolução."]);
set("storefineforge.swf", 45, ["4. Os equipamentos usados para evoluir desaparecem."]);
set("storefineforge.swf", 46, ["5. O nível de evolução inicial é 0. O máximo pode ser 20."]);
set("storefineforge.swf", 125, ["1. Na criação de conjunto você pode fazer o processamento de diversas unidades de", "equipamento; tipos diferentes de conjunto gastam materiais diferentes;", "quando a criação é concluída você recebe o efeito da criação."]);
set("storefineforge.swf", 126, ["2. Os tipos de conjunto são cinco: pedra, cobre, prata, ouro e jade.", "É necessário criar em ordem; cada vez que a criação de conjunto", "atingir uma quantidade determinada, o efeito de atributo", "correspondente é adicionado."]);
set("storefineforge.swf", 127, ["3. Materiais de nível baixo podem ser sintetizados em materiais de nível alto.", "Alguns materiais podem ser obtidos na versão", "pesadelo."]);

// ---- superwinner.swf (dice mini-game; "⑥"/"①②③④⑤⑥" kept as-is, content translated) ----
set("superwinner.swf", 53, ["1. Um ", "⑥", " ganha o Prêmio da Sorte; dois ", "⑥", " ganham o Prêmio Superior; três ", "⑥", " ganham o Prêmio", "Seleto."]);
set("superwinner.swf", 54, ["2.Quatro pontos iguais (exceto ", "⑥", " ) Terceiro Prêmio"]);
set("superwinner.swf", 55, ["3. Seis pontos em sequência", "①②③④⑤⑥", ", ganha o Segundo Prêmio.", "(Para ganhar, a ordem dos dados não importa.)"]);
set("superwinner.swf", 56, ["4.Quatro ", "⑥", "ganham o Prêmio de Primeiro Lugar. Se mais de um jogador tirar quatro ", "⑥", " ao mesmo tempo, os pontos dos dados restantes serão somados. Quem tiver a maior pontuação ganha o Prêmio de ", "Campeão. Se as pontuações forem iguais (quem jogou os dados primeiro", "vence.)"]);
set("superwinner.swf", 57, ["5.Quando todos os prêmios de classificação do evento forem recebidos, o vencedor do Prêmio de", "Campeão é definido."]);
set("superwinner.swf", 58, ["Descrição dos Prêmios:"]);
set("superwinner.swf", 59, ["2. Os prêmios são dados por ordem de chegada, quem gira primeiro e ganha primeiro recebe."]);
set("superwinner.swf", 60, ["1. Prêmio da Sorte*32, Prêmio Superior *16, Prêmio Seleto *8, Terceiro", "Prêmio *4, Segundo Prêmio *2, Prêmio de Campeão *1."]);
set("superwinner.swf", 61, ["3. Se o vencedor não for definido durante o evento, os pontos dos dados decidem quem será o", "campeão, e o vencedor recebe os prêmios depois que o", "evento terminar."]);
set("superwinner.swf", 62, ["4. Todos os prêmios serão enviados para o correio dos jogadores."]);

// ---- times.swf ----
set("times.swf", 48, ["Abrir"]);

// ---- treasure.swf ----
set("treasure.swf", 105, ["Todo dia, na primeira entrada no jogo, há 1 chance de fazer a busca de tesouro;"]);
set("treasure.swf", 106, ["Quanto mais entradas consecutivas em um dia, mais chances de busca de tesouro você tem. Você pode ganhar no máximo 3 chances de busca de tesouro."]);
set("treasure.swf", 107, ["Se seus amigos corrigirem sua região 5 vezes, você ganha mais uma chance de busca de tesouro. Todo dia você pode receber no máximo 5 vezes de ajuda de correção, e essa ajuda não é transferida para o dia seguinte (é independente do número de entradas)."]);
set("treasure.swf", 108, ["Não há limite para ajudar seus amigos a corrigir, mas para o mesmo amigo você só pode corrigir 1 vez por dia；"]);
set("treasure.swf", 109, ["A chance de busca de tesouro deve ser usada naquele dia. É zerada todo dia às 24:00, não é transferida para o dia seguinte。"]);

// ---- treasurelost.swf ----
set("treasurelost.swf", 78, ["1. No horário do evento, o jogador pode jogar dados gratuitamente; os dados", "acionam eventos diferentes e há chances de ganhar recompensa de item"]);
set("treasurelost.swf", 79, ["3. Todo dia às 00:00 o evento é zerado; o jogador volta ao ponto", "inicial e recupera vida e energia"]);
set("treasurelost.swf", 80, ["2. Monstros mortos podem soltar itens; itens que caem podem ser", "trocados"]);
set("treasurelost.swf", 81, ["4. Depois que o evento termina, todas as ferramentas são excluídas; por favor", "use a tempo para não perder"]);
set("treasurelost.swf", 82, ["5. A recompensa em dobro só tem efeito nas recompensas do meio-dia; o efeito", "de recompensa em dobro não pode se acumular"]);

// ---- worldbosshelper.swf ----
set("worldbosshelper.swf", 18, ["1. O assistente de batalha pode ajudar automaticamente os jogadores", "a participar das batalhas contra o BOSS", "mundial."]);
set("worldbosshelper.swf", 19, ["3. Depois de configurar e ligar o assistente de batalha, é necessário", "ir para a área principal; mas o assistente de batalha,", "nas condições que aparecerem na interface, entra", "automaticamente na batalha; offline ou em", "outra área o assistente de batalha não pode ser usado."]);
set("worldbosshelper.swf", 20, ["2. Depois de ligar o assistente de batalha, nas batalhas contra o BOSS", "mundial, ele entra automaticamente na batalha no horário", "certo e usa o cupom correspondente. Se não houver cupom", "suficiente, o assistente de batalha se desliga", "automaticamente."]);
set("worldbosshelper.swf", 21, ["4. Enquanto o assistente de batalha estiver ativado,", "as configurações não podem ser mudadas; para poder mudar as configurações", "é necessário desligar o assistente primeiro."]);

console.log("TOTAL loaded:", Object.keys(T).reduce((a, k) => a + Object.keys(T[k]).length, 0), "entries");

// ---- merge into db, validating record counts; report mismatches and anything left untranslated ----
let applied = 0, mismatched = [], missing = [];
for (const [swf, entries] of Object.entries(db)) {
  for (const [charId, e] of Object.entries(entries)) {
    const pt = T[swf]?.[charId];
    if (!pt) { missing.push(`${swf}#${charId}`); continue; }
    if (pt.length !== e.tr.length) { mismatched.push(`${swf}#${charId} (pt=${pt.length} tr=${e.tr.length})`); continue; }
    e.pt = pt;
    applied++;
  }
}
writeFileSync(dbPath, JSON.stringify(db, null, 1));
console.log(`applied: ${applied}`);
console.log(`mismatched (${mismatched.length}):`, mismatched.join(", "));
console.log(`missing/untranslated (${missing.length}):`, missing.join(", "));
