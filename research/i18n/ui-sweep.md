# UI sweep — PT-BR visual QA (2026-10-03)

Live sweep of the running stack (`pnpm dev:all`, account `test/test`, Playwright against `http://localhost:5173/play`,
viewport 1400x950 to avoid clipping the Flash stage — the SWF's native stage is 1000x600 and Ruffle stretches it
non-uniformly to fill the container, so a narrower viewport clips window close-buttons off the right edge; this is a
Ruffle scaling cosmetic issue, not an i18n bug, noted once here and not repeated below).

Triggered by a user report: "many buttons are still NOT translated; some buttons got BROKEN by our image
replacement; loading screen still the old Vietnamese one." All three turned out to be real, and investigating them
surfaced two distinct pipeline bugs (now fixed, see "Root causes fixed" below) plus two bug classes that are
**outside the image-replacement pipeline's reach** (native/dynamic text, not bitmaps) and need separate follow-up.

## Root causes fixed this session

1. **OCR-noise-in-caption bug** (`tools/i18n/images/lookup.mjs`). OCR of button art regularly misreads a decorative
   icon glyph next to the caption as 1-3 stray symbol characters glued to the text (`, bảng đổi màu`,
   `€ Hợp thành |`). The glossary-substring-match path (and a few curated entries) then re-emitted that noise
   verbatim around the translation (`, tabela de cores`) — exactly the "broken button" users saw. Fixed by adding
   `cleanOcrNoise()` and running it on both the lookup key and the matched/substituted value before it's ever drawn.
2. **Portuguese-vs-Vietnamese diacritic false positive** (`tools/i18n/images/run-remaining.mjs`,
   `fix-garbled.mjs`). The "does this rendered image still have Vietnamese" QA gate used
   `[àáảãạăắằẳẵặâấầẩẫậđèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵ]` — which also matches ordinary
   Portuguese letters (ã, â, ô, é, í, ó, ú...). Any correct PT-BR render containing one of those got rejected,
   retried, and ultimately **reverted to Vietnamese** even though the translation was fine. Fixed with
   `VN_ONLY_RE` in `lookup.mjs` (only diacritics that never occur in Portuguese: đ, ă, ơ, ư, dot-below, hook-above,
   the stacked double-diacritic vowels, ì/ù/ỳ) and wired into both `run-remaining.mjs` and the new `fix-garbled.mjs`.
3. Reconciliation pass (`tools/i18n/images/fix-garbled.mjs`, new script) re-translated and re-verified all 784 rows
   in `targets.json` with the fixed lookup/QA logic: **690 re-rendered and improved** (noise stripped, previously
   wrongly-reverted PT-BR now renders), **94 reverted** to the original vendor pixels (their OCR text was mostly
   unreadable painted art / partial glossary substitution leaving a mixed VN+PT mess — not salvageable
   programmatically; logged for the AI inpainting batch instead of shipping broken art). 87 SWFs repacked via
   `pack.sh`. See `research/i18n/before-after.html` for a visual sample and
   `C:/Users/T/AppData/Local/Temp/.../scratchpad/i18n/fix-garbled-{improved,revert}-log.json` for the full lists.
4. One manual layout nudge: `shop.swf`'s "Conjunto de roupas" checkbox caption shortened to "Conjunto" (curated
   caption) to give it more breathing room next to the "Asas" checkbox — see "Not fixed" below, this did **not**
   fully resolve the visual overlap (root cause is a display-list position issue, not text length).

## Window-by-window findings

### Loading screen (DDT_Loading / whack-a-mole splash)
- **Still 100% Vietnamese**: "điểm : 0" (score), "Đang tải[Bản mẫu]: 12/13" (loading label — note the literal
  `[Bản mẫu]` bracket text, a template placeholder that was never substituted/translated either).
- This is the `DDT_Loading.swf` : `25.png` splash title already flagged in `research/i18n/needs-ai.md` as
  AI-inpainting-only (3 stacked words in 3 different colors/fonts over painted art) — confirmed still unaddressed.
  The "điểm"/"Đang tải" strings are a **separate**, additional problem: they're the mini-game HUD, not the splash
  title, and weren't in the inventory at all (not scanned). Needs a follow-up OCR/translate pass scoped to
  `DDT_Loading.swf` specifically.

### Hall / lobby (hall.swf)
- Building labels, toolbar, event bubbles: **mostly fixed and correct** (Sala dos Mestres, Fonte Termal, Shop,
  Guild, Amigos, Fazenda, Recarregar, Feedback, Eventos, etc.) — confirms the earlier lote #1/#2 batches shipped
  correctly for this screen.
- **Still Vietnamese**: "Kênh" (channel label) and "Đấu giá" (Auction building label). Both already have PT-BR
  staged in `curated-captions.json` per `needs-ai.md` but are confirmed **not bitmaps** (not found in
  `image-inventory.json`, not found via `ffdec -export text` on `hall.swf`/`hall_old.swf`/`ddthallicon.swf`) —
  native/dynamic text, out of the image pipeline's reach. Channel name itself ("Gà Sát Th...") is user/server data,
  truncated with no ellipsis — likely a fixed-width TextField with no overflow handling, separate minor bug.

### Bag / Character / Pets / Totem (bagandinfo.swf, tabbed window)
- Tab bitmaps correct ("Informações pessoais", "Caixa de presente"), but **"Tu luyện" and "Thú cưng" tabs are still
  Vietnamese**.
- The entire equipment-slot grid (Nón/Kính/Tóc/Mặt/Áo/Bộ/Cánh/Nhẫn), stat labels (Tấn công/Phòng thủ/Nhanh
  nhẹn/May mắn/Sát thương/Hộ giáp/Máu/Thể lực/Lực chiến), and several buttons (Thành tích, Trợ thủ, Khác, Ẩn,
  Dịch chuyển, Hỗ trợ, Tinh Luyện, Mật mã cấp 2, Phím tắt, Tách) are **still Vietnamese**. Confirmed via
  `ffdec -export text` on `bagandinfo.swf` that **none of this is static SWF text** (empty export) and via
  `ffdec -export script` that the strings aren't literal constants in this SWF's own bytecode either — it's
  rendered from a shared component library not yet located (see "Not fixed" below).
- Right-side vertical tabs "KHO" (warehouse), "Trang bị" (equipment), "Đạo cụ" (items), "Thẻ bài" (cards): VN.
- "Guild:Reborn <Hi trưng>" — the player's guild-rank suffix ("Hội trưởng" = guild master) is truncated to
  "Hi trưng", losing letters mid-word — looks like the font-glyph-dropping bug (see below), not truncation.

### Shop (shop.swf)
- Header, tab "Oferta" and the equip-slot/item-type sidebar icons: correct PT-BR.
- Tabs "Giới thiệu", "Trang bị", "Đổi", "Nhận miễn phí": still VN (same tab-bitmap-translated-inconsistently
  pattern as elsewhere — some tabs in a row get done, others don't).
- **Fixed this session**: the "Carteira" wallet-summary panel, previously a single garbled line
  ("Ban hiện co ở?2 Mocda") — now renders as three clean rows (Xu / Lễ kim / H.Chương with their numbers). The
  "bảng đổi màu" → "tabela de cores" button (previously `, tabela de cores` with a leading comma) now renders clean.
- **Still broken (not fixable via image pipeline)**: the "Conjunto" / "Asas" checkbox captions visually overlap
  ("Conju[overlap]cAsas"). Confirmed each PNG renders correctly in isolation (re-exported and inspected both) —
  this is a **display-list positioning** issue (the two checkboxes/labels are placed too close together in the
  SWF timeline), not a content/image bug. Shortening the caption ("Conjunto de roupas" → "Conjunto") did not
  resolve it. Needs a `-replaceText`/timeline-edit pass on `shop.swf`'s checkbox row, out of scope here.
- Major untranslated buttons: "Giỏ hàng" (Buy-cart... wait, re-checked: this is actually a different asset than the
  "Carteira" one), "Mua" (×6, every "Buy" button on the item grid and item cards), "Nam"/"Nữ" (gender filter),
  "Tìm" (search). None of these are in `image-inventory.json` as exact matches — native text (see below).

### Mail (email.swf)
- "Remetente/Correio" chrome, "Restam:N dias", "Escrever correio", "Carta enviada": correct PT-BR.
- **Still Vietnamese**: "Xóa" (delete), "Thêm bạn" (add friend — note: the *same* action correctly shows
  "Adicionar amigo" in the Friends window, so this is a distinct, not-yet-covered asset:
  `email.swf :: 54_asset.email.addFriend.png`, OCR so garbled (`⁄-SR*YY2vítEYY,x\ns 'IẽThêmbạn ,`) that the
  pipeline never found a translation for it — a good **concrete, fixable target** for a follow-up curated-caption
  entry).
- **Broken layout**: the bottom toolbar ("Escrever correio" / "Responder" / "Devolver correio" / "guia") visually
  overlaps — 4 buttons whose PT-BR labels are collectively wider than the VN originals, crammed into a fixed-width
  row. `reply_btn.label` (`Trả lời` → `Responder`) is a `language.txt` key; the others weren't found in
  `language.txt` at all (may be native/hardcoded). Not an image-pipeline bug; needs either shorter PT-BR wording or
  a layout change in `email.swf`.
- **Mail subject content garbled**: a GM-sent subject "Đền bù bảo trì" (maintenance compensation) renders as
  "Đn bù bo tri" — letters dropped, not just accents. This is the font-glyph bug, see below.

### Friends ("Kết bạn" / invite.swf)
- Title banner "Kết bạn" itself: still Vietnamese (should be something like "Fazer Amigos").
- "Pedido de casamento" and "Adicionar amigo" buttons: correct PT-BR.
- Still VN: "Hạng", "Công" (contribution, truncated), "Trạng thái hôn nhân", "Giới thiệu", "Nam"/"Nữ",
  "Tên"/"Cấp"/"Trạng thái" column headers, "Trước"/"Sau" pager, a red "Sửa điểm" button. None found in the image
  inventory under exact match — native text (see below). A functional (non-i18n) error dialog also appeared
  ("Falha ao carregar informações de amizade do jogador") — itself correctly translated, but indicates the
  friends-list API call is failing for this test account; flagged for the backend owner, not an i18n issue.

### Guild (consortion*.swf)
- "Gerenciamento", "Recrutar", "Sair do Clã", the empty-mission notice: correct PT-BR.
- Still VN: "Cấp Guild" (big banner), "Nhấn chọn mua huân chương guild", "Tên Guild"/"Chủ guild"/"Người"/"tài
  sản"/"Công trạng"/"hạng"/"Phí duy trì" (stat row), all 6 member-table column headers, "Hi trưng" (rank, same
  truncation as the Bag window), "Cống hiến Guild", "Shop Guild", "Tiệm rèn", "Két sắt", "Kỹ năng guild",
  "Lời hội trưởng".
- **Typo found** (not caused by this session's work): guild side-panel tab reads "Pontes de Contribuição Semanal" —
  should be "**Pontos** de Contribuição Semanal" ("Pontes" = bridges). Could not locate the source string (not in
  `language.txt`, `curated-captions.json`, or the MT cache — likely DB-seeded `app.Translations` content from the
  earlier "resto do DB" pass). Flagged in BACKLOG for whoever owns that table.

### Room list (roomlist.swf) / Dungeon select (same component, "Ải viễn chinh" skin)
- Window title "Sala de Jogos" correct; dungeon variant's banner "**Ải viễn chinh**" still Vietnamese — this is the
  `roomlist.swf :: 72_asset.DungeonList.DungeonListBG.jpg` painted background already flagged needs-AI in
  `needs-ai.md` ("Ải viễn chinh" + "Danh sách phòng" baked into one JPEG) — confirmed still unaddressed, consistent
  with the existing plan.
- Column header "Nome da sala" correct; "loại phòng", "Bản đồ", "Mức độ", "Số người" still VN.
- Sidebar "Thông tin" correct; "Hạng"/"Công"/"Cấp"/"Giới tính" still VN.
- Action buttons "Tổ đội" (team up), "Tìm" (find), "Bắt đầu" (start) — all three, very prominent — still VN, not
  in the image inventory. Native text.

### Events / check-in calendar (calendar.swf)
- Calendar grid itself (day names, "Recompensa acumulada", "Número de vezes acumuladas", "Nhận mỗi ngày"... wait,
  "Nhận mỗi ngày" is VN) — mixed: date grid chrome mostly correct, "Hoạt động đổi thưởng" banner still VN,
  "Nhận mỗi ngày" button still VN.
- Window title renders "recompensa de check-in(**S**)" — the trailing `(S)` / `(H)` / `(R)` pattern seen on this
  and other window titles (Settings → `Configurações(H)`, Mail → `Correio (R)`) is **not a bug** — it's the
  original UI's keyboard-shortcut hint, correctly preserved.
- **Garbled list content**: the activity list sidebar shows "Ná Thn tr li" and "Tng nhng vt phm h tr cho ngưi
  chơi" — both missing most Vietnamese-only diacritic letters (should read roughly "Nhận Thưởng trả lời" /
  "Tặng những vật phẩm hỗ trợ cho người chơi"). Same font-glyph-dropping bug, see below — and notably this is
  *not* even translated content, it's the original Vietnamese rendering with holes in it.

### Auction (auction.swf)
- Category sidebar (Armas, Roupas, Beleza, Pedra de fortalecimento, Pedra de combinação, Gemas, Broca, Fragmento
  raro, Cartas, Outros) and "(Detalhes)"/"Vendedor"/"(Anterior)": correct PT-BR.
- Window title "**Đấu giá**" and all 3 tabs ("Tìm vật phẩm", "Đấu giá", "Vật phẩm tôi đấu giá") still VN. Column
  headers "Tên"/"Số lượng"/"Còn lại"/"Giá" still VN (only "Vendedor" made it). Central placeholder message
  ("Hãy chọn loại vật phẩm...") still VN. "Giá đấu"/"Giá chót" buttons still VN. "Sau" pager still VN (its sibling
  "(Anterior)" is translated — same inconsistent-pair pattern as Trước/Sau elsewhere).

### Settings (setting.swf)
- Mostly well translated: "Efeitos", "Função de megafone", "Receber convite", "Indicador de status online",
  "Permitir amizade" all correct. "Thiết lập âm thanh"/"Nhạc nền"/"Thiết lập hiển thị"/"Hiệu ứng đặc biệt vũ
  khí"/"Thiết lập tính năng"/"Từ chối tin nhắn người lạ" still VN.
- **Confirm/Cancel buttons garbled**: "Đồng ý" renders as "**Đng ý**", "Hủy bỏ" renders as "**Hy b**" — same
  font-glyph-dropping bug as the mail subject / event list above, on two of the most-clicked buttons in the game.

## Not fixed — outside the image-replacement pipeline (need separate follow-up)

1. **Native/dynamic UI-chrome text** (by far the largest remaining gap). A huge, consistent set of short labels —
   equip-slot names, stat labels, table column headers (Tên/Cấp/Hạng/Công/Trạng thái/Giới tính/Số lượng/Còn lại),
   pagers (Trước/Sau), filters (Nam/Nữ), and several primary action buttons (Mua, Giỏ hàng, Tìm, Tổ đội, Bắt đầu,
   Xóa) — is **not** present as a bitmap in any scanned SWF (`image-inventory.json` exact-match search came back
   empty for every example tried) and **not** static SWF text (`ffdec -export text` returns nothing for the owning
   SWFs). One sample key (`tank.data.EquipType.head`) *is* in `language.txt` and *is* correctly translated in the
   served file (`data/i18n/pt-BR/client-language.txt` line 277 → "Chapéu"; verified the API serves the translated
   file at `/flash/ui/vietnam/language.txt` with HTTP 200 and the right bytes) — yet the live client still shows
   "Nón". So the client resolves these particular labels from somewhere this investigation did not locate: likely
   a shared/common component SWF not yet identified (checked `core.swf`, `corei.swf`, `coreii.swf` — none contain
   the literal strings either), or a server-sent field, or an AS3 string-constant pool in a library not yet
   exported. **Recommend a dedicated follow-up task** to trace the actual `LanguageMgr`/component call site before
   attempting a fix — this is not an image problem and the current pipeline cannot touch it.
2. **Font-glyph-dropping on Vietnamese-only diacritics** in certain dynamic TextFields. Confirmed on: Settings'
   Đồng ý/Hủy bỏ buttons, a mail subject line, and the events-window activity list. In every case the *specific*
   missing characters are exactly the Vietnamese-only diacritic set (đ, ă, ơ, ư, dot-below, hook-above — the same
   set `VN_ONLY_RE` now encodes) while Portuguese-shared accented letters survive. Ruled out "the font file is
   missing glyphs": rendered `NotoSans-Regular.ttf` (the font `GameFrame.tsx` feeds to Ruffle) directly with
   `@napi-rs/canvas` for `đ ơ ư ồ ủ ỏ ậ` — all render with ink, so the TTF itself has full coverage. The drop is
   therefore happening inside Ruffle's SWF-embedded-font handling for these specific TextFields (embedFonts=true
   device-font substitution likely doesn't apply the same way as it does for `defaultFonts`), which is a
   Ruffle/SWF-embedding interaction bug outside this task's scope. Flagged for the person who owns `GameFrame.tsx`
   / the Ruffle integration.
3. **Shop checkbox row overlap** ("Conjunto"/"Asas") — display-list positioning, see Shop section above.
4. **Mail toolbar button row overflow** — fixed-width row, PT-BR labels collectively too wide, see Mail section.
5. **"Pontes" → should be "Pontos" typo** in the Guild window — source string not located (likely DB-seeded), see
   Guild section.
6. **needs-ai.md items confirmed still pending, unchanged this session**: loading-screen splash title
   (`DDT_Loading.swf`), `roomlist.swf` dungeon banner JPEG, `wonderfulactivity.swf` banner, `awardsystem*.swf`
   roulette wheel labels, `hall.swf`/`hall_old.swf` battleLABS comic. All painted/multi-style art, need the AI
   inpainting batch, not programmatic replacement.

## Verification after the fix

Re-opened Shop live after repacking: the wallet panel (previously one garbled line) now shows three clean rows
(Xu/Lễ kim/H.Chương with numbers), and the color-panel button now reads "Tabela de cores" with no leading comma.
See `research/i18n/before-after.html` for a broader before/after sample (67 of the 690 fixed + 94 reverted rows —
full lists in `tools/i18n/images/targets.json` and the `fix-garbled-*-log.json` files).

## Follow-up (2026-10-03): ABC constant-pool sweep — "Not fixed" item 1 tested directly, item 2 re-diagnosed

Built `tools/i18n/abc-strings/` (`scan.mjs`/`patch.mjs`/`lib.mjs`, no deps — parses CWS/FWS SWF, finds DoABC/DoABC2
tags, reads the ABC constant pool's string section) to directly test the hypothesis that the native/dynamic UI
text from item 1 above (Mua, Giỏ hàng, Tìm, Bắt đầu, equip-slot labels, table headers, Pontes...) is a hardcoded
ABC string literal, as opposed to a `LanguageMgr` key. Full results + translations in `research/i18n/abc-strings.json`.

**Result: hypothesis refuted, exhaustively.** Scanned the entire `FlashSV1` tree (126 files, including `2.png`/
`3.png` — CWS SWFs disguised with a `.png` extension, see `research/client/01-client-map.md` §5). Found exactly
**42** Vietnamese-character ABC string literals, **all** inside `2.png` (34), `3.png` (5) and `DDT_Loading.swf`
(3). **Zero** in any `ui/vietnam/swf/*.swf` (shop, roomlist, bagandinfo, email, invite, consortion*, auction,
hall, calendar, setting, ...) — confirming this item's own earlier `-export script` spot-check on `bagandinfo.swf`
generalizes to the whole UI-chrome layer. Decompiling `2.png` (`ddt/data/EquipType.as`) shows the actual
mechanism: `EquipType.PARTNAME` is a `public static const Array` built from
`LanguageMgr.GetTranslation("tank.data.EquipType.head")`-style calls — only the **dotted key** is an ABC literal,
the Vietnamese display text is resolved at runtime from `language.txt` via `ddt/manager/LanguageMgr.as`
(`GetTranslation` reads `_dic[key]`, populated once by `LanguageMgr.setup()`). Since `PARTNAME` is `static const`,
AS3 evaluates it **once**, at class-initialization time — if `EquipType` is first touched before
`LanguageMgr.setup()` has finished parsing `language.txt`, the array permanently bakes in whatever `_dic` held at
that instant. This is a concrete, previously-undocumented lead for item 1 (a static-initializer-ordering bug, or
a language.txt load-order race) — not proven by tracing actual boot order yet, but a much narrower place to look
than "a shared/common component SWF not yet identified". Fixing it needs an AS3 source change + recompile (e.g.
lazy getters instead of eager `static const` arrays), not a string-literal patch — out of scope for this session.

**The 42 real ABC literals got translated and patched** (`tools/i18n/abc-strings/translations.json`, applied with
`patch.mjs` — rewrites the string pool's u30 length + UTF-8 bytes in place, leaves every other ABC structure
byte-identical since namespaces/multinames/method bodies reference strings by constant-pool *index*, never byte
offset). Validated two ways: re-scanning the patched files with `scan.mjs --vn-only` (the same
PT-BR/VN-diacritic-overlap-safe regex `tools/i18n/images/lookup.mjs` uses) finds 0 remaining, and
`ffdec -export script` on the patched `2.png` round-trips cleanly, showing e.g.
`com.pickgliss.ui.vo.AlertInfo: SUBMIT_LABEL:String = "Confirmar"`, `CANCEL_LABEL:String = "Cancelar"`.

This directly **re-diagnoses "Not fixed" item 2** (font-glyph-dropping): the Settings "Đồng ý"/"Hủy bỏ" buttons
were never a Ruffle font-embedding bug — `AlertInfo.SUBMIT_LABEL`/`CANCEL_LABEL` are literal Vietnamese ABC
constants the image/DB/language.txt pipeline never touches at all (it only translates bitmaps, `app.Translations`
DB rows, and `language.txt` keys — never raw ABC literals), so the original VN text was rendering as-is, correctly
(the earlier "glyph-dropping" read was a misdiagnosis of this gap, not evidence of a Ruffle bug — unless a real
glyph-drop bug exists independently elsewhere, which this session did not re-test). Live-verified in
`pnpm dev:all` (test/test, Settings window): now renders **"Confirmar" / "Cancelar"** cleanly, both spelled in
full. Screenshots: `research/i18n/abc-verify/00-boot.png` (loading screen: "Carregando[Arquivo do sistema]: 8/13",
was "Đang tải[Bản mẫu]: 12/13"), `01-after-wait.png` (hall, unchanged/consistent with earlier findings),
`02-settings.png` (Settings dialog, Confirmar/Cancelar).

Deployed via `apps/api/assets/flash/{2.png,3.png,DDT_Loading.swf}` (overlay wins over vendor, confirmed by
`apps/api/src/routes/static.ts`'s `flashFix.resolve(rel) ?? flash.resolve(rel)`). `scripts/gen-secrets.mjs` was
updated so its `patch-client-key` step chains through `tools/i18n/abc-strings/patch.mjs` first — it always
re-derives from the untouched **vendor** `2.png` into a scratch temp file, never from its own previous output, so
a later key rotation can't fail trying to find an already-rotated RSA modulus. Pipeline order is documented in a
comment at that call site in `gen-secrets.mjs`.

**"Pontes" → "Pontos" typo (item 5): not reproduced, despite an exhaustive search.** Checked: `app."Translations"`
DB table live (`WHERE text ILIKE '%Pontes%' OR text ILIKE '%Semanal%'` → 0 rows), both `language.txt` PT-BR/VN
files, `curated-captions.json` (has **two** matches for this exact banner text, both already correctly spelled
"**Pontos** de Contribuição Semanal"), `image-inventory.json`/`.md` (same two assets, `ptBrSuggestion` also
correct, status `done`), `targets.json`, and the decompiled ABC of `2.png`/`3.png` (no "Cống hiến"/"Pontes"
literal). The two matching bitmap assets (`13_asset.placardAndEvent.weekOffer1.png`,
`12_asset.placardAndEvent.weekOffer2.png`) belong to `placardAndEvent.swf`, which isn't even in the
`apps/api/assets/flash` overlay yet (never packed) — so the live client can't currently be showing a PT-BR typo
from that asset at all; it'd still be 100% Vietnamese there. The guild-window sighting must be a different,
unlocated asset, or (more likely, given the banner's tiny 72-77px width and bold condensed font) a QA misread of
"Pontos" as "Pontes". Needs a targeted screenshot crop of the actual guild side-panel (requires an account that
owns/joined a guild — this session's test account has none, see `research/e2e/guild/g1-guild-hall.png`) as the
next concrete step, rather than a blind fix.

**Layout overlaps (items 3-4): unchanged, out of scope for this session too** — still display-list positioning in
`shop.swf`/`email.swf`'s compiled timelines, not a text or ABC-string-literal problem; still needs a
`-replaceText`/timeline-edit pass this session didn't attempt (ABC string patching, this session's tool, can't

## Follow-up (2026-10-03, session 3): "Not fixed" item 1 — root cause confirmed with live boot-order evidence

Task: find why runtime-translated strings (Mua, Giỏ hàng, Tìm, Bắt đầu, equip-slot labels, table headers) still
show vi-VN even though their `LanguageMgr.GetTranslation(key)` keys are correctly translated in the served
`language.txt`. Session 2 had a lead (`EquipType.PARTNAME` is a `static const Array` built from `GetTranslation()`
calls, baked once at class-init) but explicitly flagged it as "not proven by tracing actual boot order yet."

**Ruled out this session, with direct evidence:**
- **Not server content.** `curl http://localhost:8080/flash/ui/vietnam/language.txt` (direct, bypassing the Vite
  proxy which doesn't even forward `/flash/*`) returns the correct PT-BR body — `tank.data.EquipType.head:Chapéu`
  at line 277, `.glass:Óculos`, `.hair:Cabelo` etc. all correct.
- **Not browser/HTTP caching.** The client itself appends a cache-busting `?rnd=0.xxx` query param to every
  `language.txt` request (confirmed via Playwright network capture), so no cached response can ever be served;
  every page load is a guaranteed fresh fetch. `Cache-Control: public, max-age=300` + content-hash `ETag` on the
  API route (`apps/api/src/routes/static.ts`) is correctly configured and irrelevant here since the URL always
  differs.
- **Not a stale long-lived Ruffle session.** Reproduced on a **brand-new Playwright page load** (fresh navigation
  to `/play`, no prior tab reuse) — bag window equip-slot labels (`Nón`/`Kính`/`Tóc`/`Mặt`/`Áo`/`Bộ`/`Cánh`) and
  shop window (`Nón`/`Kính`/.../`Mua`×5/`Giỏ hàng`/`Tìm`/`Nam`/`Nữ`) both show 100% vi-VN on first load, every
  time. Screenshots: `research/i18n/session3-verify/02-bag.png`, `research/i18n/session3-verify/04-shop2.png`
  (`01-hall.png` for context — building labels are still correctly PT-BR, confirming sessions 1-2's image-pipeline
  fixes remain intact; only the LanguageMgr-driven native text regressed/was never covered).

**New evidence found this session: network request order proves the race is real, not hypothetical.**
Captured the full network log of a fresh `/play` boot via Playwright
(`mcp__playwright__browser_network_requests`). The relevant slice, in request order:
```
62. GET /flash/Loading.swf
...
66. GET /flash/DDT_Loading.swf
...
69. GET /flash/2.png          <- EquipType.as lives here (confirmed session 2: "Decompiling 2.png shows ... EquipType")
70. GET /flash/ui/vietnam/levelreward.xml
71. GET /resource/flash/characterDefine.xml
72. GET /request/fightspirittemplatelist.xml
73. GET /flash/ui/vietnam/language.txt     <- LanguageMgr.setup() fires only after THIS resolves
74. GET /flash/ui/vietnam/zhancode.txt
75+. UI module SWFs (expression.swf, corei.swf, hall.swf, ... bagandinfo.swf at #175)
```
**`2.png` — the module containing `EquipType`'s compiled bytecode — is fetched 4 requests before `language.txt`
is even requested.** Per `vendor/DDTank41/Source Flash/src/ddt/loader/StartupResourceLoader.as` (read this
session), `LanguageMgr.setup()` has exactly one call site in the whole AS3 codebase (confirmed via
`grep -r "LanguageMgr.setup"` across `Source Flash/src`): `creatLanguageLoader()`, invoked from `loadLanguage()`,
which is the first thing `start()` does, and nothing downstream (`loadExppression()` → `loadUIModule()`) runs
until that completes. So in the documented application-level flow, nothing should touch `EquipType` this early —
yet `2.png` (which bundles `EquipType` alongside other classes like `ddt/view/tips/FineSuitTipsSimple`, per the
`research/i18n/abc-strings.json` scan) is loaded as a **separate, earlier** module, before `StartupResourceLoader`
ever starts its queue. Per the ABC/DoABC tag spec, a SWF's designated entry script runs automatically the moment
the tag is parsed/loaded — if `2.png`'s entry script (whatever registers/exports its bundled classes) references
`EquipType` even indirectly as part of its own setup, `EquipType`'s class initializer — and therefore
`PARTNAME`'s array-literal construction, which calls `LanguageMgr.GetTranslation()` once per slot — runs at that
moment, before `language.txt` has even been requested, let alone parsed. Because `PARTNAME` is `static const`,
AVM2 evaluates it exactly once and the result is permanent for the life of the SWF instance; the later, correct
`LanguageMgr.setup()` call cannot retroactively fix an already-baked array.

**Open gap, honestly flagged rather than guessed at:** this does not yet explain why the baked result is full
*Vietnamese* text rather than empty strings or a `null`-reference crash (`LanguageMgr._dic[key]` on a `null`
`_dic` should throw `Error #1009` under normal AVM2 null-property semantics, and `GetTranslation`'s own fallback
(`_dic[key] ? _dic[key] : ""`) would yield `""` if `_dic` were empty-but-non-null). Two explanations remain
unverified: (a) Ruffle's AVM2 implementation may not throw on this particular access pattern and some other,
still-unlocated code path seeds `_dic` with Vietnamese content very early (there is only one `LanguageMgr.setup()`
call site in the AS3 source, so if this is happening it would have to be via a different, as-yet-unfound
mechanism — possibly a Ruffle-specific quirk, not present in the original AS3 source at all); or (b) `EquipType`
is not actually touched at `2.png`-load time but slightly later (still before `language.txt` finishes parsing) by
something in the hall/avatar-render path, and the “instant” vi-VN result is coming from a different, not-yet-
identified source entirely and `EquipType.PARTNAME` is a correlation (matching key names/order) rather than the
confirmed mechanism. Tracing this further needs an actual AVM2 bytecode step-debugger attached to Ruffle (not
available in this toolchain) or inserting temporary trace-logging into a patched `LanguageMgr`/`EquipType` and
rebuilding — out of scope for this session's budget.

**Why the original vi-VN-only client never showed this as a bug:** nothing here is new to our port — the
compiled client bytecode is byte-identical to vendor except for the already-documented ABC string-literal patches
(session 2's 42 strings, none of which touch `EquipType`). If `EquipType` really is touched before `language.txt`
loads, that race existed in the original deployment too; it was invisible there because the only language ever
served was Vietnamese, so a "wrong" (raced) value and a "correct" value were the same string. Overlaying a
different locale is what makes a pre-existing, latent timing bug visible. This directly answers the task's "does
the original have this ordering" question: **functionally yes, behaviorally no** — same code path, no observable
symptom until the content differs by locale.

**Recommended fix, not attempted this session (risk/effort didn't fit the budget):** ABC-patch `EquipType`'s
class initializer in `2.png` to replace each `findpropstrict LanguageMgr / pushstring <key> / callproperty
GetTranslation` sequence in the `PARTNAME` array construction with a single `pushstring <PT-BR literal>`. This is
materially different from the existing `tools/i18n/abc-strings/patch.mjs` (which only rewrites constant-pool
string *values* in place and never touches bytecode/opcodes) — it needs real method-body bytecode editing
(shrinking the instruction stream, appending new strings to the constant pool, recomputing the method body's
code-length prefix). Given `patch.mjs`'s own `lib.mjs` already has SWF/ABC tag parsing primitives, this is a
tractable follow-up but a separate, larger tool, not a one-line change. The safer, lower-effort alternative is a
load-order fix instead of a bytecode patch: find whatever causes `2.png` to load/execute before
`StartupResourceLoader.start()` begins and defer it, OR force a **synchronous** `LanguageMgr.setup()` call (e.g.
patching `LanguageMgr`'s own class in whichever SWF defines it to self-populate `_dic` from an embedded PT-BR
string baked into its own class initializer) so `_dic` is never null/VN at the moment anything else references
it — same bytecode-editing caveat applies, just to a smaller, single-purpose target (`LanguageMgr` instead of
every static-array class). Worth checking first whether other classes in `2.png`/`3.png` share this exact
`static const Array = [...GetTranslation()...]` pattern (grep the AS3 source tree for
`static const.*Array.*GetTranslation` beyond `EquipType`) before building the patcher, since one bytecode-editing
tool could fix all of them in one pass.

**Checked — 7 more classes share the exact pattern** (`grep -rlE "static const.*Array.*GetTranslation" "vendor/
DDTank41/Source Flash/src"`): `cardSystem/data/CardInfo.as`, `ddt/data/EquipType.as`,
`ddt/data/goods/QualityType.as`, `ddt/view/chat/ChatFastReplyPanel.as`, `ddt/view/tips/CardsTipPanel.as`,
`game/view/smallMap/SmallMapView.as`, `lottery/LotteryContorller.as`,
`store/view/strength/LaterEquipmentView.as`. This is a systemic authoring pattern in the original codebase, not
an `EquipType`-only accident — the eventual bytecode patcher (or load-order fix) needs to cover all 8, and this
likely also explains some of the still-unexplained "table headers"/"stat labels" VN text noted elsewhere in this
doc (e.g. `QualityType` almost certainly drives item-quality labels shown in tooltips/table columns). Not
individually verified against live screenshots this session — flagging as the concrete next step's starting
list rather than re-confirming each one.
move DisplayObject positions).
