# Auditoria PT-BR do jogo (2026-10-07)

Objetivo: achar TUDO que ainda aparece em vietnamita (ou chinês) no jogo, tela por tela, e classificar por camada
para virar tarefa de tradução. Conta de teste `test` (personagem "Thur") elevada a nível 60 com ouro/moedas/cupons
máximos e todos os eventos ligados (backup dos eventos originais: `remaster/_auto/events-backup-2026-10-07.json`).
Screenshots: `research/i18n/audit/*.png`.

## Camadas (onde o texto mora → como traduzir)
| Camada | Onde | Situação medida | Como resolver |
|---|---|---|---|
| IMG | bitmaps dentro dos SWF (`ui/vietnam/swf/*.swf`) | 708 jobs do remaster feitos; **imagens que nunca viraram job** (ex. 42 de `hall.swf`: nomes dos prédios do saguão, tooltips) | pipeline remaster (`tools/remaster/*`) + `approved.json` + `pnpm client:art` |
| LANG | `ui/vietnam/language.txt` (overlay em `apps/api/assets/flash/ui/vietnam/`) | **FEITO** — só restavam 2 linhas ("Gunny Lộc Phát" no 1º recarregamento e `ddt.farms.refreshPetsLastTimes` "tạo mới"), corrigidas em 2026-10-07 (a contagem de 382 era falso positivo: â/ê/ô também são português) | — |
| SWFTXT | TextFields estáticos compilados nos SWF (não passam pelo language.txt) | a medir (ex. janela de correio) | FFDec `-replace` (texto nativo) como em `build-client-art.mjs` |
| XML | `ui/vietnam/xml/*.xml` | varredura atual achou só `times.xml`, `choicefigure.xml` (13 cada) com diacrítico vietnamita | traduzir + overlay |
| DB | schema `game` servido pela API (itens, pets, quests, NPC, mapas, conquistas, títulos, missões…) | **~23.900 células** com vietnamita real (`remaster/_auto/db-vn-scan.tsv`, regex só com letras exclusivas do vietnamita); overlay `app."Translations"` cobre 2.529 (Shop_Goods.Name 1.744, Game_Map.Name 454, Shop_Goods.Description 248…). Maiores: Shop_Goods.Name 5.871, Shop_Goods.Description 4.014, Pet_Skill_Element_Info 1.803+1.576, Pet_Skill_Info 1.488+1.353, Quest_Condiction 847, NPC_Info 751, Quest 728+687, Achievement 281+254, New_Title 270+218, Mission_Info 170×5 | `tools/i18n/mt.ts` + `db:texts:import`, ou tradução direta |
| SRV | mensagens do servidor (`Language-vn` → `server-language.txt`), títulos de `app."ScheduledEvents"` | ex. evento "Chiến thần (liga)" | editar dados/arquivo |

## Achados por tela
(formato: **Tela** — texto visto → camada → origem/ID quando conhecido)

- **Saguão (hall)** `00-hall.png` — nomes dos prédios "Phòng cao thủ", "Sân tập luyện", "Tiệm rèn", "Suối nước nóng", "Phòng game", "Guild", "Kết bạn", "Phòng sư đồ", "Lễ đường kết hôn", "Đấu giá", "Ải Viễn Chinh", "Shop" → IMG (`hall.swf`, nunca viraram job: `hall__21/24/27/30/33/36/39/48/51/62/64/75…`); botões "Phản hồi", "Sự kiện", "Nông Trại", "Đặc sắc", "Nạp", "Kênh" → IMG (`hall.swf`/`ddthallicon.swf`); tooltips dos prédios ("Đây là nơi để người chơi tự do thách đấu…", "Tìm kiếm những sư phụ giỏi…", "Luyện tập để thành cao thủ!") → IMG `hall.swf`; servidor "Gà Sát Th(ủ)" no seletor de canal → DB `player.Server_List.Name`; chat "Hiện tại" (aba/botão do chat) → IMG/SWFTXT; título "Trung úy Gunny" na mensagem de título obtido → DB `game.New_Title.Name`.
- **Loja (Shop)** `02-bag.png` — abas "Giới thiệu", "Trang bị", "Đạo cụ", "Đổi", "Nhận miễn phí" (parte já trocada: "Beleza"), sub-abas "Hot", "Mới"; slots do boneco "Nón", "Kính", "Mặt", "Áo", "Bộ", "Cánh", "Tóc"; "Lưu hình ảnh", "Ẩn", "Bạn hiện có", "Xu", "Lễ kim", "H.Chương", "Giỏ hàng", "Mua", "Nam", "Nữ", "Mua nhiều", "Tìm" → IMG/SWFTXT (`shop.swf`); nomes dos itens "Túi quà Lu đ…", "Sao May Mn", "Loa In", "Rương phát tà…", "Đá cường hóa…" → DB `game.Shop_Goods.Name` (glifos faltando: fonte sem "ắ/ừ"); moeda "Xu" no preço → IMG/LANG. **Bug funcional**: grade de itens da aba "Giới thiệu/Ofertas" vazia (página 1/0).
- **Correio** `03-btn3.png` — abas "Danh sách thư", "Thư chưa mở", "Thư đã gửi", "Xóa", "Thêm bạn" → IMG (já refeitas parcialmente: "Remetente/Assunto/Marcar tudo/Receber anexos/Guia" ok); botão "Responder" cortado sob "Escrever correio" (sobreposição de imagens).
- **Missões (Q)** `04-btn4.png` — categoria "Nhiệm vụ chủ tuyến" (IMG), títulos das missões "Dũng sĩ luyện tập", "Do thám pháo đài hắc ám"… → DB `game.Quest.Title`; "Nhiệm vụ bắt buộc:", "Phần thưởng:", "Nhận thưởng" → IMG/SWFTXT `quest.swf`; condição "Thắng 4 trận chiến đấu" → DB `game.Quest_Condiction.CondictionTitle`; texto da missão → DB `game.Quest.Detail`; prêmios "Vàng", "Lễ kim" → LANG/IMG. **Erro do remaster**: "Missão dẹ Evento" (deveria "Missão de Evento") e "Missao secundaria" sem acento.
- **Amigos (F)** `05-friends.png` — abas "Bạn b(è)", "Ciudad" (espanhol!), "Bn bè [0/0]" (glifo faltando), botões "Kết bạn", "Sư đồ", "DS đen" → IMG/LANG (`im.swf`?); status "[Fazendo compras]" ok.
- **Configurações (H)** `06-settings.png` — seções "Thiết lập âm thanh", "Thiết lập hiển thị", "Thiết lập tính năng" → IMG `setting.swf`; slider "me…/…aior" cortado (menor/maior).
- **Mover/Mais (T)** `07-btn7.png` — "Đại sảnh", "Câu lạc bộ Guild", "Đấu giá", "Chiến thần", "Giải Vua Gà", "Ải Viễn Chinh", "Sư đồ", "Nhật ký", "Thiết lập", "Trứng…" → IMG/SWFTXT (`core`/`hall`).
- **Phòng cao thủ (Ranking)** `10-pvp-room.png` — título "Phòng cao thủ", selo "Số 1", "Liên server", abas "Lực chiến", "Cấp", "Thành tích", "Thi đấu", "Ngày", "Tuần", "Tổng", colunas "Hạng", "Tên", "Lực chiến", botões "Thành tích", "Xem trang bị", "Xếp hạng của tôi", rótulo "Lực chiến" → IMG (`toffilist.swf` — várias foram refeitas na rodada 1, estas não); título "Thượng Tá Gunny" → DB `New_Title`; chat "Hiện tại", "Chat mật" → IMG (`chat.swf`).
- **Navegação**: o botão azul (x≈630) da barra é a Loja, não o saguão; voltar ao saguão = seta vermelha (x≈968) / menu "Mover → Đại sảnh".
- **Sala de Jogos (lista de salas PvP)** `11-training.png` — "Danh sách phòng", colunas "loại phòng", "Mức độ", "Số người", "Thông tin", "Hạng", "Công", "Cấp", "Giới tính", "Server", botões "Trước", "Sau", "Tổ đội", "Tìm", "Bắt đầu" → IMG (`roomlist.swf` — alguns refeitos, estes não); "Gà Sát Th(ủ)" → DB `Server_List`; dicas no rodapé já em PT (LANG).
- **Bênção do Rei das Galinhas (botão vermelho da barra)** `_nav.png` — nomes das bênçãos "Thể đắp lửa…", "Rơm cứu giúp", "Sức mạnh thần k…", "Ngọn gió khởi…" (glifos faltando) → DB `game.Consortia_BuffTemp`/buff templates ou LANG; "Chọn hết", "Trong thời gian event, 1 lần mua hết chỉ mất 940 xu", "Cần trả", "Xu", "Lễ kim", "H.Chương", "Xác nhận mua" → IMG/SWFTXT (`coreii`/`core` buff window); "3Dia" (falta espaço: "3 dias").

## Varreduras estáticas (exaustivas)
- **XML do cliente** (dentro do pacote `ui/vietnam/xml/xml.png`): só 9 linhas com vietnamita real —
  `times.xml` (botões "Xác nhận/Hủy bỏ/Đóng", datas "Năm{0}Tháng{1}Ngày{2}", "Giai đoạn đầu {0}", "sưu tập ngày") e
  `choicefigure.xml` (dica de apelido na criação de personagem: "Nhập…", "Có thể nhập ký tiếng anh hoặc…"). Corrigir
  = editar os 2 XML e reempacotar o `xml.png` do overlay (que já existe por causa do fix do GhostStarContainer).
- **Textos estáticos dentro dos SWF** (FFDec `-export text`, `tools/qa/swf-text-audit.sh` →
  `research/i18n/swf-text-vn.tsv`): **161 textos** com vietnamita em 21 SWFs — `ddtstore.swf` 40, `store.swf` 28
  (ajudas de forja/fusão/encaixe/transferência), `fightlib.swf` 10, `farm.swf` 10, `oldTrainer.swf` 8,
  `forgemain(1).swf` 7+7, `consortiabattle.swf` 7 (regras da guerra de clãs), `roulette.swf` 6, `luckstar.swf` 6,
  `guildmemberweek.swf` 6, `storefinebringup.swf` 5, `latentenergy.swf` 5, `labyrinth.swf` 4, `Launcher.swf` 3,
  `weekly.swf` 2, `trainer1.swf` 2, `firsttainer.swf` 2, `quest.swf` 1, `email.swf` 1, `DDT_Loading.swf` 1.
  Corrigir = FFDec `-replace` por characterId (mesmo mecanismo do `runFfdecNativeTextReplace` em
  `tools/i18n/build-client-art.mjs`), integrando ao `pnpm client:art`.
- **Clã (Guild)** `14-guild.png` — "Cấp Guild", "Tên Guild", "Nhấn chọn mua huân chương guild", "Chủ guild", "Người", "tài sản", "Công trạng", "hạng", "Phí duy trì", colunas "Tên", "Chức", "Cấp", "Điểm hiến tặng", "Lực chiến", "Rời mạng", aba "Sứ mệnh guild", botões "Cống hiến Guild", "Shop Guild", "Tiệm rèn", "Két sắt", "Kỹ năng guild", "Lời hội trưởng" → IMG (`consortionii.swf`/`consortion.swf`); cargo "Hội trưởng" (glifo faltando) → LANG/DB; "Guild" (palavra em inglês) em vários lugares → padronizar "Clã".
- **Kết bạn (Encontros/amigos)** `15-friends-bld.png` — título "Kết bạn", "Hạng", "Công", "Trạng thái hôn nhân", "Giới thiệu", "Nam", "Nữ", "Tìm", "Tên", "Cấp", "Trạng thái", "Trước", "Sau", "Sửa điểm", "Name", "Guild" → IMG (`civil.swf`); popup de aviso vazio (só "Ok", sem texto) → bug.
- **Imagens sem tradução (OCR vie em todas as entradas do inventário sem output)** — `tools/qa/img-vn-audit.mjs` →
  `research/i18n/img-vn-missing.tsv`: **277 imagens** sinalizadas (03-janelas 108, 06-combate-outros 64,
  02-lobby-hall 40, 04-botoes-titulos 40, 05-icones 22, 01-loading 2, site 1). Conferência visual das folhas:
  a grande maioria é texto vietnamita real (painéis de regras de eventos/Liga/Elite/Rei Galinha, ficha "Thông tin
  cá nhân" da mochila, Loja do Clã, ajuda do correio, nomes dos prédios do saguão, balões do tutorial
  "Trung tâm kết bạn đã mở!/Click vào đây…", "Nhấp chọn vào túi trang bị", botões "Vào Trò Chơi",
  "Chọn mặc thử", "Bồi dưỡng nhanh", "Giá đấu", "Thư đã gửi", "Giới thiệu", "Giúp đỡ", "Tu luyện…"); alguns
  falsos positivos (prédios sem texto, fundos lisos). **Motivo de terem ficado de fora**: `pt_br` vazio no
  `remaster/manifest.csv` (o OCR original não leu o texto) → nunca viraram job. Próximo passo: escrever
  vn/pt por imagem (specs) e rodar na fila do remaster.
- **Sân tập luyện (Treino)** `11-training.png` — "Phòng tập", "Chọn bài học", "Đo màn hình", "20 độ", "65 độ", "Siêu cao", "Cao thấp", "Chưa mở", "Chọn cấp độ", "Sơ cấp", "Trung cấp", "Cao cấp", "Bắt đầu", "Hạng", "Công trạng" → IMG (`fightlib.swf`); título "Nguyên soái Gunny" → DB `New_Title`.
- **Tiệm rèn (Forja)** `12-forge.png` — abas "Tiệm rèn", "Gia Công", "Quản lý", laterais "cường hóa", "Encaixe", "hợp thành", "di chuyển", "Fundir"; "Trang bị", "Đạo cụ", textos de ajuda "Đầu tiên, nhấp đôi trang bị cần cường hóa", "Sau đó nhấp đôi chọn vật phẩm sử dụng", "Túi cường hóa ưu đãi", "% gốc", "bùa may mắn", "VIP+", "% tổng", "Mua", "Giúp đỡ" → IMG/SWFTXT (`ddtstore.swf`/`store.swf`); mistura PT parcial ("Forja", "Fortalecer", "Amuleto da Sorte", "Pedra de fortalecimento").
- **Suối nước nóng (Termas)** `13-hotspring.png` — título, banner "Miễn phí / Ưu đãi cực lớn", texto descritivo, "Tên phòng", "Người", nomes das salas "Suối Nước Nóng Phòng 1..8" (DB/LANG, glifos faltando), "Vào nhanh", "Tạo phòng" → IMG (`hotspringroomlist.swf`) + DB.
- **Phòng sư đồ (Academia/mestre-aprendiz)** `16-academy.png` — título, "Tên", "Tư liệu", "Lực chiến", "Thắng", "Guild", "Chat mật", "Trang bị", "Cầu hôn", "Thêm bạn", "Nhận làm đệ tử", "Đệ tử giỏi", "Tìm", "Rời mạng", "Sau", "Nhận đệ tử" → IMG (`academy.swf`/`academycommon.swf`); mistura com PT ("Nome", "Nivel", "Poder", "Status", "Anterior", "Vantagens de mestre").
- **Lễ đường kết hôn (Igreja)** `17-church.png` — título, painel "Nhẫn định tình / Đi tìm một nửa của mình…" com texto longo, botões "Tổ chức hôn lễ", "Tham gia lễ cưới", "Ly hôn" → IMG (`churchroomlist.swf`).
- **Ải viễn chinh (Expedição/PvE)** `20-expedition.png` — título "Ải viễn chinh", "Danh sách phòng", "loại phòng", "Bản đồ", "Mức độ", "Server", "Thông tin", "Hạng", "Công", "Cấp", "Giới tính", "Trước", "Sau", "Tổ đội", "Tìm", "Bắt đầu" → IMG (`roomlist.swf`/`dungeon`).
- **Feedback/denúncia** `22-feedback.png` — formulário em **espanhol**: "Tipo:", "Pregunta:", "Tiempo:", "Año", "Mes", "Día", "Descripción:"; botões sem texto → LANG/SWFTXT (`feedback.swf`) — traduzir do espanhol também.
- **Sự kiện (Hoạt động đổi thưởng / calendário)** `23-events.png` — "Hoạt động đổi thưởng", "Hôm nay là ngày may mắn của ai?", "Điểm may mắn", "Điểm của tôi", "Dự đoán hôm sau", "Nhận mỗi ngày", "Hôm nay", dias "Chủ nhật/Thứ1..Thứ6", "Phần thưởng tích lũy", "Số lần tích lũy", nomes de eventos "Bồi Thường Quà…", "Quà Trung Thu…" e texto "Tặng những vật phẩm đền bù cho người chơi" (glifos faltando) → IMG (`calendar.swf`) + DB `Event_Live`/`Active` (Title/Description).
- **Ícones do topo** `26-dacsac.png` — "EVENT", "Đặc sắc", menu "Chiến thần", "Thần thú", "Code Gà Hiếm" (`25-event-icon`), "Phản hồi", "Sự kiện", "Nông Trại" → IMG (`ddthallicon.swf`/`hall.swf`).
- **Fazenda / Leilão / Sala de jogo**: os cliques nas posições testadas não abriram a tela (coordenadas fora do prédio) — refazer navegando pelo menu Mover.
- **Leilão (Đấu giá)** `30-auction.png` — título, abas "Tìm vật phẩm", "Đấu giá", "Vật phẩm tôi đấu giá", "Chi tiết", "Tìm", colunas "Tên", "Số lượng", "Còn lại", "Giá" ("Vendedor" já PT), "Hãy chọn loại vật phẩm để tìm vật phẩm", "Giá đấu", "Giá chốt", "Sau", "Xu" → IMG/SWFTXT (`auction.swf`).
- **Liga / Deus da Guerra** `31-league.png` — "Tổng chiến tích", "Thứ hạng", "Tân binh", "X.hạng tuần", "Điểm tuần", "Số trận", "Điểm ngày", "Quy tắc tham gia" + texto longo de regras, "P.thưởng cấp 30-39/40-50" ("Premio nivel 20-29" sem acento) → IMG (`league.swf`) — painel de regras é imagem (já listado no OCR).
- **Rei Galinha (Giải Vua Gà)** `32-chickenking.png` — "Quy định g.đấu", regras longas (6 itens), "Tạo phòng", "Vòng bảng" → IMG (`EliteGame`/`chickenking`).
- **Diário (Nhật ký)** `33-diary.png` — "Thay đổi trong ngày" (lista vazia) → IMG (`times.swf`?).
- **Mochila / Info do personagem (B)** `36-bag.png` — abas "Thông tin cá nhân", "Tu luyện", "Hộp quà", "Thú cưng", "Totem"; "Xếp hạng", "Công trạng", "Hội trưởng", slots "Nón/Kính/Nhẫn/Mặt/Áo/Bộ/Cánh/Dây chuyền/Vòng tay/Vật định tình/Hộ trợ/Trợ thủ/Khác", "Thành tích", "Lực chiến", "Tấn công", "Nhanh nhẹn", "Phòng thủ", "May mắn", "Sát thương", "Hộ giáp", "Máu", "Thể lực", "Tinh Luyện", "Mật mã cấp 2", "Phím tắt", "Tách", "Taxa", "Bán", abas laterais "Trang bị", "Đạo cụ", "Thẻ bài" → IMG (`bagandinfo*.swf` — a ficha "Thông tin cá nhân" é imagem, já no OCR); "(Organizar)" com parênteses sobrando (já corrigido no remaster? conferir no jogo).
- **Mestre/Aprendiz via Mover** `35-master.png` = mesma tela do prédio (ver acima). **Ovos** `34-eggs.png`: clique não abriu.
- **Leilão/Sala de jogo pelos prédios** (`38`, `39`): o prédio do leilão abriu a Academia e a arena abriu a Sala de Jogos — coordenadas sobrepostas; nada novo.
- **Criar sala** `41-createroom.png` — "Tên phòng", "Mật mã", "Loại phòng", "Thám hiểm", "Thi đấu" → IMG (`roomlist.swf`).
- **Sala PvP** `43-room-pvp.png` — "Phòng", "chủ phòng", "Click để đóng", "Click chọn mở", "Đạo cụ theo người", "Rương đạo cụ chiến đấu", "Quan chiến", modo "Tự do" + regras "1.Không giới hạn. 2.Tự động chọn bản đồ. 3.Ưu tiên xếp theo level." (a aba "Guerra de Clã" ao lado já está em PT), "Thông tin phòng", "Bản đồ ngẫu nhiên", "10 giây", "Mời", "Server hiện tại", "Bắt đầu" → IMG (`room.swf`). Iniciar partida sozinho não começa (precisa de 2 jogadores) — testar batalha com bot/2ª conta no próximo lote.
- **Config da sala** `48-pve-maps.png` — "Loại phòng", "Thi đấu", "Tên phòng", "Mật mã" → IMG; botão de confirmar **sem texto** (imagem vazia) → conferir remaster.
- **Criar sala PvE (Ải viễn chinh)** `49-pve-room.png` — "Phó bản", "Đánh Boss" (descrição já PT) → IMG.
- **Sala PvE** `51-pve-room.png` — "CHỌN PHÓ BẢN" (banner), "Đổi đội" → IMG (`room.swf`).
- **Escolher instância** `52-pve-maps.png` — "Chọn phó bản", "Vào ải cuối", "Phó bản", nomes das instâncias nos banners "Huyệt Ma Kiến", "Giải cứu gà con", "Cung điện Gà", "Bộ Lạc Tà Thần", "Pháo Đài Hắc Ám", "Đại chiến rồng", "Đấu trường gà", "时空旋涡" (chinês!) → IMG (banners das instâncias, provavelmente `dungeon`/`room` ou imagens soltas em `ui/vietnam/img`); dificuldades "Khó", "anh hùng" → IMG; botão de confirmar sem texto (imagem vazia).
- **Detalhe da instância** `54-pve-picked.png` — título/descrição "Giải cứu gà con", "Số người đề nghị: 2-4 người", texto da história → DB `game.Pve_Info.Name/Description` (overlay existente cobre só parte; glifos faltando = texto ainda VN); dificuldade "Dễ" → IMG.
- **BUG: alertas vazios** `60-battle.png`, `15-friends-bld.png` — ao iniciar a instância (Lv 9-12 com personagem nv 60) e ao abrir "Kết bạn" aparece um popup só com "Ok", **sem texto**. Hipótese: o texto da mensagem é traduzido (language.txt / server-language.txt) mas o TextField do alerta usa fonte embutida sem os glifos usados → nada renderiza; ou a chave traduzida ficou vazia. Investigar `tank.view.*Alert*` e o caminho `MessageTipManager`/`AlertManager`.
- **Sala da instância** `60-battle.png` — banner "Giải cứu gà con" (IMG), "Mô hình", "Phó bản", "Nível", "Dễ" → IMG/DB.

## Rodada 2 (2026-10-08) — camadas que faltavam

- **Texto VN fixo no código do servidor** — 241 strings únicas (452 ocorrências, 96 arquivos): mensagens de
  `apps/game/src/handlers/*` (`sendMessage(0, "…")`, títulos/corpo de correio, cargos padrão do clã) e falas de
  boss/NPC das missões PvE (`packages/fight/src/pve/scripts/generated/**`, `Say(...)`). Traduzidas no lugar com
  `node tools/qa/code-vn-scan.mjs extract|apply <map.json>`; rescan = 0. tsc limpo, testes game/api/fight passam.
- **XMLs estáticos (zlib) da API** — `apps/api/assets/request/cardinfolist.xml` (conjuntos de cartas: nomes +
  histórias), `equipextrainfolist.xml` (efeitos extras de equipamento), `loadeverydayactive.xml` (eventos diários)
  → PT-BR via `tools/i18n/static-xml-pt.mjs` (originais VN em `research/i18n/static-xml-vn/`).
  `dailyleaguetoplist.xml`/`warriorfamranklist.xml` só têm apelidos de jogadores (mantidos).
- **BUG alerta vazio no "Kết bạn"** — causa: `MarryInfoPageList.ashx` era stub (`value="false"`), o loader falhava e
  o cliente mostrava o alerta de erro (`CivilController.__onLoadError`). Portado de `Tank.Request/MarryInfoPageList.ashx.cs`
  + `PlayerBussiness.GetMarryInfoPage` (12 por página, `State desc, IsMarried`) em `apps/api/src/request/endpoints/social.ts`.
  O alerta vazio ao iniciar instância ainda não foi reproduzido (não vem do servidor: o servidor não envia 94/33-35 e
  `SYS_MESSAGE` vazio é ignorado pelo cliente) — reproduzir no próximo tour.
- **Loja, aba "Giới thiệu" 1/0** — `ShopGoodsShowList` não tem linhas dos tipos 3/4 (sub-aba "Ofertas/Concessions")
  nem no banco original; os tipos 63/64 (Hot) e 1/2 (Recomendados) têm 28/12 itens válidos. É falta de dados,
  não de código: cadastrar itens em promoção (tipos 3/4) pelo admin.
- **Tooltips de texto puro** (fundo transparente, ex.: descrições dos prédios do hall) — renderizados direto com
  `tools/remaster/plain-text.mjs` (Arial, cor/tamanho medidos do original) em vez da IA, que tira acentos e erra letras.
- **Remaster rodada 2 (imagens que o OCR não tinha lido)** — 182 specs novas (`add:true`) + retrabalho; fila
  terminou com 926/930 ok e `remaster/approved.json` com 903 entradas. Revisão lote a lote (contact sheets
  `tools/remaster/pair-sheet.mjs`). Acento ausente na saída da IA é aceito (os prompts não levam acento);
  acento inventado/trocado ("Heròi", "Vitòría", "sáudé", "Clầ"), erros de digitação, tradução errada ("Góc độ" =
  Ângulo) e quebras de estilo foram refeitos. Ferramentas novas para o que a IA erra sempre:
  `plain-text.mjs` (texto puro sobre transparência), `title-text.mjs` (títulos dourados/vermelhos do hall),
  `tip-label.mjs` (rótulos de atributo do tooltip com sublinhado), `dedupe-pending.mjs` (gêmeos idênticos),
  `restart-queue.sh`; correção de cor automática no `/done` quando a média de cor da saída desvia (>6).
- **Textos estáticos de SWF (DefineText)** — `ffdec -replace` em texto multi-registro precisa do formato
  "formatted" (blocos `[x/y/font]` por registro); com lista simples o FFDec acrescentava registros e o VN ficava no
  fim. `runSwfTextStep` agora exporta formatado, troca só os trechos de texto e remove as linhas de kerning
  (`spacing`/`spacingpair`) dos glifos VN. Resultado: 17/22 SWFs verificados. Faltam 5 (firsttainer, Launcher,
  oldTrainer, times, weekly): a fonte embutida é "UVN Van" (subconjunto de glifos VN) e o FFDec só adiciona glifos
  novos a partir de uma fonte de sistema com o mesmo nome — instalar uma "UVN Van" (ou trocar a fonte do texto)
  resolve. Rodar só esse passo: `node tools/i18n/build-client-art.mjs --only-swf-text`.

## Rodada 3 (2026-10-26) — `i18n-instancias`: varredura dedicada a dungeons/PvE

Escopo: tudo que o jogador vê dentro de instâncias/PvE. Script de verificação novo:
`node tools/qa/pve-i18n-scan.mjs` (varre o overlay `data/i18n/pt-BR/db/{Pve_Info,Mission_Info,
Mission_Info_Backup,NPC_Info,Game_Map,Quest}.*.jsonl` + literais CJK/VN em código em
`packages/fight/src/pve`, `apps/game/src/handlers/{salas,eventos,missoes}`, `apps/game/src/{game,rooms,fight}`)
e teste `packages/fight/test/pve-i18n.test.ts` que roda o mesmo script em CI. Resultado atual: **0 achados**
(ver lista de exceções justificadas no próprio script — todas são comentário/código morto, nunca renderizado).

- **BUG real encontrado (causa principal da reclamação)**: `apps/api/src/templates/defs.ts` monta o XML de
  `/LoadPVEItems.ashx` (nomes/descrições das instâncias na tela de seleção, `game.Pve_Info.Name`/`Description`)
  a partir da tabela `game` crua — `Pve_Info` **não estava** na lista `TRANSLATED_PK` daquele arquivo (que já
  tinha `Game_Map`, `NPC_Info`, `Mission_Info`, `Quest`, etc.), então o overlay pt-BR (que já existe 100% —
  ver abaixo) nunca era aplicado nesse endpoint, mesmo com `apps/game/src/db/templates.ts` já aplicando o
  mesmo overlay corretamente pro protocolo de socket. É por isso que o dono via os nomes/descrições das
  instâncias ainda em vietnamita na tela "Chọn phó bản"/detalhe da instância (achados `52-pve-maps.png`,
  `54-pve-picked.png` da rodada 1) mesmo a tradução já estando pronta. Corrigido: adicionada a entrada
  `Pve_Info: "ID"` em `TRANSLATED_PK` (uma linha). Os nomes das instâncias no banner da lista ("Huyệt Ma Kiến",
  "Giải cứu gà con", "时空旋涡"...) **não são imagem** — são texto de `Pve_Info.Name` desenhado sobre um fundo
  genérico, então esse fix resolve tudo isso de uma vez (a hipótese "provavelmente imagem" da rodada 1 estava
  errada).
- **Cobertura do overlay DB (confirmada, 100%, zero sobra VN/CJK)**: `Pve_Info.{Name,Description}` (33+24
  linhas), `Mission_Info.{Name,Title,Description}` (170 cada), `Mission_Info_Backup.*` (128 cada), `Game_Map.
  {Name,Description}` (454+431), `NPC_Info.Name` (1005), `Quest.{Title,Detail}` (728 cada) — todas já traduzidas
  em `data/i18n/pt-BR/db/*.jsonl` e, pelo uso em `apps/game/src/db/templates.ts`, já importadas em
  `app."Translations"` no Postgres de dev. Adicionadas também `Mission_Info.{Success,Failure}` e
  `Mission_Info_Backup.{Success,Failure}` à lista `TARGETS` de `packages/db/scripts/export-texts.ts` (não
  tinha essas 2 colunas) — conferido: o seed já está 100% pt-BR nelas (os 3 "Đánh bại Baroff." sinalizados em
  `data/i18n/_work/vn-scan/*.jsonl` de uma varredura anterior já tinham sido corrigidos no seed antes desta
  rodada; esses `.jsonl` de `vn-scan` ficaram obsoletos — se o `db:texts:import` já rodou para essas tabelas,
  não há nada a importar de novo).
- **Chinês (Han) real em `packages/fight/src/pve/scripts/generated/**` — achado novo** (o `code-vn-scan.mjs` da
  rodada 2 só cobre diacríticos vietnamitas, nunca detectou Han): falas de NPC/boss via `Say()` hardcoded em
  chinês, visíveis como balão de chat durante o combate PvE. Corrigidas (string literal apenas, lógica
  intocada): `NPC/MyNpcAi.ts` (`listChat`, 13 falas de monstro genérico "Bogu"), `NPC/Thirteen{Hard,Normal,
  Terror}NioBoss.ts` (`ShootedChat`+`KillAttackChat`, os outros arrays desses 3 arquivos já estavam em pt-BR —
  tradução parcial de uma rodada anterior que não chegou a esses 2 arrays), `NPC/Thirteen{Hard,Normal,
  Terror}ThirdBoss.ts` (100% em chinês, 15 falas × 3 arquivos), `NPC/ThirdSimple{Short,Long}Npc.ts`
  (`BoguChat`+`AntChat`, formiga/monstro genérico), `Messions/FHSM4002.ts`+`FHSM4003.ts` (`IsBossWar` + `Say()`
  dos bosses "Águia/Lobo do Deserto"/"Touro Velho"), `Messions/{THSM3003,THSM3005,THSM3006,TNSM3105,TNSM3106,
  TSSM3205,TSSM3206,TTSM3305,TTSM3306}.ts` (label `IsBossWar`, hoje não lido por nenhum código ainda — campo
  existe só pra paridade com o C#, mas corrigido por completude). Essas classes são **auto-geradas** por
  `packages/fight/scripts/transpile-pve.ts` a partir do donor C# — o transpiler não tem (e este task não
  adicionou) um passo de tradução, então se alguém rodar a transpilação completa de novo essas strings voltam
  ao chinês original; a correção ficou só no `.ts` gerado mesmo (convenção do cabeçalho "hand fixes go in
  ../../manual/" é pra lógica, não serve pra isto — nenhuma ação de código foi além da troca da string).
  Achados restantes (todos em comentário/código morto, nunca renderizado ao jogador — listados como exceção
  em `tools/qa/pve-i18n-scan.mjs`): legenda de cor de baú ("黄色箱子"/"红色箱子") em 8 arquivos, uma chamada
  `Say()` comentada em 2 arquivos, 1 doc-comment, 1 `Console.WriteLine` comentado.
- **Strings VN hardcoded fora do PvE (achado durante a varredura geral, corrigidas por serem triviais e de
  risco zero)**: `apps/game/src/handlers/forja/energia-latente.ts` (3 mensagens de Energia Latente, feature
  de forja — não é dungeon) e `apps/game/src/handlers/minigame-termas/entrar-sair.ts` (2 mensagens do minigame
  dos bichinhos "bogu" — não é dungeon). Fora do escopo estrito de "instâncias", mas sem risco e sem dono
  claro em outro task, então corrigidas aqui.
- **Achado fora de escopo, NÃO corrigido (não é dungeon)**: `apps/game/src/handlers/minigame-termas/mgr.ts:440`
  — `pk.writeString("温泉小游戏")` ("minigame das termas") ainda em chinês, enviado no pacote `166` (LoadComplete
  do minigame dos bichinhos "bogu"). Fica pra um task de i18n do minigame de termas/bichinhos.
- **Item names referenciados por `Quest_Condiction` ainda em VN, fora de escopo**: `game.Quest_Condiction.
  CondictionTitle` tem 10 linhas com nomes de medalha entre aspas em VN (`"Bất"`, `"Khả"`, `"Chiến"`, `"Bại"`,
  `"Mừng"`, `"Quốc"` — os 4 primeiros formam o idioma "Bất Khả Chiến Bại" = "invencível", um quebra-cabeça de
  colecionar medalhas; os 2 últimos são do evento de feriado nacional vietnamita). Os `Quest`s donos (`1023`
  "Chúc mừng Quốc Khánh", `1645` "Gunny Vô Địch", `3050` "Ghép Chữ Nhận Ná Thần") **não são dungeon** — são
  quests de evento/colecionável. Além disso `Quest_Condiction` não tem PK de coluna única (overlay de tradução
  não está ligado pra essa tabela em `apps/game/src/db/templates.ts` nem em `apps/api/src/templates/defs.ts`;
  o `(QuestID, CondictionID)` precisaria ser adicionado como chave composta). Também achados nessa varredura,
  igualmente fora de escopo: `Quest.Title` id `1023` ("Điềm lành xuất hiện Chúc mừng Quốc Khánh") e itens
  `Shop_Goods.Name` 11457-11460 ("Huy chương \"Bất/Khả/Chiến/Bại\"") e 11531-11532 ("Mừng"/"Quốc") sem tradução
  no overlay. Fica pra um task de i18n geral de quests/eventos (fora de "instâncias").
- **Imagens com texto de UI de dungeon pendentes de remaster** (achadas em `research/i18n/img-vn-missing.tsv`
  e `img-vn-full.tsv`; arte é responsabilidade de outro pipeline, não gerada aqui): `roomlist.swf ::
  72_asset.DungeonList.DungeonListBG.jpg` (banner "Ải viễn chinh" + aba "Danh sách phòng", já especificada em
  `research/i18n/needs-ai.md`), `roomlist.swf :: 44_asset.DungeonList.map_PVE.png` ("Bản đồ"), `roomlist.swf ::
  58_asset.DungeonList.hardLevel_PVE.png` ("Mức độ"), `roomlist.swf :: 20_asset.DungeonList.pre_PVE.png`
  ("Trước"), `roomlist.swf :: 21_asset.DungeonList.boss.png` ("(Đánh) Boss"), `roomlist.swf ::
  73_asset.DungeonList.dungeon.png` ("Phó bản"), `room.swf :: 63_asset.ddtroom.dungeonChoose.boss.png` ("Vào
  ải cuối"), `ddthallicon.swf :: 387_asset.ddthall.dungeonExploration.png` ("Địa Cung"). O banner "时空旋涡"
  (chinês, dungeon "Redemoinho do Tempo") citado na rodada 1 não foi localizado nas varreduras estáticas atuais
  — reconferir visualmente no próximo tour (pode já ter sido corrigido num remaster posterior, ou estar num
  asset ainda não catalogado).

**Atualização 2026-10-27 (`pixi-load`)**: conferência direta dos PNGs exportados mostra que
`72_...DungeonListBG.jpg`, `44_...map_PVE.png`, `58_...hardLevel_PVE.png`, `20_...pre_PVE.png`,
`63_...dungeonChoose.boss.png` e `387_...dungeonExploration.png` desta lista **já foram traduzidos**
num remaster posterior (`remaster/approved.json` tem job aprovado pra cada um) — esta lista está
desatualizada pra eles. **Só `21_asset.DungeonList.boss.png` ("Đánh Boss") e
`73_asset.DungeonList.dungeon.png` ("Phó bản") continuam pendentes** (sem job em `approved.json`) —
ver `docs/client-pixi/STATUS.md` sessão 2026-10-27.
- Verificação: `node tools/qa/pve-i18n-scan.mjs` → 0 achados; teste `packages/fight/test/pve-i18n.test.ts`
  roda o mesmo script. `tsc --noEmit` limpo em `@ddt/db`, `@ddt/api`, `@ddt/game`, `@ddt/fight`. Testes:
  `@ddt/fight` 202/202, `@ddt/api` 117/117, `@ddt/db` 8/8, e os testes PvE de `@ddt/game`
  (`pve-instancias`, `labirinto`, `client-6600-m4-catchbeast`, `client-6600-m4-resgate`) 42/42.
