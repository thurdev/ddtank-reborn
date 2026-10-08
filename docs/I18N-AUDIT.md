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
