# Images with baked-in Vietnamese text — inventory (not translated/regenerated yet)

Scope and method: text content (`language.txt`, server strings, `movingnotification.txt`, `levelreward.xml`,
`Game_Map`/`Pve_Info` DB rows) is translated separately — see `docs/ROADMAP.md` "Localização PT-BR" and
`data/i18n/pt-BR/`. This doc covers the other class of UI text: pixels baked into SWF-embedded bitmaps
(banners, button labels, title plates) that no string table can fix.

Images were extracted with FFDec (`vendor/_tools/ffdec/ffdec-cli.jar`, Java 21):

```
java -jar vendor/_tools/ffdec/ffdec-cli.jar -export image <outdir> "<swf>"
```

run per-SWF against a curated list of 28 event/activity/UI SWFs under
`vendor/DDTank41/Source Flash/FlashSV1/ui/vietnam/swf/` (login, hall, hall_old, worldboss, roomlist, toolbar,
serverList, task, quest, calendar, activeevents, wonderfulactivity, noviceactivity, firstrecharge,
awardsystem(1), newtitle, elitegame, league, consortiabattle, cardsystem, roulette(1), luckstar, labyrinth,
newchickenbox, gameover, vipview, store) — 1841 images exported total. Candidates were triaged by (a) linkage
name containing `title`/`text`/`name`/`banner`/`label`/`word`/`tips` and (b) file size (large PNGs tend to be
full banners/comics rather than icons), then visually inspected. **This is a representative sample, not
exhaustive** — only images that were actually opened and confirmed to contain Vietnamese text are listed
below. Everything exported-but-not-reviewed, and the ~100+ other `ui/vietnam/swf/*.swf` files not in the
curated list (character/item/map art, mostly textless), still needs a pass — see "Remaining" at the bottom.

Columns: path is `<swf> :: <ffdec export filename>` relative to
`vendor/DDTank41/Source Flash/FlashSV1/ui/vietnam/swf/`; size is the exported PNG/JPG byte size.

| Path | Size | VN text | PT-BR translation |
|---|---|---|---|
| `roomlist.swf :: 75_asset.roomList.CreateRoomText.png` | 1.7 KB | Tên phòng | Nome da sala |
| `roomlist.swf :: 29_asset.roomList.passText.png` | 0.6 KB | Mật khẩu | Senha |
| `roomlist.swf :: 72_asset.DungeonList.DungeonListBG.jpg` | 152 KB | "Ải viễn chinh" (banner), "Danh sách phòng" (tab) | "Passo da Expedição", "Lista de Salas" |
| `store.swf :: 18_asset.store.Title.png` | 39 KB | Tiệm rèn | Forja |
| `store.swf :: 75_asset.ddtstore.exalt.TitleText.png` | 1.4 KB | Tự cắt | Corte automático |
| `gameover.swf :: 30_asset.experience.tabName.png` | 3.0 KB | nhân vật | personagem |
| `wonderfulactivity.swf :: 68_carnicalAct.title1.png` | 4.9 KB | Vua Tăng Cấp | Rei da Evolução |
| `wonderfulactivity.swf :: 10_carnicalAct.title7.png` | 4.2 KB | Vua Tu Luyện | Rei do Treino |
| `wonderfulactivity.swf :: 84_wonderful.accumulative.title.png` | 100 KB | Nạp Tích Lũy Nhận Quà Liền Tay | Recarga Acumulada: Receba Já Seu Prêmio |
| `calendar.swf :: 9_Calendar.SignedAward.Title.png` | 7.9 KB | "Phần thưởng tích lũy:", "Số lần tích lũy:" | "Recompensa acumulada:", "Número de vezes acumuladas:" |
| `elitegame.swf :: 2_EliteGame.scoreRank.scoretitle.png` | 0.9 KB | Điểm | Pontos |
| `vipview.swf :: 1_asset.vip.name.png` | 1.0 KB | Nhân vật: | Personagem: |
| `awardsystem.swf :: 59_asset.awardSystem.roulette.RouletteBG.png` (also in `awardsystem1.swf`, `roulette.swf`/`roulette1.swf` as the equivalent `RouletteBG`/`TurnplateMainView` assets — same labels) | 508 KB | "Số lần mở", "Lần này cần", "Hiện có", "Chúc mừng bạn nhận được vật phẩm" | "Vezes abertas", "Necessário desta vez", "Você tem", "Parabéns, você recebeu um item" |
| `hall.swf :: 4_asset.hall.battleLABS.png` (identical copy at `hall_old.swf :: 7_asset.hall.battleLABS.png`) | 1.3 MB | Full tutorial comic, 4 panels. Title: "Phòng tập luyện". Banner: "Sắp mở!". Panel text: "Trở thành cao thủ, nhận được nhiều phần thưởng phong phú!" / "Bất kể bạn là ai, phòng tập luyện là nơi nhất định phải đến. Tại đây bạn có thể học thêm nhiều kỹ thuật để trở thành cao thủ, có cơ hội nhận được vô số phần thưởng!" / "Chuyên gia hướng dẫn, như thế nào để bắn trúng đích!" / "Như thế nào là siêu cao? Làm thế nào bắn một phát trúng đích? Chuyên gia sẽ hướng dẫn cho bạn." / "Hãy làm theo hướng dẫn, bắt đầu luyện tập!" / "Ghi nhớ lời dạy, chăm chỉ luyện tập. Mỗi một lần bắn càng gần mục tiêu hơn. Con quạ đen hôm nay sẽ trở thành con phượng hoàng mau thôi!" / "Thử thách địa ngục, con đường của cao thủ!" / "Thời gian, gió, độ cao thấp, mọi lúc mọi nơi làm sao có thể bắn trúng đích? Nếu đủ lòng tin, hãy mau đến thử thách. Đây là nhiệm vụ gian nan nhất trước khi trở thành cao thủ. Đương nhiên thù lao cũng rất xứng đáng!" | Title: "Sala de Treinamento". Banner: "Em breve!". Panels: "Torne-se um mestre e receba recompensas generosas!" / "Seja você quem for, a Sala de Treinamento é um lugar que você precisa visitar. Aqui você pode aprender novas técnicas para se tornar um mestre e tem a chance de ganhar inúmeras recompensas!" / "O especialista ensina como acertar o alvo!" / "O que é o tiro super alto? Como acertar o alvo em um único tiro? O especialista vai te ensinar." / "Siga as instruções e comece a treinar!" / "Lembre-se das lições e treine com dedicação. A cada tiro você chega mais perto do alvo. Hoje mesmo esse corvo vai virar uma fênix!" / "Desafio Infernal, o caminho dos mestres!" / "Tempo, vento, altura — como acertar o alvo em qualquer situação? Se você tem confiança, venha logo encarar o desafio. Esta é a tarefa mais difícil antes de se tornar um mestre. E claro, a recompensa também é à altura!" |

Checked and confirmed **textless** (decorative art/background only, no translation needed): `quest.swf ::
29_asset.core.quest.textImg.NEW.png` ("NEW", already Latin/universal), `quest.swf ::
23_asset.core.quest.textImg.OK.png` ("OK!!", already Latin/universal), `newchickenbox.swf ::
21_asset.newChickenBox.BG.png`, `labyrinth.swf :: 23_ddt.labyrinth.leftBG.png`, `firstrecharge.swf ::
3_asset.firstrecharge.frame.bg.png`.

## Confirmed from live client (highest priority — first screen after login)

Verified by actually running the stack and opening `/play` (Playwright + Ruffle), not just FFDec export: the
**entire main hall/lobby screen** (`hall.swf`, likely `hall_old.swf` too) renders its building/menu captions
as text baked into the button artwork, not as plain `TextField`s driven by `language.txt` — confirmed because
`language.txt` is already pt-BR end to end (served correctly by `apps/api`) and yet every one of these labels
still shows Vietnamese: "Phòng cao thủ", "Sân tập luyện", "Suối nước nóng", "Phòng game", "Guild", "Lễ đường
kết hôn", "Đấu giá", "Shop" (already Latin, no change needed), "Phòng sư đồ", "Kết bạn", "Ải Viễn Chinh", "Sự
kiện", "Phản hồi", "Nông Trại", "Nạp", "Kênh". This is the single biggest piece of VN-baked-text real estate
in the game (first thing every player sees) and should be first in line for the image-regeneration batch —
higher priority than the `hall.swf :: battleLABS.png` tutorial comic above. Suggested pt-BR captions:
Phòng cao thủ → Sala dos Mestres; Sân tập luyện → Campo de Treinamento; Suối nước nóng → Fonte Termal;
Phòng game → Sala de Jogos; Guild → Clã; Lễ đường kết hôn → Salão de Casamento; Phòng sư đồ → Sala
Mestre-Discípulo; Kết bạn → Amigos; Ải Viễn Chinh → Passo da Expedição; Sự kiện → Eventos; Phản hồi →
Feedback; Nông Trại → Fazenda; Nạp → Recarregar; Kênh → Canal.

These specific button graphics were not in the curated-28-SWF FFDec export above (ran before this discovery);
re-export `hall.swf`/`hall_old.swf` images with FFDec and cross-reference against this screenshot to find the
exact asset filenames before the regeneration pass.

## Remaining (not yet reviewed)

- The other ~100 SWFs under `ui/vietnam/swf/` not in the curated 28 (worldboss, task, toolbar, serverList,
  activeevents, noviceactivity, league, consortiabattle, cardsystem, luckstar, and everything not listed
  above) — exported images not yet visually triaged.
- Within the 28 SWFs already exported (1841 images total under the FFDec output), only the `title`/`text`/
  `name`/`banner`-named and largest-by-size candidates were opened; many mid-size PNGs (icons, item-reward
  thumbnails, smaller UI chrome) were not individually checked and may still carry small baked labels.
- `quest.swf`'s `RewardText.Type1-8`/`Buff1-4` images (reward-type icon labels) were listed as title-like
  candidates by name but not opened — likely short baked labels (e.g. "EXP", "Vàng") worth a quick pass.
- Any text baked into `.jpg`/`.png` assets referenced directly from `ui/vietnam/img/*.jpg` (banner images
  outside the SWFs, e.g. `active.jpg`, `auction.jpg`, `consortia.jpg`, `dungeon.jpg`, `hotwell.jpg`,
  `roomlist.jpg`, `tofflist.jpg`, `campaignlab.jpg`, `church.jpg`) — not exported/reviewed yet.

## Next phase (not started): image regeneration

Per the plan: redraw each image from the original (image-to-image, same canvas size/anchors so the SWF's
existing placement/scale9 data keeps working), output into the API asset overlay
(`apps/api/assets/flash/ui/vietnam/...`, same mechanism used for `language.txt`/`movingnotification.txt`/
`levelreward.xml` in this pass — see `apps/api/src/routes/static.ts`'s `flashFix` tree). Tools available:
Recraft (paid credits available) and Higgsfield (no paid credits; check `models_explore`/`balance` for
in-house models with free generation allowances). Do this as a separate batch per `docs/BACKLOG.md`.
