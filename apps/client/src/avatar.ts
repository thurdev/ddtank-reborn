/**
 * task multi-char: lightweight second entry point of the PixiJS client — renders ONE character the way
 * `ShowCharacter` renders it in the bag/equip "preview" screens (same class the room lobby's crowd uses,
 * `RoomCharacter`, is built from), WITHOUT the socket/login/hall (no `Loading`/`DDT` class, no
 * `StartupResourceLoader` full queue, no `setSocketResolver`). Embedded by `apps/web`'s character carousel
 * (`CharacterCarousel.tsx`) as `<iframe src="${pixiClientUrl}avatar.html?...">`.
 *
 * Query params (built from the same shape `GET /api/me/characters` returns — see
 * apps/api/src/routes/auth.ts `characterCard`): `nickname`, `sex` ("1"/"0"), `grade`, `style`, `colors`,
 * `skin`, `typeVip`, `vipLevel`, `consortiaName`, `dutyName` (shown as "title"), `nimbus`. Optional `api`
 * (origin of apps/api; required when this page is served from a different origin than the API — the full
 * client's `main.ts` has the same `?api=` convention). `reducedMotion=1` stops the idle MovieClip
 * animations (wing flap / strengthen aura) for `prefers-reduced-motion`.
 *
 * Posts `{ type: "ddt-avatar-ready" }` to `window.parent` once the character's own asset loading finished
 * (`ShowCharacter.completed`) or after an 8s safety timeout (a single missing/placeholder equip icon must
 * never hang the carousel forever — `BaseCharacterLoader`/`ShowCharacterLoader` already tolerate individual
 * load failures the same way the full client does).
 */
import { $as, $class, $toXML } from "@ddt/flash/as3";
import { XML } from "@ddt/flash/as3";
import { MovieClip } from "@ddt/flash/display/MovieClip";
import { Event } from "@ddt/flash/events/Event";
import { LoaderInfo } from "@ddt/flash/display/LoaderInfo";
import { startPlayer } from "@ddt/flash/player";
import { setResponseFilter, setUrlRewriter } from "@ddt/flash/net/http";
import { loadAssetIndex, registerVirtualSwf } from "@ddt/flash/swf/index-of-assets";
import { setAssetBase } from "@ddt/flash/swf/paths";
import { dlog } from "@ddt/flash/debug";
import "./game/all";
import { Dictionary } from "@ddt/flash/utils/Dictionary";
import { ConfigParaser } from "./game/ddt/data/ConfigParaser";
import { LanguageMgr } from "./game/ddt/manager/LanguageMgr";
import { PlayerInfo } from "./game/ddt/data/player/PlayerInfo";
import { CharactoryFactory } from "./game/ddt/view/character/CharactoryFactory";
import { ShowCharacter } from "./game/ddt/view/character/ShowCharacter";
import { StartupResourceLoader } from "./game/ddt/loader/StartupResourceLoader";
import { QueueLoader } from "./game/com/pickgliss/loader/QueueLoader";

const q = new URLSearchParams(location.search);
const API = (q.get("api") ?? `${location.protocol}//${location.hostname}:8080`).replace(/\/$/, "");
// ShowCharacter.BIG_WIDTH/BIG_HEIGHT (250x342) is just the body's own bounding box — wings, strengthen
// aura rings and the floor effect (Nimbus) overflow well above and to the sides of it, so the canvas needs
// real padding on every edge, not just enough room for the body itself.
const W = 320;
const H = 440;

/** Runs `StartupResourceLoader`'s item/category loaders (the only two pieces of reference data
 *  `BaseCharacterLoader`/`ShowCharacterLoader` read via `ItemManager.Instance.getTemplateById` while
 *  building each equip layer — without them `ItemManager`'s template dictionary is empty and
 *  `PlayerInfo.getSuitsType()` throws) without the other ~40 loaders the full queue runs (quests, pets,
 *  farm, VIP settings, ...) that this preview never touches. */
function loadItemTemplates(): Promise<void> {
  return new Promise((resolve) => {
    const queue = new QueueLoader();
    queue.addEventListener(Event.COMPLETE, () => resolve());
    queue.addLoader(StartupResourceLoader.Instance.creatItemTempleteLoader());
    queue.addLoader(StartupResourceLoader.Instance.creatGoodCategoryLoader());
    queue.start();
  });
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
  const stage = await startPlayer({ container, width: W, height: H, frameRate: 25, backgroundAlpha: 0 });

  const user = q.get("nickname") || "preview";
  const info = new LoaderInfo(null);
  info.$url = `${API}/flash/Loading.swf`;
  info.$loaderURL = info.$url;
  info.$parameters = { user, key: "", config: `${API}/flash/config.xml`, rid: "", site: "", enterCode: "" };
  stage.$loaderInfo = info;

  setAssetBase(`${import.meta.env.BASE_URL}assets/`);
  await loadAssetIndex();
  registerVirtualSwf("flash/2");
  setUrlRewriter((url) => (/^[a-z]+:\/\//i.test(url) ? url : `${API}/flash/${url.replace(/^\/+/, "")}`));
  setResponseFilter((url, bytes) => (/\/md5\.xml/i.test(url) ? new TextEncoder().encode("<Result/>") : bytes));

  // Same `ConfigParaser.paras(xml, loaderInfo, user)` the real `DDT.lunch()` calls after reading
  // config.xml — sets up `PathManager` (SITE/REQUEST_PATH/FLASHSITE), which every equip/show asset path
  // below is resolved against (`PathManager.solveGoodsPath`/`solveRequestPath`).
  // config.xml is `<root><config>...</config></root>` — ConfigParaser.paras expects the <config> node
  // itself (same as the real client's config loader hands it), not the <root> wrapper.
  const configXml = await (await fetch(`${API}/flash/config.xml`)).text();
  ConfigParaser.paras($toXML(new XML(configXml).child("config")), stage.$loaderInfo, user);
  // LanguageMgr normally loads a full translation XML via StartupResourceLoader's own queue
  // (creatLanguageLoader, skipped here — this preview never shows any UI text/error message); an empty
  // dictionary is enough so `LanguageMgr.GetTranslation` (called unconditionally by every `BaseLoader` to
  // build its `loadErrorMessage`, not just on an actual error) doesn't throw on a null dictionary.
  LanguageMgr._dic ??= new Dictionary();

  await loadItemTemplates();

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
  info2.Skin = q.get("skin") ?? "";
  info2.Colors = q.get("colors") || ",,,,,,,,";
  info2.Style = q.get("style") || ",,,,,,,,";
  info2.commitChanges();

  dlog("info", `avatar: nickname=${info2.NickName || "(vazio)"} style=${info2.Style}`);

  const start = Date.now();
  const waitLoaded = () =>
    new Promise<void>((resolve) => {
      const tick = () => {
        if (character.completed || Date.now() - start > 8000) resolve();
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
