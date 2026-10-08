// Translates the static (zlib) request XMLs under apps/api/assets/request that still carry Vietnamese text.
// Idempotent: each replacement maps an exact VN attribute value to PT-BR; already translated files are left as is.
// Original Vietnamese copies are kept once in research/i18n/static-xml-vn/.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { inflateSync, deflateSync } from "node:zlib";

const DIR = "apps/api/assets/request";
const BAK = "research/i18n/static-xml-vn";
const dmg = (lv) => [`Khi tấn công {0}% xác suất tăng {1} điểm sát thương, Lv${lv} có thể trang bị`, `Ao atacar, {0}% de chance de causar +{1} de dano. Equipável a partir do Lv${lv}`];
const def = (lv) => [`Khi bị tấn công {0}% xác suất khiến sát thương phải chịu giảm {1} điểm, Lv${lv} có thể trang bị`, `Ao ser atacado, {0}% de chance de reduzir o dano recebido em {1}. Equipável a partir do Lv${lv}`];

const MAP = {
  "cardinfolist.xml": [
    ["Bộ thẻ huyệt ma kiến", "Conjunto Covil das Formigas"],
    ["Vô số dũng sĩ từ mọi nơi đều đang tập hợp tại đây, cánh rừng ma quái.Mọi người cần phải tìm ra nơi cư ngụ của loài kiến ma &quot;Huyệt ma kiến&quot; . Qua những trận chiến gian nan, cuối cùng họ cũng hạ được nữ vương kiến và lấy được bộ thẻ phép thuật!",
      "Inúmeros guerreiros de todos os cantos se reúnem aqui, na floresta assombrada. Todos precisam encontrar o lar das formigas demoníacas, o &quot;Covil das Formigas Demoníacas&quot;. Após batalhas difíceis, eles finalmente derrotam a rainha das formigas e conquistam o conjunto de cartas mágicas!"],
    ["Bộ thẻ vương thành gà", "Conjunto Castelo das Galinhas"],
    ["Sau khi hạ được Quốc vương xấu tính của vương thành gà, các dũng sĩ đã chế tạo thành công bộ thẻ phép thuật nhưng chẳng may Mathias đã cướp chúng đi.Giờ mọi người phải cùng hợp sức để cướp lại bộ thẻ!",
      "Depois de derrotar o rei malvado do Castelo das Galinhas, os guerreiros criaram o conjunto de cartas mágicas, mas Mathias o roubou. Agora todos precisam unir forças para recuperá-lo!"],
    ["Bộ thẻ bộ lạc tà thần", "Conjunto Tribo do Deus Maligno"],
    ["Tương truyền rằng có một bộ thẻ đã ghi lại những bí mật kinh thiên động địa của cây thương cổ đang bị lưu lạc trong một bộ lạc bị khống chế bởi thế lực đen tối. Hãy mau đến đó tìm lại bộ thẻ này!",
      "Diz a lenda que um conjunto de cartas com os segredos assombrosos da lança antiga está perdido numa tribo dominada pelas forças das trevas. Vá logo até lá recuperá-lo!"],
    ["Bộ thẻ pháo đài hắc ám", "Conjunto Fortaleza das Trevas"],
    ["Trong pháo đài hắc ám,không hiểu sao luôn phát ra  thứ ánh sáng lấp lánh, thì ra đó là ánh sáng của bộ thẻ thần bí.Nếu lấy lại được và sử dụng đúng cách sẽ giúp pháo đài trở lại sự yên bình.",
      "Na Fortaleza das Trevas sempre brilha uma luz misteriosa: é a luz do conjunto de cartas místicas. Se for recuperado e usado corretamente, trará de volta a paz à fortaleza."],
    ["Bộ thẻ vũ khí thần bí", "Conjunto Armas Místicas"],
    ["Các dũng sĩ đã tìm thấy trong rừng sâu dấu tích 4 loại vũ khí.Tương truyền do không thể khống chế sức mạnh nên vũ khí đã bị tiêu hủy.Nếu như bây giờ chúng ta tìm ra 4 loại thẻ đặc biệt thì có thể triệu hồi sức mạnh của vũ khí.",
      "Os guerreiros encontraram na floresta profunda vestígios de 4 armas. Diz a lenda que elas foram destruídas por ninguém conseguir controlar seu poder. Se encontrarmos as 4 cartas especiais, poderemos invocar o poder dessas armas."],
    ["Bộ thẻ Goblin", "Conjunto Goblin"],
    ["Tà Diệm Long cuối cùng đã bị hạ, hãy xem có thứ gì rơi ra kìa.Các dũng sĩ chạy đến xem thì phát hiện ra bộ thẻ Goblin ghi cháp những bí mật. Nhưng đúng lúc này xào huyệt sụp đổ, các dũng sĩ đã không thể quay trở ra.",
      "O Dragão das Chamas Malignas finalmente caiu. Vejam o que ele deixou! Os guerreiros correram e encontraram o conjunto de cartas Goblin, cheio de segredos. Mas nesse momento o covil desabou e eles não conseguiram sair."],
    ["Bộ thẻ giải cứu gà con", "Conjunto Resgate dos Pintinhos"],
    ["Giải cứu những chú gà vàng thật xinh xắn sẽ được tặng những bộ thẻ thần bí. Nhưng không chỉ có 1 con gà mái xấu xí, các dũng sĩ, ãy mau lên đường cứu những chú gà vàng nào!",
      "Quem resgatar os lindos pintinhos dourados ganha conjuntos de cartas místicas. Mas não há só uma galinha malvada! Guerreiros, partam logo para salvar os pintinhos!"],
    ["Bộ thẻ Đấu trường gà", "Conjunto Arena das Galinhas"],
    ["Vương quốc gà đã tổ chức thành công đại hội thể thao đầu tiên. Và lần này cũng đặc biệt sản xuất bộ thẻ Đấu trường gà. Ngoài việc dùng làm kỹ niệm, bộ thẻ còn mang đến cho bạn sự may mắn.Bạn có phải là người của chiến thắng không?",
      "O Reino das Galinhas realizou com sucesso sua primeira olimpíada e criou o conjunto de cartas Arena das Galinhas. Além de lembrança, ele traz sorte. Será que você é o grande vencedor?"],
    ["Bộ thẻ Ngũ Thần Binh", "Conjunto Cinco Armas Divinas"],
    ["Ngũ đại thần đang cai quản và giữ thế cân bằng cho thế giới, thế nhưng vũ khí họ sử dụng lại lưu lạc trong nhân gian. Tương truyền nếu tập hợp được cùng lúc 5 vũ khí này sẽ có sức mạnh vô song!",
      "Os cinco grandes deuses governam e mantêm o equilíbrio do mundo, mas suas armas se perderam entre os mortais. Diz a lenda que quem reunir as 5 armas terá um poder incomparável!"],
    ["Bộ thẻ Vòng xoáy thời gian", "Conjunto Vórtice do Tempo"],
    ["Vậy là tất cả những chiến tranh đều do bác học Vẹt mà ra. Các chiến sỹ trận mạc đã tặng những dũng sỹ của chúng ta thẻ bài quý được cất giữ đã lâu nhằm tỏ lòng biết ơn.",
      "Então todas as guerras foram causadas pelo Doutor Papagaio. Os soldados do campo de batalha presentearam nossos guerreiros com cartas raras, guardadas há muito tempo, como forma de gratidão."],
    ["Thẻ Đấu Trường Dũng Sĩ", "Conjunto Arena do Guerreiro"],
    ["Nghe nói trong đấu trường xưa có 1 bộ thẻ Đấu Trường Dũng Sĩ có uy lực rất mạnh, không thể để chúng rơi vào tay thế lực đen tối, các dũng sĩ hãy bắt đầu cuộc hành trình của mình",
      "Dizem que na antiga arena existe um conjunto de cartas Arena do Guerreiro muito poderoso. Ele não pode cair nas mãos das forças das trevas. Guerreiros, comecem sua jornada!"],
  ],
  "equipextrainfolist.xml": [dmg(30), dmg(20), dmg(10), def(30), def(20), def(10)],
  "loadeverydayactive.xml": [
    ["Boss vợ chồng", "Chefe do Casal"],
    ["Cả ngày", "O dia todo"],
    ["Giải chiến thần", "Torneio do Deus da Guerra"],
    ["Thứ 2 đến thứ 6 19:30-21:30", "Segunda a sexta 19:30-21:30"],
  ],
};

mkdirSync(BAK, { recursive: true });
for (const [file, pairs] of Object.entries(MAP)) {
  const path = `${DIR}/${file}`;
  const raw = readFileSync(path);
  let xml = inflateSync(raw).toString("utf8");
  if (!existsSync(`${BAK}/${file}`)) writeFileSync(`${BAK}/${file}`, xml);
  let n = 0;
  for (const [vn, pt] of pairs) if (xml.includes(`"${vn}"`)) { xml = xml.split(`"${vn}"`).join(`"${pt}"`); n++; }
  const left = (xml.match(/[ăắằẳẵặấầẩẫậđếềểễệốồổỗộơớờởỡợưứừửữựạảẹẻẽịỉọỏụủỳỵỷỹĂĐƠƯ]/g) ?? []).length;
  writeFileSync(path, deflateSync(Buffer.from(xml, "utf8")));
  console.log(file, "replaced", n, "| VN chars left", left);
}
