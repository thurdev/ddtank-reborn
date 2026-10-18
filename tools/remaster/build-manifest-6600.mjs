#!/usr/bin/env node
// build-manifest-6600.mjs — m1-bitmap-text passo 4: a partir do levantamento verificado (OCR +
// conferência visual, ver research/6600/bitmap-turkish.tsv e o relatório da tarefa), grava:
//   - remaster/manifest-6600.csv (mesmo formato do manifest.csv da 4.1: category,file,source_swf,
//     source_file,width,height,pt_br) -- só as linhas P0/P1 abaixo (curadas à mão), não o pack inteiro
//     (os outros milhares de imagens exportadas continuam catalogadas só em bitmap-reuse.tsv/
//     bitmap-turkish.tsv pra uma leva futura).
//   - tools/remaster/prompts/win45-6600/<swf>__<sourceFile-sem-ext>.txt pros itens is_local=false
//     (mesmo formato dos prompts win45/ da 4.1, trocando "Vietnamese"->"Turkish" e sem a frase do fundo
//     verde chroma, que não se aplica aqui -- os exports do 6600 não são isolados em chroma key).
//   - research/6600/bitmap-local-strips.tsv pros is_local=true (tiras finas de texto, h<40 ou w/h>5,
//     sem arte/ícone misturado -- candidatos a tools/remaster/title-text.mjs --manifest remaster/
//     manifest-6600.csv, não ao lote de IA win45).
// Texto turco corrigido à mão (OCR bruto tinha erros de leitura em boa parte -- conferido visualmente
// com Read em ~15 amostras espalhadas pelas categorias, ver relatório da tarefa); PT-BR segue os termos
// já fixados em data/i18n/pt-BR/client-language-6600.txt (Sociedade=guild/Birlik/Lonca, etc.) e
// tools/i18n/fix-6600-terms.mjs.
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");

// swf, swfPath (relativo ao pack, raiz ou ui/turkey/swf), sourceFile, w, h, category, tr, pt, priority, local
const ROWS = [
  // ---- 01-boot-login ----------------------------------------------------------------------------------
  ["login.swf", "ui\\turkey\\swf\\login.swf", "3_login.ChooseRole.btnEnterTextBG.png", 128, 36, "01-boot-login", "Oyuna girin", "Entrar no jogo", "P0", true],
  ["login.swf", "ui\\turkey\\swf\\login.swf", "4_login.Rename.ModifyButtonbackgound.png", 116, 28, "01-boot-login", "Değiştir", "Alterar", "P0", true],

  // ---- 02-hall-icons (ddthallicon.swf: ícone 70x70 + legenda de 1-2 linhas embaixo) --------------------
  ["ddthallicon.swf", "ui\\turkey\\swf\\ddthallicon.swf", "116.png", 75, 70, "02-hall-icons", "Harika oyun", "Jogo incrivel", "P0", false],
  ["ddthallicon.swf", "ui\\turkey\\swf\\ddthallicon.swf", "132.png", 70, 70, "02-hall-icons", "Etkinlik", "Evento", "P0", false],
  ["ddthallicon.swf", "ui\\turkey\\swf\\ddthallicon.swf", "200.png", 179, 44, "02-hall-icons", "Buraya tikla", "Clique aqui", "P0", false],
  ["ddthallicon.swf", "ui\\turkey\\swf\\ddthallicon.swf", "34_assets.hallIcon.newYearRiceIcon.png", 70, 70, "02-hall-icons", "Yil Donumu Kutla", "Celebre o Ano Novo", "P0", false],
  ["ddthallicon.swf", "ui\\turkey\\swf\\ddthallicon.swf", "53_bombKing.hallEnterBtn.png", 70, 70, "02-hall-icons", "Ekstrim Sampiyona", "Campeonato Extremo", "P0", false],
  ["ddthallicon.swf", "ui\\turkey\\swf\\ddthallicon.swf", "138.png", 70, 70, "02-hall-icons", "Sinirli satis paketi", "Oferta por tempo limitado", "P0", false],
  ["ddthallicon.swf", "ui\\turkey\\swf\\ddthallicon.swf", "72_assets.hallIcon.christmasIcon.png", 70, 70, "02-hall-icons", "Soguk ve karli noel", "Natal gelado e nevado", "P0", false],
  ["ddthallicon.swf", "ui\\turkey\\swf\\ddthallicon.swf", "31_assets.hallIcon.magpiebridge.png", 70, 70, "02-hall-icons", "Saksagan perisi", "Fada da Pega", "P0", false],
  ["ddthallicon.swf", "ui\\turkey\\swf\\ddthallicon.swf", "4_assets.hallIcon.worshipTheMoon.png", 70, 70, "02-hall-icons", "Festival Ayi", "Festival da Lua", "P0", false],
  ["ddthallicon.swf", "ui\\turkey\\swf\\ddthallicon.swf", "13_assets.hallIcon.treasureLostIcon.png", 70, 70, "02-hall-icons", "Hazine avi savasi", "Guerra da Caca ao Tesouro", "P0", false],
  ["ddthallicon.swf", "ui\\turkey\\swf\\ddthallicon.swf", "21_assets.hallIcon.luckStoneIcon.png", 70, 70, "02-hall-icons", "Melegin duasi", "Oracao do Anjo", "P0", false],
  ["ddthallicon.swf", "ui\\turkey\\swf\\ddthallicon.swf", "39_assets.hallIcon.oldPlayerRegressIcon.png", 70, 70, "02-hall-icons", "Eski Oyuncu Geri Donusu", "Retorno do Jogador Veterano", "P0", false],
  ["ddthallicon.swf", "ui\\turkey\\swf\\ddthallicon.swf", "16_assets.hallIconl.sanxiaoBtn.png", 70, 70, "02-hall-icons", "Eleme ustasi", "Mestre da Eliminacao", "P0", false],
  ["ddthallicon.swf", "ui\\turkey\\swf\\ddthallicon.swf", "19_asset.hall.consortia.task.btn.png", 70, 70, "02-hall-icons", "Birlik misyonu", "Missao da Sociedade", "P0", false],
  ["ddthallicon.swf", "ui\\turkey\\swf\\ddthallicon.swf", "69_assets.hallIcon.newChickenBoxIcon.png", 70, 70, "02-hall-icons", "Hazine Tarlasi", "Campo do Tesouro", "P0", false],
  ["ddthallicon.swf", "ui\\turkey\\swf\\ddthallicon.swf", "41_assets.hallIcon.fightFootballTimeIcon.png", 70, 70, "02-hall-icons", "Azmetme Ani", "Momento de Garra", "P0", false],
  ["ddthallicon.swf", "ui\\turkey\\swf\\ddthallicon.swf", "25_assets.hallIcon.syahIcon.png", 70, 70, "02-hall-icons", "Savas Tanrisi", "Deus da Guerra", "P0", false],
  ["ddthallicon.swf", "ui\\turkey\\swf\\ddthallicon.swf", "68_assets.hallIcon.buriedIcon.png", 70, 70, "02-hall-icons", "Farkli boyutlu alan", "Zona Dimensional", "P0", false],
  ["ddthallicon.swf", "ui\\turkey\\swf\\ddthallicon.swf", "23_assets.hallIcon.survivalIcon.png", 70, 70, "02-hall-icons", "Hayatta kalma", "Sobrevivencia", "P0", false],
  ["ddthallicon.swf", "ui\\turkey\\swf\\ddthallicon.swf", "27_assets.hallIcon.petIsland.png", 70, 70, "02-hall-icons", "Pet Adasi Macerasi", "Aventura na Ilha dos Pets", "P0", false],
  ["ddthallicon.swf", "ui\\turkey\\swf\\ddthallicon.swf", "48_assets.hallIcon.guildmemberweekIcon.png", 70, 70, "02-hall-icons", "Lonca Katkisi", "Contribuicao da Sociedade", "P0", false],
  ["ddthallicon.swf", "ui\\turkey\\swf\\ddthallicon.swf", "58_assets.hallIcon.DDPlayIcon.png", 70, 69, "02-hall-icons", "DDT Nesesi", "Diversao DDT", "P0", false],
  ["ddthallicon.swf", "ui\\turkey\\swf\\ddthallicon.swf", "14_assets.hallIcon.rouletteGunIcon.png", 70, 70, "02-hall-icons", "Sans ruleti", "Roleta da Sorte", "P0", false],
  ["ddthallicon.swf", "ui\\turkey\\swf\\ddthallicon.swf", "24_assets.hallIcon.mysteriousRouletteIcon.png", 70, 70, "02-hall-icons", "Gizemli Cark", "Roda Misteriosa", "P0", false],
  ["ddthallicon.swf", "ui\\turkey\\swf\\ddthallicon.swf", "26_assets.hallIcon.horseRace.png", 70, 70, "02-hall-icons", "At yarisi", "Corrida de Cavalos", "P0", false],
  ["ddthallicon.swf", "ui\\turkey\\swf\\ddthallicon.swf", "11_assets.hallIcon.entertainmentIcon.png", 70, 70, "02-hall-icons", "Eglenceli atletizm", "Atletismo Divertido", "P0", false],
  ["ddthallicon.swf", "ui\\turkey\\swf\\ddthallicon.swf", "2_assets.hallIcon.catchInsect.png", 70, 70, "02-hall-icons", "Bocek savasi", "Captura de Insetos", "P0", false],
  ["ddthallicon.swf", "ui\\turkey\\swf\\ddthallicon.swf", "44_assets.hallIcon.groupPurchaseIcon.png", 70, 70, "02-hall-icons", "Grup Indirimi Tutkusu", "Paixao pela Compra em Grupo", "P0", false],

  // ---- 03-sala-partida (lista de salas, botoes de matchmaking, tela de loading com nome do modo) -------
  ["ddtroomlist.swf", "ui\\turkey\\swf\\ddtroomlist.swf", "10_asset.ddtroomlist.createRoom.png", 124, 55, "03-sala-partida", "oda kur", "Criar sala", "P0", false],
  ["ddtroomlist.swf", "ui\\turkey\\swf\\ddtroomlist.swf", "19_asset.ddtroomlist.quickLightAsset.png", 94, 96, "03-sala-partida", "Hizli grup olustur", "Criar grupo rapido", "P0", false],
  ["ddtroomlist.swf", "ui\\turkey\\swf\\ddtroomlist.swf", "2_asset.ddtroomlist.pvpBtn.encounter.png", 124, 55, "03-sala-partida", "Hizli eslestir", "Partida rapida", "P0", false],
  ["ddtroomlist.swf", "ui\\turkey\\swf\\ddtroomlist.swf", "5_asset.ddtroomlist.fastMatch.png", 124, 55, "03-sala-partida", "Hizli eslestir", "Partida rapida", "P0", false],
  ["ddtroomlist.swf", "ui\\turkey\\swf\\ddtroomlist.swf", "14_asset.ddtroomlist.right.title.png", 204, 44, "03-sala-partida", "Oyun salonu", "Salao de Jogos", "P0", false],
  ["ddtroomloading.swf", "ui\\turkey\\swf\\ddtroomloading.swf", "34_asset.roomLoading.GameMode_0.png", 136, 38, "03-sala-partida", "Ozgur Savas", "Guerra Livre", "P0", true],
  ["ddtroomloading.swf", "ui\\turkey\\swf\\ddtroomloading.swf", "5_asset.roomLoading.GameMode_26.png", 149, 34, "03-sala-partida", "Ring Savasi", "Guerra do Ringue", "P0", true],
  ["ddtroomloading.swf", "ui\\turkey\\swf\\ddtroomloading.swf", "6_asset.roomLoading.GameMode_42.png", 177, 39, "03-sala-partida", "Bocek savasi", "Guerra dos Insetos", "P0", true],
  ["ddtroomloading.swf", "ui\\turkey\\swf\\ddtroomloading.swf", "11_asset.roomLoading.GameMode_21.png", 169, 32, "03-sala-partida", "Birlik Yarismasi", "Competicao da Sociedade", "P0", true],
  ["ddtroomloading.swf", "ui\\turkey\\swf\\ddtroomloading.swf", "27_asset.roomLoading.GameMode_7.png", 130, 38, "03-sala-partida", "Uzak sunucu", "Instancia Remota", "P0", true],
  ["ddtroomloading.swf", "ui\\turkey\\swf\\ddtroomloading.swf", "29_asset.roomLoading.GameMode_2.png", 126, 38, "03-sala-partida", "duello yarisi", "Disputa de Duelo", "P0", true],
  ["ddtroomloading.swf", "ui\\turkey\\swf\\ddtroomloading.swf", "31_asset.roomLoading.GameMode_14.png", 90, 38, "03-sala-partida", "Elit mac", "Partida de Elite", "P0", true],
  ["ddtroomloading.swf", "ui\\turkey\\swf\\ddtroomloading.swf", "32_asset.roomLoading.GameMode_12.png", 90, 38, "03-sala-partida", "Turnuva", "Torneio", "P0", true],
  ["ddtroomloading.swf", "ui\\turkey\\swf\\ddtroomloading.swf", "8_asset.roomLoading.GameMode_3.png", 242, 32, "03-sala-partida", "Sunucular Arasi Savas", "Guerra Entre Servidores", "P0", true],

  // ---- 04-batalha-resultado (tela de derrota/sobrevivencia, popups do firstcore) ------------------------
  ["firstcore.swf", "ui\\turkey\\swf\\firstcore.swf", "260.png", 139, 138, "04-batalha-resultado", "Tiklayarak isleme devam edin", "Clique para continuar", "P0", false],
  ["gameiii.swf", "ui\\turkey\\swf\\gameiii.swf", "176.png", 274, 69, "04-batalha-resultado", "Basarisiz", "Falhou", "P0", false],
  ["gameiii.swf", "ui\\turkey\\swf\\gameiii.swf", "225.png", 203, 57, "04-batalha-resultado", "Basarisiz", "Falhou", "P0", false],
  ["gameover.swf", "ui\\turkey\\swf\\gameover.swf", "10_asset.core.survival.clearing.bg.png", 1000, 600, "04-batalha-resultado", "MULTI", "MULTI", "P0", false],
  ["gameover.swf", "ui\\turkey\\swf\\gameover.swf", "13_asset.takeoutCard.survival.InstructionBitmap.png", 293, 62, "04-batalha-resultado", "Hayatta kalma modunda, oldurmek ve sonuna kadar hayatta kalma cevirme sayisini arttiracaktir.", "No modo sobrevivencia, matar e sobreviver ate o fim vai aumentar o numero de giros.", "P0", false],
  ["gameover.swf", "ui\\turkey\\swf\\gameover.swf", "31_asset.experience.TotalExploitTxt.png", 147, 47, "04-batalha-resultado", "Toplam mukafat puani", "Pontos de recompensa total", "P0", false],
  ["gameover.swf", "ui\\turkey\\swf\\gameover.swf", "53_asset.takeoutCard.InstructionBitmap.png", 352, 53, "04-batalha-resultado", "Her oyuncu 2 kere ucretsiz olarak kupon kutusuna tiklayip hediye toplayabilir. Sonra kullanarak kutu acma sansini arttirabilirsin.", "Cada jogador pode clicar na caixa de cupons de graca 2 vezes para ganhar um presente. Depois disso, use itens para aumentar a chance de abrir a caixa.", "P0", false],
  ["gameover.swf", "ui\\turkey\\swf\\gameover.swf", "108_asset.experience.attachExpItemTxt_a0.png", 103, 25, "04-batalha-resultado", "VIP ayricaligi", "Privilegio VIP", "P0", true],
  ["gameover.swf", "ui\\turkey\\swf\\gameover.swf", "76_asset.experience.exploitExpItemTxt_a2.png", 105, 25, "04-batalha-resultado", "VIP ayricaligi", "Privilegio VIP", "P0", true],

  // ---- 05-atividade-diaria (abas normal/selecionado, hall) ------------------------------------------
  ["dayactivity.swf", "ui\\turkey\\swf\\dayactivity.swf", "11_day.activeBtn2.png", 103, 26, "05-atividade-diaria", "Gunluk aktivite", "Atividade Diaria", "P0", true],
  ["dayactivity.swf", "ui\\turkey\\swf\\dayactivity.swf", "12_day.activeBtn1.png", 98, 24, "05-atividade-diaria", "Gunluk aktivite", "Atividade Diaria", "P0", true],
  ["dayactivity.swf", "ui\\turkey\\swf\\dayactivity.swf", "13_day.activityBtn2.png", 99, 26, "05-atividade-diaria", "Gunluk etkinlik", "Evento Diario", "P0", true],
  ["dayactivity.swf", "ui\\turkey\\swf\\dayactivity.swf", "15_day.activityBtn1.png", 98, 22, "05-atividade-diaria", "Gunluk etkinlik", "Evento Diario", "P0", true],
  ["dayactivity.swf", "ui\\turkey\\swf\\dayactivity.swf", "3_day.receiveOver.png", 76, 31, "05-atividade-diaria", "Alinmis", "Resgatado", "P0", true],
  ["dayactivity.swf", "ui\\turkey\\swf\\dayactivity.swf", "36.png", 76, 79, "05-atividade-diaria", "Gunluk kazanclar", "Ganhos Diarios", "P0", false],

  // ---- 06-janelas-p1 (sociedade, verificacao de idade, ajuda) -----------------------------------------
  ["consortionii.swf", "ui\\turkey\\swf\\consortionii.swf", "33_asset.consortion.remainFrame.word.png", 295, 149, "06-janelas-p1", "Birligin serveti su anda yetersiz, servet arttirma yollari: 1.Birlik gorevini tamamlama 2.Birlik savasina katilma 3.Servet bagisinda bulunma. Bagista bulunmak istiyor musunuz?", "O tesouro da Sociedade esta insuficiente no momento, formas de aumentar o tesouro: 1.Completar missao da Sociedade 2.Participar da guerra da Sociedade 3.Fazer uma doacao. Deseja fazer uma doacao?", "P1", false],
  ["consortionii.swf", "ui\\turkey\\swf\\consortionii.swf", "2_magichouse.treasure.stateChangeBtn.png", 106, 41, "06-janelas-p1", "Hazine deposu / Celik kasa", "Deposito do Tesouro / Cofre de Aco", "P1", false],
  ["enthrall.swf", "ui\\turkey\\swf\\enthrall.swf", "10_asset.core.view.enthrall.Alert.png", 358, 124, "06-janelas-p1", "Kimlik bilgileriniz tamamlanmamis, kurallara gore cocuklarin erisimi kisitlidir, lutfen oyun resmi sitesine giderek kimlik bilgilerinizi doldurunuz.", "Seus dados de identidade nao foram completados, pelas regras o acesso de criancas e restrito, por favor acesse o site oficial do jogo e preencha seus dados de identidade.", "P1", false],
  ["enthrall.swf", "ui\\turkey\\swf\\enthrall.swf", "2_asset.core.view.enthrall.ValidateFrameBG.png", 420, 237, "06-janelas-p1", "Dogrulama tamamlandiktan sonra bir oge odulu alabilirsiniz. Ad soyad: Kimlik numaraniz:", "Apos concluir a verificacao voce podera receber um item de recompensa. Nome completo: Numero de identidade:", "P1", false],
  ["enthrall.swf", "ui\\turkey\\swf\\enthrall.swf", "3_asset.core.view.enthrall.TipBG.png", 232, 122, "06-janelas-p1", "3 saat icindeki tecrube ve altin kazanma orani %100. 3 saatten 5 saate varan tecrube ve altin kazanma orani %50. 5 saati asarsaniz tecrube veya altin kazanamazsiniz. Lutfen makul oyun saatleri duzenleyin.", "Nas primeiras 3 horas o ganho de experiencia e ouro e 100%. De 3 a 5 horas o ganho de experiencia e ouro e 50%. Apos 5 horas voce nao ganha experiencia nem ouro. Organize horarios de jogo razoaveis.", "P1", false],
  ["boguadventure.swf", "ui\\turkey\\swf\\boguadventure.swf", "1_boguAdventure.tool.reset.png", 190, 61, "06-janelas-p1", "Tekrar Baslat", "Reiniciar", "P1", false],
  ["boguadventure.swf", "ui\\turkey\\swf\\boguadventure.swf", "5_boguAdventure.tool.findMine.png", 82, 67, "06-janelas-p1", "Mayin Dedektoru", "Detector de Minas", "P1", false],
  ["ringstation.swf", "ui\\turkey\\swf\\ringstation.swf", "16_ringStation.view.armory.close.png", 164, 52, "06-janelas-p1", "Kapat", "Fechar", "P1", false],
];

// win45-6600: template identico ao win45/ da 4.1, trocando Vietnamese->Turkish e sem a frase do fundo
// verde (os exports do 6600 nao sao isolados em chroma key -- ver remaster/README.md pro fit "chroma"
// específico do pipeline de ícones 4.1, que não existe ainda pro 6600).
function win45Prompt(tr, pt) {
  return (
    `Translate all the text in this game window from Turkish to Portuguese, changing ONLY the letters. ` +
    `Replace: "${tr}" with "${pt}". Each new text keeps exactly the same font, weight, size, colors, gradient, ` +
    `outline, glow, shadow, position and alignment as the text it replaces. Everything else in the image stays ` +
    `pixel-identical: same art, icons, characters, frames, background and layout. Write the words exactly as given, ` +
    `plain letters without accents.`
  );
}

// a imagem gameover__10 tem 4 textos distintos (titulo, subtitulo, 4 cabecalhos de coluna) -- prompt
// multi-replace dedicado em vez do template de par unico.
const GAMEOVER10_PROMPT =
  `Translate all the text in this game window from Turkish to Portuguese, changing ONLY the letters. Replace: ` +
  `"Oyun hesaplamasi" (big title) with "Resultado do Jogo"; "Hayatta" (subtitle under the title) with "Sobrevivencia"; ` +
  `"Siralama" (1st column header) with "Classificacao"; "Rumuz" (2nd column header) with "Apelido"; ` +
  `"Olu" (3rd column header) with "Mortes"; "Kart cekme sayisi" (4th column header) with "Cartas compradas". ` +
  `Each new text keeps exactly the same font, weight, size, colors, gradient, outline, glow, shadow, position and ` +
  `alignment as the text it replaces. Everything else in the image stays pixel-identical: same art, ornament, frames, ` +
  `background and layout (empty result rows stay empty). Write the words exactly as given, plain letters without accents.`;

function csvField(s) {
  if (s == null) return "";
  const str = String(s);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

const manifestLines = ["category,file,source_swf,source_file,width,height,pt_br"];
const localLines = ["swf\timage\tw\th\tcategory\ttr\tpt\tpriority\tnote"];
let nPrompts = 0, nLocal = 0;

const promptsDir = join(ROOT, "tools", "remaster", "prompts", "win45-6600");
mkdirSync(promptsDir, { recursive: true });

for (const [swf, swfPath, sourceFile, w, h, category, tr, pt, priority, isLocal] of ROWS) {
  const stem = swf.replace(/\.swf$/i, "");
  const file = `${stem}__${sourceFile}`;
  manifestLines.push([category, file, swf, sourceFile, w, h, csvField(pt === "MULTI" ? "(multi-texto, ver prompt dedicado)" : pt)].join(","));

  if (isLocal) {
    nLocal++;
    localLines.push([swf, sourceFile, w, h, category, tr, pt, priority, "tira fina de texto -- title-text.mjs --manifest remaster/manifest-6600.csv, nao IA"].join("\t"));
    continue;
  }

  const promptId = `${stem}__${sourceFile.replace(/\.[^.]+$/, "")}`;
  const promptPath = join(promptsDir, `${promptId}.txt`);
  const text = pt === "MULTI" ? GAMEOVER10_PROMPT : win45Prompt(tr, pt);
  writeFileSync(promptPath, text);
  nPrompts++;
}

writeFileSync(join(ROOT, "remaster", "manifest-6600.csv"), manifestLines.join("\n") + "\n");
writeFileSync(join(ROOT, "research", "6600", "bitmap-local-strips.tsv"), localLines.join("\n") + "\n");

console.log(`remaster/manifest-6600.csv: ${manifestLines.length - 1} linhas`);
console.log(`tools/remaster/prompts/win45-6600/: ${nPrompts} prompts`);
console.log(`research/6600/bitmap-local-strips.tsv: ${nLocal} tiras locais`);
