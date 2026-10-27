/**
 * task multi-char: lightweight second entry point of the PixiJS client — renders ONE character the way
 * `ShowCharacter` renders it in the bag/equip "preview" screens (same class the room lobby's crowd uses,
 * `RoomCharacter`, is built from), WITHOUT the socket/login/hall (no `Loading`/`DDT` class, no
 * `StartupResourceLoader` full queue, no `setSocketResolver`). Embedded by `apps/web`'s character carousel
 * (`CharacterCarousel.tsx`) as `<iframe src="${pixiClientUrl}avatar.html?...">`.
 *
 * Query params (built from the same shape `GET /api/me/characters` returns — see
 * apps/api/src/routes/auth.ts `characterCard`): `nickname`, `sex` ("1"/"0"), `grade`, `style`, `colors`,
 * `skin`, `typeVip`, `vipLevel`, `consortiaName`, `dutyName` (shown as "title"), `nimbus`, `weaponId`,
 * `equip` (JSON array of `[templateId,categoryId,needSex,property1,level]` tuples — see
 * `buildItemManager` below for why). Optional `api` (origin of apps/api; required when this page is served
 * from a different origin than the API — the full client's `main.ts` has the same `?api=` convention).
 * `reducedMotion=1` stops the idle MovieClip animations (wing flap / strengthen aura) for
 * `prefers-reduced-motion`.
 *
 * Posts `{ type: "ddt-avatar-ready" }` to `window.parent` once the character's own asset loading finished
 * (`ShowCharacter.completed`) or after a safety timeout (a single missing/placeholder equip icon must
 * never hang the carousel forever — `BaseCharacterLoader`/`ShowCharacterLoader` already tolerate individual
 * load failures the same way the full client does).
 */
import { $as, $class, $toXML } from "@ddt/flash/as3";
import { XML } from "@ddt/flash/as3";
import { MovieClip } from "@ddt/flash/display/MovieClip";
import { Point } from "@ddt/flash/geom/Point";
import { LoaderInfo } from "@ddt/flash/display/LoaderInfo";
import { startPlayer } from "@ddt/flash/player";
import { setResponseFilter, setUrlRewriter } from "@ddt/flash/net/http";
import { loadAssetIndex, registerVirtualSwf } from "@ddt/flash/swf/index-of-assets";
import { setAssetBase } from "@ddt/flash/swf/paths";
import { dlog } from "@ddt/flash/debug";
import "./game/all";
import { Dictionary } from "@ddt/flash/utils/Dictionary";
import { DictionaryData } from "./game/road7th/data/DictionaryData";
import { ConfigParaser } from "./game/ddt/data/ConfigParaser";
import { LanguageMgr } from "./game/ddt/manager/LanguageMgr";
import { ItemManager } from "./game/ddt/manager/ItemManager";
import { ItemTemplateInfo } from "./game/ddt/data/goods/ItemTemplateInfo";
import { PlayerInfo } from "./game/ddt/data/player/PlayerInfo";
import { CharactoryFactory } from "./game/ddt/view/character/CharactoryFactory";
import { ShowCharacter } from "./game/ddt/view/character/ShowCharacter";

/** `PlayerInfo.parseStyle`/`parseColos` (apps/client/src/game/ddt/data/player/PlayerInfo.ts) index straight
 *  into the comma-split array up to position 17 (`EquipType.CategeryIdToPlace(EquipType.BADGE)` → `[17]`)
 *  without ever checking the array is that long — a short/missing value throws instead of just rendering
 *  an empty slot. Query params are free text from the URL (and ultimately a network response), so this
 *  guards the same way the original game's own data always happens to be long enough for. */
function padFields(raw: string | null, min = 18): string {
  const s = raw && raw !== "undefined" && raw !== "null" ? raw : "";
  const fields = s.split(",");
  while (fields.length < min) fields.push("");
  return fields.join(",");
}

const q = new URLSearchParams(location.search);
const API = (q.get("api") ?? `${location.protocol}//${location.hostname}:8080`).replace(/\/$/, "");
// ShowCharacter.BIG_WIDTH/BIG_HEIGHT (250x342) is just the body's own bounding box — wings, strengthen
// aura rings and the floor effect (Nimbus) overflow well above and to the sides of it, so the canvas needs
// real padding on every edge, not just enough room for the body itself.
const W = 320;
const H = 440;

/**
 * `ItemManager.Instance.getTemplateById` is consulted by `BaseCharacterLoader`/`ShowCharacterLoader` for
 * every equipped slot while building each layer, and by `PlayerInfo.getSuitsType`/`getHairType`. The full
 * client populates it via `StartupResourceLoader.creatItemTempleteLoader()`
 * (`TemplateAllList.xml`, ~7650 items) — fetched AND parsed through `ItemTempleteAnalyzer`, which
 * deliberately throttles itself to 40 items per 30ms `Timer` tick (so the original Flash player's frame
 * rate doesn't drop while the rest of the game's startup runs in the background). That throttle alone is
 * ~5.7s of dead time for a page that only ever needs the handful of items ONE character has equipped.
 *
 * Builds the SAME kind of dictionary (`DictionaryData` of `TemplateID -> ItemTemplateInfo`) directly from
 * the `equip` query param instead — `apps/api/src/routes/auth.ts` `equippedIcons` already returns
 * `templateId`/`categoryId`/`needSex`/`property1`/`level` per equipped item for exactly this. Only the
 * fields the character-rendering path actually reads (confirmed by reading `ShowLayer`/`BaseWingLayer`/
 * `PlayerInfo`) are filled in; everything else on `ItemTemplateInfo` stays at its default.
 */
function buildItemManager(equipJson: string | null): void {
  const dict = new DictionaryData();
  let rows: [number, number, number, number, number][] = [];
  try {
    rows = equipJson ? JSON.parse(equipJson) : [];
  } catch {
    rows = [];
  }
  for (const [templateId, categoryId, needSex, property1, level] of rows) {
    const info = new ItemTemplateInfo();
    info.TemplateID = templateId;
    info.CategoryID = categoryId;
    info.NeedSex = needSex;
    info.Property1 = String(property1);
    info.Level = level;
    dict.add(templateId, info);
  }
  // Duck-typed: ItemManager.setupGoodsTemplates only ever reads `param1.list` (see its real signature,
  // `(param1: ItemTempleteAnalyzer)`) — a real analyzer instance isn't needed, just that one property.
  ItemManager.Instance.setupGoodsTemplates({ list: dict } as unknown as Parameters<typeof ItemManager.prototype.setupGoodsTemplates>[0]);
}

function postReady(): void {
  try {
    window.parent.postMessage({ type: "ddt-avatar-ready" }, "*");
  } catch {
    /* no parent (opened directly for debugging) */
  }
}

async function boot(): Promise<void> {
  const container = document.getElementById("avatar")!;
  const user = q.get("nickname") || "preview";

  setAssetBase(`${import.meta.env.BASE_URL}assets/`);
  registerVirtualSwf("flash/2");
  setUrlRewriter((url) => (/^[a-z]+:\/\//i.test(url) ? url : `${API}/flash/${url.replace(/^\/+/, "")}`));
  setResponseFilter((url, bytes) => (/\/md5\.xml/i.test(url) ? new TextEncoder().encode("<Result/>") : bytes));

  // The 3 independent network/init steps (PixiJS stage, asset index, config.xml) run concurrently instead
  // of one after another — none of them depends on another's result.
  const [stage, , configXml] = await Promise.all([
    startPlayer({ container, width: W, height: H, frameRate: 25, backgroundAlpha: 0 }),
    loadAssetIndex(),
    fetch(`${API}/flash/config.xml`).then((r) => r.text()),
  ]);

  const info = new LoaderInfo(null);
  info.$url = `${API}/flash/Loading.swf`;
  info.$loaderURL = info.$url;
  info.$parameters = { user, key: "", config: `${API}/flash/config.xml`, rid: "", site: "", enterCode: "" };
  stage.$loaderInfo = info;

  // Same `ConfigParaser.paras(xml, loaderInfo, user)` the real `DDT.lunch()` calls after reading
  // config.xml — sets up `PathManager` (SITE/REQUEST_PATH/FLASHSITE), which every equip/show asset path
  // below is resolved against (`PathManager.solveGoodsPath`/`solveRequestPath`). config.xml is
  // `<root><config>...</config></root>` — ConfigParaser.paras expects the <config> node itself (same as
  // the real client's config loader hands it), not the <root> wrapper.
  ConfigParaser.paras($toXML(new XML(configXml).child("config")), stage.$loaderInfo, user);
  // LanguageMgr normally loads a full translation XML via StartupResourceLoader's own queue (skipped here
  // — this preview never shows any UI text/error message); an empty dictionary is enough so
  // `LanguageMgr.GetTranslation` (called unconditionally by every `BaseLoader` to build its
  // `loadErrorMessage`, not just on an actual error) doesn't throw on a null dictionary.
  LanguageMgr._dic ??= new Dictionary();
  buildItemManager(q.get("equip"));

  // `ShowCharacter`'s constructor creates a "loading" background placeholder from the core UI SWF pack
  // (`ComponentFactory.Instance.creat("asset.core.character.FigureBgAsset")`, `ui/vietnam/swf/core/`) —
  // real screens get that pack through the full `DDT.setup()`/`UIModuleLoader` chain (dozens of unrelated
  // UI modules: hall, chat, toolbar, quests...), which this lightweight preview intentionally skips. The
  // placeholder itself is purely cosmetic (hidden the instant the real equip layers finish loading, see
  // `BaseCharacter.show`), so a harmless empty stub registered under that linkage name is enough.
  class FigureBgAssetStub extends MovieClip {}
  $class(FigureBgAssetStub, "asset.core.character.FigureBgAsset");

  // Create the character BEFORE setting its info's properties: BaseCharacter's constructor subscribes to
  // PlayerPropertyEvent.PROPERTY_CHANGE, which is what actually kicks off asset loading once Style/Colors
  // go from "nothing yet" to the real values (same path a room packet's `beginChanges()`/`commitChanges()`
  // pair drives in `apps/client/src/game/room/RoomManager.ts` for every OTHER player's character).
  const info2 = new PlayerInfo();
  const character = $as(CharactoryFactory.createCharacter(info2, CharactoryFactory.SHOW), ShowCharacter);
  character.x = (W - ShowCharacter.BIG_WIDTH) / 2;
  character.y = H - ShowCharacter.BIG_HEIGHT - 40; // headroom for wings/aura rings above the body itself
  // `callBack01`/`callBack02` (ShowCharacter.ts) place the strengthen/gilded aura rings at a FIXED
  // "_lightPos + (47,65)" / "_lightPos + (45,126)" offset from the character's own (0,0) — calibrated by
  // the original game for however its caller's `setShowLight` positions it, never just the bare (0,0)
  // default (every real screen that shows the light explicitly repositions it for its own layout). Nudges
  // it to sit roughly centered behind this 250×342 body instead of hugging its top-left corner.
  character.setShowLight(true, new Point(50, 70));
  stage.addChild(character);

  if (q.get("reducedMotion") === "1") character.stopAnimation();

  info2.beginChanges();
  info2.ID = Number(q.get("id") ?? 1);
  info2.NickName = q.get("nickname") ?? "";
  info2.Sex = q.get("sex") === "1";
  info2.typeVIP = Number(q.get("typeVip") ?? 0);
  info2.VIPLevel = Number(q.get("vipLevel") ?? 0);
  info2.ConsortiaName = q.get("consortiaName") ?? "";
  info2.DutyName = q.get("dutyName") ?? "";
  info2.Grade = Number(q.get("grade") ?? 1);
  info2.Nimbus = Number(q.get("nimbus") ?? 0);
  info2.Skin = q.get("skin") && q.get("skin") !== "undefined" ? q.get("skin")! : "";
  info2.Colors = padFields(q.get("colors"));
  info2.Style = padFields(q.get("style"));
  // `ShowCharacterLoader.drawCharacter` only composites the weapon layer into the final bitmap when
  // `info.WeaponID` is a real id (`!= 0 && != -1`) — Style[6] ("<id>|<pic>", the ARM/weapon slot, see
  // `apps/game/src/game/stats.ts` `styleFromEquip`'s header) carries the id but nothing ever copied it
  // into `WeaponID` for this preview, so the weapon layer was built and then silently dropped.
  const weaponId = Number(info2.Style.split(",")[6]?.split("|")[0] ?? 0);
  if (Number.isFinite(weaponId)) info2.WeaponID = weaponId;
  info2.commitChanges();

  dlog("info", `avatar: nickname=${info2.NickName || "(vazio)"} style=${info2.Style}`);

  const start = Date.now();
  const waitLoaded = () =>
    new Promise<void>((resolve) => {
      const tick = () => {
        if (character.completed || Date.now() - start > 6000) resolve();
        else requestAnimationFrame(tick);
      };
      tick();
    });
  await waitLoaded();
  postReady();
}

boot().catch((e) => {
  console.error(e);
  postReady(); // never leave the carousel waiting forever on a hard boot failure
  document.body.insertAdjacentHTML("beforeend", `<pre style="color:#f66;position:fixed;left:4px;bottom:4px;font-size:10px;z-index:99">${String((e as Error)?.stack ?? e)}</pre>`);
});
