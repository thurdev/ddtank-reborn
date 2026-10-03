# Images that need the AI batch (not programmatic text replacement)

Produced while executing the top-priority image-text-replacement batch (see `docs/BACKLOG.md` "Lote de IMAGENS
PT-BR + dark mode" and `research/i18n/images-with-text.md`). The pipeline in `tools/i18n/images/` (FFDec export
→ tesseract.js OCR → sharp/@napi-rs/canvas inpaint-and-redraw → FFDec re-import) works well for **flat captions
and tooltip plates** (see the 63 images already done: hall/hall_old lobby captions+tooltips, roomlist, store,
gameover, wonderfulactivity, elitegame, vipview, calendar — `tools/i18n/images/targets.json`). It is **not**
a good fit for the images below, because the Vietnamese text is either (a) baked directly into painted/shaded
artwork rather than sitting on a flat or simple-gradient plate, or (b) several differently-styled text blocks
share one large background bitmap, which the pipeline's "one text-color estimate per image" model can't
reproduce without a muddy average color. Recommend Recraft or a free Higgsfield image model (check
`mcp__higgsfield__models_explore` / `balance` for a free allowance before spending paid credits) with
image-to-image inpainting guided by a text-region mask, keeping canvas size/anchors identical.

| Image | Size | Why programmatic fails | VN text (for the AI prompt) |
|---|---|---|---|
| `hall.swf` / `hall_old.swf` :: `4_asset.hall.battleLABS.png` / `7_asset.hall.battleLABS.png` | 492×1616 | 4-panel hand-painted tutorial comic; text is lettering integrated into the illustration (speech-bubble-less captions over character art, varying colors/sizes per panel), not a plate | See full transcript + PT-BR draft already in `research/i18n/images-with-text.md` ("Confirmed from live client" section, "Phòng tập luyện" comic) |
| `DDT_Loading.swf` :: `25.png` | 461×200 | Client boot splash title: 3 stacked words in 3 different colors/fonts (green "Phiên Bản Hồi Ức", red "GUNNY", blue "HUYỀN THOẠI") with bevel/emboss over a parchment ribbon + character mascots either side — a single fill/stroke estimate would average all 3 into one wrong color | "Phiên Bản Hồi Ức" → "Edição Memórias" (or "Edição Nostalgia"); "GUNNY" stays as the brand name (Latin, no change); "HUYỀN THOẠI" → "LENDA" |
| `roomlist.swf` :: `72_asset.DungeonList.DungeonListBG.jpg` | 965×? (152 KB JPEG) | Full painted background texture with two separately-styled baked labels ("Ải viễn chinh" banner ribbon + "Danh sách phòng" tab) at different scales/positions on one bitmap | "Ải viễn chinh" → "Passo da Expedição"; "Danh sách phòng" → "Lista de Salas" |
| `wonderfulactivity.swf` :: `84_wonderful.accumulative.title.png` | 100 KB | Large decorative event banner — title text wraps around ornamental icons/coins, not a flat plate | "Nạp Tích Lũy Nhận Quà Liền Tay" → "Recarga Acumulada: Receba Já Seu Prêmio" |
| `awardsystem.swf` (+ identical `awardsystem1.swf`, and the equivalent `RouletteBG`/`TurnplateMainView` in `roulette.swf`/`roulette1.swf`) :: `59_asset.awardSystem.roulette.RouletteBG.png` | 508 KB | Roulette-wheel background art with 4 separate labels at different points around the wheel ("Số lần mở", "Lần này cần", "Hiện có", "Chúc mừng bạn nhận được vật phẩm") baked into the illustration | "Vezes abertas" / "Necessário desta vez" / "Você tem" / "Parabéns, você recebeu um item" |

## Lower priority, not AI-only, just deferred to the next pass

- `hall.swf` / `hall_old.swf` :: `7_asset.hallSaveFile.noviceBG.png` / `4_asset.hallSaveFile.noviceBG.png` (588×339) — the legacy "enable Adobe Flash Player local storage" dialog text (9-line paragraph). This one actually *is* flat text on a plain backdrop (the programmatic pipeline could handle it), but it's a Flash-Player-specific settings prompt that may be meaningless under Ruffle — worth confirming whether it even surfaces before spending a render+repack cycle on it. VN→PT-BR draft: "Đề nghị / Để bạn chơi game được thuận tiện, Gunny yêu cầu bạn mở chức năng lưu của Adobe Flash Player / ... / (Nhắn OK ở cửa sổ bên phải để đồng ý)" → "Sugestão / Para jogar com mais conforto, o Gunny pede que você ative o armazenamento local do Adobe Flash Player / ... / (Clique OK na janela à direita para concordar)".

## Everything else

The remaining ~2790 OCR-flagged rows in `research/i18n/image-inventory.json` (P3–P6: most main-window
sub-panels, combat UI, and the long tail of secondary activity SWFs) have not been individually triaged for
"art-integrated" vs. "plate" text — that classification only happened for the top-priority batch above and the
63 images already replaced. Expect a similar ratio (most are flat plates the existing pipeline can handle
directly; large JPEG/PNG background textures — "BG", "Bg", banner/ribbon assets over ~80 KB — are the ones
most likely to need this AI path, same reasoning as the rows above).
