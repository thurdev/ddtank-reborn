# 00 – Game resource pack (`resource/`) for the 4.1 client (2026-10-01)

Gap #1 from `research/01-sources.md`: no repo ships a 4.1 `resource/` pack, and every `SITE` in the client configs
points at a dead CDN. This note covers what the client asks for, what was found and downloaded, the coverage we get,
and how to fill the rest.

**Bottom line:** `vendor/_assets/merged/` (37,349 files, about 1.3 GB, hard-linked to the source packs so it uses no extra disk) covers **76.9% of
the core files** that the 4.1 templates reference. It covers **100% of the boot/default-avatar requests** that 404 in
`research/client/evidence/boot-requests.tsv`, and **98% of map layers**.

To use it, serve `vendor/_assets/merged/` at the client's `SITE` URL (for example
`http://127.0.0.1/resource/` → `<SITE value=".../resource/"/>`) with a **case-insensitive** static handler.

---

## 1. What the client loads (path templates)

All paths are relative to `SITE` (`PathInfo.SITE`) unless they are marked FLASHSITE. Source:
`vendor/DDTank41/Source Flash/src/ddt/manager/PathManager.as`, plus `SoundManager`, `BallInfo.as`,
`GameNeedMovieInfo.as` and `RoomLoading*`.

| What | Template | Built from |
|---|---|---|
| Weapon (Category 7 / 27) | `image/arm/{Pic}/1/icon.png`, `image/arm/{Pic}/1/{gunBack?1:0}/{show\|game}.png`, `image/arm/{Pic}/00.png` | `solveGoodsPath` |
| Wearables (1 head, 2 glass, 3 hair, 4 eff, 5 cloth, 6 face, 13 suits) | `image/equip/{m\|f}/{type}/{Pic}/icon_{color}.png`; `.../{Pic}/{color}[/{hairType A\|B}]/{show\|game}.png` | sex is `NeedSex==1 ? m : f` |
| Jewels (8 armlet, 9 ring, 14 necklace, 28/29 temp) | `image/equip/{type}/{Pic}/icon.png` (no sex folder) | |
| Wing (15) | `image/equip/wing/{Pic}/icon.png`, `.../wings.swf` | `soloveWingPath` |
| Props by category | 11/20/23/30/34/35/40 `image/unfrightprop/{Pic}/icon.png`. 12 `image/task/`. 16 `image/specialprop/chatBall/`. 17/31 `image/equip/offhand/`. 18 `image/cardbox/`. 19 `image/equip/recover/`. 25 `image/gift/`. 26 `image/card/{Pic}/icon.jpg`. 32/36 `image/farm/Crops/{Pic}/seed.png`. 33 `image/farm/Fertilizer/`. 50/51/52 `image/petequip/{arm\|hat\|cloth}/`. Anything else: `image/prop/{Pic}/icon.png` | `solveGoodsPath` |
| Default avatar (boot) | `image/equip/{m\|f}/{type}/default/{n}/show.png`, `image/equip/wing/default/wings.swf`, `flash/characterdefine.xml` | `boot-requests.tsv` |
| Battle map | `image/map/{ID}/{BackPic}.jpg`, `{ForePic}.png`, `{DeadPic}.png`, `icon.png`, `samll_map.png` (sic), `samll_map_s.jpg`, `small.png`, `show1.jpg` | `solveMapPath` / `solveMapIconPath`, LoadMapsItems |
| Music | `sound/{BackMusic or MUSIC_LIST id}.flv` | `SoundManager` |
| Bombs | `image/bomb/blastOut/blastOut{BallID}.swf`, `image/bomb/bullet/bullet{BombPartical}.swf`, `image/bomb/crater/{Crater}/crater.png` + `craterBrink.png` | `BallInfo.loadBombAsset`, BallList |
| NPC / boss | `{ResourcesPath}` from NPCInfoList (for example `image/game/living/Living001.swf`). `solveGameLivingPath("game.living.X")` gives `image/game/living/X.swf` | |
| Server-pushed (`LOAD_RESOURCE`, type 2) | Any `SITE`-relative path. The PvE scripts send `image/game/effect/{n}/*.swf`, `image/bomb/...`, `image/map/...` | `Game.AddLoadingFile(2, path, class)` |
| Pets | `image/pet/{Pic}/icon{1..3}.png`, `image/gameasset/{GameAssetUrl}.swf`, `image/game/living/*.swf`, `image/petskill/{id}/icon.png`, `image/skilleffect/*.swf`, `image/buff/{id}/icon.png` | |
| Other | `image/title/{Pic}/icon.png`, `image/virtual/{M\|F}/{hair\|face\|eff\|cloth\|clothF}/{id}/{n}.png` (scenes), `image/church/scene/*.swf`, `image/consortiaicon\|consortiamap/*.png`, `image/effort/`, `image/badge/`, `image/leagueRank/`, `image/world*/`, `image/tilemap/{id}/map.bin`, `image/worldboss/`, `image/equip/effects/...`, `image/skill/{id}.swf`, `image/tool/{x}.png` | |
| FLASHSITE (already in `FlashSV1`) | `ui/{LANGUAGE}/{swf,xml,img}/…`, `language.txt`, `bombs/{id}.swf`, `audio.swf`, `shape.swf`, `partical.xml` | `getUIPath()` |

The UI (`ui/vietnam/*`, 114 swf and 102 xml) is served from FLASHSITE and is already in the repo. It is not part of
this pack.

---

## 2. Sources searched

| Source | Result |
|---|---|
| **thanhtinz/Gun_mobile**, release `Ok` | **Best find.** `Archive.3.zip` (1.04 GB) is a full PC server dump with `Resource/image/**` (about 21.9k files after merging its inner `bomb.zip`, `equip.zip`, `image.zip` and `title.zip`), 120 `sound/*.flv` and `Request/*.xml` (zlib caches, including TemplateAlllist). It is a **later CN-trad build** (Morn UI and Starling, `version 324→325`), not 4.1. `equip_arm_bundle.zip` (95 MB) is a subset of the same equip/arm art. `Archive.zip` / `Archive.2.zip` (SQL backups, Flash) were not downloaded. |
| **dk-khoado/Gunny-3.0** | 3.0 `inetpub/wwwroot/Resource` (21.7k files: image, sound with 130 flv, partical, weapon, video, xml). Sparse-cloned. |
| GitHub `gh search repos/code` (ddtank/gunny × resource/flash/client/assets/3.6/4.1, `solveGoodsPath`, `characterDefine.xml`, `samll_map`, …) | Only code. Client-source repos: yutikeyux/ddt-34-flash, ddt-5-5, barrydevp/ddt3.4flash, ddt3.8_flash, khanghh/ddtank_client. Downloaders: julio-rodrigues/Resource-Downloader and duyplus/HaiHai-17 DDTankFlashDownloader (they confirm the same templates, for example `arm/{Pic}/00.png`). jodisman/ddtank-assets is unrelated sprites. No 3.6 or 4.1 pack on GitHub. |
| Wayback CDX | Checked the configs' CDNs `gunny.vcdn.vn` (about 60 captures under `image/`, 4 with status 200), `ddt-a.akamaihd.net` and `ddttr-a.akamaihd.net` (crossdomain.xml only), and `*.7road.net` (`res57-land-ddt.7road.net`, 173 captures). Of the 4,798 missing files, **only 4 are archived**. Not worth a fetcher. |
| archive.org search | Nothing relevant. `gunny-origin` is a mobile APK. |
| RaGEZONE (web search) | Threads "Resource for server DDTank 3.0", "DDTank Files 4.1 + Source", "DDTank Files 4.1 OASES". Downloads need a login, and the links are old file hosts (not verified). This is the likely origin of the remake author's ~1 GB **3.6** pack (`remake/main:DOCUMENTACAO-RESOURCE.md`). |
| Live third-party CDNs (resource.ddclassico.com and others) | **Not used.** That follows the remake's rule "don't scrape third-party CDNs". |

---

## 3. What was downloaded (all gitignored under `vendor/`)

```
vendor/_assets/
  gun_mobile/Archive.3.zip, equip_arm_bundle.zip, list3.txt (zip listing)
  gun_mobile/extracted/{Resource,Request}/   Resource = image + sound; Request = later-version XML caches
  gun_mobile/bundle/Resource/                equip/arm subset
  gunny30/                                   sparse checkout, Resource at inetpub/wwwroot/Resource
  merged/                                    output of build-pack.mjs (serve this as SITE)
```

Tools are in `research/assets/`:
- `build-pack.mjs` builds `merged/`. Layer order is gunny30 → gun_mobile → bundle. For map fore and dead layers it picks
  the candidate whose PNG size matches the `ForegroundWidth/Height` in LoadMapsItems, so the art lines up with the
  server's `.map` collision data. It **strips the 5-byte `00 03 5E 5F 5E` ("^_^") prefix** from 1,307 later-version
  PNGs, because the 4.1 client has no decoder for it (no `^_^` logic in the AS3 source). It also adds
  `flash/characterdefine.xml` and `characterDefine.xml` from FlashSV1 and a `crossdomain.xml`, and writes
  `_manifest.tsv`.
- `check-coverage.mjs` builds the expected path set from templates and checks it against the pack(s),
  case-insensitively. It reads templates from `vendor/_dbexport` when that exists, otherwise from the XML snapshots in
  the repos (all listed in its output). Options: `--magic`, `--missing`, `--json`.
- `missing-core.txt` and `coverage.json` hold the current results.

## 4. Coverage

Templates used: 10,669 items (DDTank41 GameAdmin TemplateAlllist plus SkelletonX 4.1 TemplateAlllist), 213 maps,
494 NPCs, 1,622 balls, 175 pets, 76 server-pushed paths and 116 music ids.

| category | 3.0 alone | Gun_mobile alone | **merged** |
|---|---|---|---|
| boot (default avatar + characterdefine) | 97% | 94% | **100%** |
| map layers back/fore/dead | 97% | 49% | **98%** |
| equip show + icon (sex-specific) | 49% | 66% | **86%** |
| jewels | 51% | 91% | **95%** |
| wing | 29% | 70% | **76%** |
| weapon icon + show | 31% | 33% | **54%** |
| props / icons | 35% | 46% | **61%** |
| NPC living swf | 76% | 37% | **85%** |
| sound | 85% | 80% | **93%** |
| pets | 0% | 45% | **45%** |
| server-pushed PvE effects | 22% | 45% | **54%** |
| bomb craters | 30% | 48% | **58%** |
| **CORE total** | 45.1% | 57.4% | **76.9%** (9,150 / 11,905) |

These are lower bounds. The item list includes template rows the 4.1 DB may not use (the SkelletonX DB is BR/ES, not
VN). Rerun once `vendor/_dbexport` (the real Project_Game34 export) exists.

`case-only hits: 2,527`. The packs and the client disagree on case, for example the client asks for
`hair/default/1/b/show.png` while the pack has `.../1/B/...`, and `blastout` vs `blastOut`. **The resource server must
match case-insensitively** (as IIS does). Otherwise run `build-pack.mjs --lowercase` and lower-case the URL path in
the handler.

## 5. Version mismatches and risks

- **3.0 art + later CN-trad art + 4.1 client.** The folder layout and file names are the same across versions, which
  `PathManager` confirms. Per-file risks:
  - Newer maps reuse IDs with different pictures. The size check covers fore/dead layers; 10 layers had no
    size-matching candidate.
  - Character sheet frame layout. Both sources draw 4.1-era avatars correctly in their own clients, and the remake ran
    a 3.6 pack with the 4.1 client and avatars rendered.
  - Newer bomb/effect SWFs may use class names the 4.1 code doesn't expect, for example
    `tank.resource.bombs.Bomb{id}` / `BallManager.solve*MovieName`.
- Gun_mobile `equip/*/game.png` layers are mostly absent (only 9% "extra"). The in-battle avatar falls back to the 3.0
  pack where it can.
- Weapons: many `arm/{Pic}` folders have only `00.png` (no `1/icon.png` or `1/0/show.png`).
- Known remake symptom: dungeon "building" blank under 3.6 art. The paths it needs are in `missing-core.txt` under
  `server-load` and `map` (for example `image/map/1124/*`, `image/game/effect/*`).

## 6. Plan to fill the gaps

1. **Now:** point `SITE` at `merged/` behind a case-insensitive static route in `apps/api` (or a tiny Fastify
   static handler). This is what unblocks the Ruffle boot.
2. **No 404 storms:** add a placeholder fallback in the resource route. For a missing `*.png` return a 1×1 transparent
   PNG, and for a missing `*.swf` return an empty SWF stub. Do this in the route rather than on disk, so real files
   added later win automatically. Log misses to a file and feed them back into `missing-core.txt`.
3. **Second source pass:** get a real 3.6/4.x pack (RaGEZONE threads above; the remake author's 3.6 pack, so ask them).
   Add it as the **first** layer in `build-pack.mjs` and rerun `check-coverage.mjs`.
4. **Gun_mobile `Archive.2.zip` (1.4 GB):** contains `Flash/` and may hold more `image/` swfs (bombs, living). Inspect
   its listing with HTTP range requests before downloading it all.
5. **Items without art:** remap them in the DB/admin to an existing `Pic` (a per-category default), or hide them from
   the shop. `missing-core.txt` gives the exact list.
6. **Wayback:** not worth it (4 hits). Revisit only if new CDN hostnames show up in the DB (for example the
   `Server_List`/web config tables).
