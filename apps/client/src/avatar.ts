/**
 * task multi-char (round 2, coordinator ask): the character carousel used to open ONE `avatar.html` iframe
 * PER CARD (one WebGL context each, CSS-scaled the whole card including the canvas — the actual cause of
 * the "blurry when focused" bug, since the browser compositor was upscaling an already-rasterized bitmap).
 * This is now the single-page version: ONE `avatar.html` renders EVERY carousel slot (every real character
 * + the trailing "create" slot) on one PixiJS stage, each its own `ShowCharacter` (same class the room lobby
 * uses — `RoomCharacter` is built from it), positioned/scaled by the carousel through `postMessage` instead
 * of CSS. `apps/web/src/components/character/AvatarStage.tsx` mounts this ONCE (not per-card) and only ever
 * sends `{type:"ddt-avatar-layout", focus:<index>}` afterwards — which slot is centered. This page owns the
 * actual ellipse math (`layoutFor` below) and tweens every slot's container towards it; the carousel doesn't
 * need to know pixel positions, only "which index is focused now".
 *
 * Query params: `chars` (JSON array of `Entry` below, in carousel order — a real character or the trailing
 * "create" slot), `focus` (initial focused index), `api` (apps/api origin), `reducedMotion=1`.
 *
 * Posts `{type:"ddt-avatar-ready"}` to `window.parent` once the INITIALLY focused slot's character finished
 * loading (`ShowCharacter.completed`) or a 6s safety timeout — side characters keep loading in the
 * background (low alpha already hides any pop-in).
 */
import { $as, $class, $toXML } from "@ddt/flash/as3";
import { XML } from "@ddt/flash/as3";
import { MovieClip } from "@ddt/flash/display/MovieClip";
import { Sprite } from "@ddt/flash/display/Sprite";
import { Shape } from "@ddt/flash/display/Shape";
import { Point } from "@ddt/flash/geom/Point";
import { LoaderInfo } from "@ddt/flash/display/LoaderInfo";
import { Event } from "@ddt/flash/events/Event";
import { TextField } from "@ddt/flash/text/TextField";
import { TextFormat } from "@ddt/flash/text/TextFormat";
import { TextFieldAutoSize } from "@ddt/flash/text/TextFieldAutoSize";
import { startPlayer } from "@ddt/flash/player";
import { setResponseFilter, setUrlRewriter } from "@ddt/flash/net/http";
import { loadAssetIndex, registerVirtualSwf } from "@ddt/flash/swf/index-of-assets";
import { setAssetBase } from "@ddt/flash/swf/paths";
import { dlog } from "@ddt/flash/debug";
import "./game/all";
import { Dictionary } from "@ddt/flash/utils/Dictionary";
import { ConfigParaser } from "./game/ddt/data/ConfigParaser";
import { LanguageMgr } from "./game/ddt/manager/LanguageMgr";
import { ItemManager } from "./game/ddt/manager/ItemManager";
import { ItemTemplateInfo } from "./game/ddt/data/goods/ItemTemplateInfo";
import { PlayerInfo } from "./game/ddt/data/player/PlayerInfo";
import { CharactoryFactory } from "./game/ddt/view/character/CharactoryFactory";
import { ShowCharacter } from "./game/ddt/view/character/ShowCharacter";

type EquipRow = [templateId: number, categoryId: number, needSex: number, property1: number, level: number, pic: string, property8: number];

interface CharEntry {
  kind: "character";
  nickname: string;
  sex: string; // "1" | "0"
  grade: string;
  style: string;
  colors: string;
  skin: string;
  typeVip: string;
  vipLevel: string;
  consortiaName: string;
  dutyName: string;
  nimbus: string;
  equip: EquipRow[];
}
interface CreateEntry {
  kind: "create";
  label: string;
}
type Entry = CharEntry | CreateEntry;

/** `PlayerInfo.parseStyle`/`parseColos` index straight into the comma-split array up to position 17
 *  without checking length — see the round-1 note this replaces; still needed per-character here. */
function padFields(raw: string | undefined, min = 18): string {
  const s = raw && raw !== "undefined" && raw !== "null" ? raw : "";
  const fields = s.split(",");
  while (fields.length < min) fields.push("");
  return fields.join(",");
}

const q = new URLSearchParams(location.search);
const API = (q.get("api") ?? `${location.protocol}//${location.hostname}:8080`).replace(/\/$/, "");
const REDUCED_MOTION = q.get("reducedMotion") === "1";

let entries: Entry[] = [];
try {
  entries = JSON.parse(q.get("chars") ?? "[]");
} catch {
  entries = [];
}
let focusIndex = Math.min(Math.max(0, Number(q.get("focus") ?? 0)), Math.max(0, entries.length - 1));

// Canvas big enough for the focused character at ~2.3x its old on-screen size plus wing/aura headroom and
// an in-stage nameplate below, with room either side for 2 dimmed cards per direction on the ellipse.
const W = 1150;
const H = 740;
const FOCUS_SCALE = 1.5; // ShowCharacter.BIG_HEIGHT (342) * 1.5 = 513px tall focused — ~2.4x the old ~215px
const SIDE_SCALE_FACTOR = 0.6; // "side characters ~60%" of the focused one — applied PER STEP of distance
const STEP = (34 * Math.PI) / 180; // angle between neighboring carousel slots on the ellipse
const GROUND_FRAC = 0.74; // feet anchor, as a fraction of H, for the focused (offset 0) slot
const TWEEN_MS = 420;

const FONT = "'Lilita One', 'Rubik', sans-serif";
const COLOR = { plate: 0x0a0c14, ink: 0xf5f0e3, muted: 0x9aa2b8, sun: 0xffcb47, sunDeep: 0x3a2400 };

/** Old-school carousel: slots sit on an ellipse around the focused one — the further an offset, the more
 *  it "recedes" (shrinks, dims, rises slightly), like a turntable viewed near-on. Pure function of the
 *  (possibly negative/fractional) distance from the currently focused slot; called for every slot on every
 *  focus change, the result is the TWEEN TARGET (see `tweenTo` below), never applied instantly. */
function layoutFor(offset: number) {
  const angle = offset * STEP;
  const nx = Math.sin(angle);
  const absOffset = Math.min(Math.abs(offset), 2); // clamp: offset 2 is already as small/dim as it gets
  const hidden = Math.abs(offset) > 2.001;
  return {
    xFrac: 0.5 + nx * 0.4,
    yFrac: GROUND_FRAC - absOffset * 0.045, // recedes slightly "into" the stage, like a turntable
    scale: FOCUS_SCALE * Math.pow(SIDE_SCALE_FACTOR, absOffset), // offset 1 = 60%, offset 2 = 36%
    alpha: hidden ? 0 : Math.max(0.22, 1 - absOffset * 0.42), // offset 1 = 58%, offset 2 = 22% (clamped)
  };
}

/**
 * Builds the SAME kind of dictionary (`TemplateID -> ItemTemplateInfo`) the full client's throttled
 * ~5.7s `ItemTempleteAnalyzer` load would (see git history for the long version of this note) — but merged
 * from every carousel slot's own equipped items at once (template ids are global, so a second character
 * wearing the same item just overwrites the same map entry with identical data). Everything else on
 * `ItemTemplateInfo` stays at its default; a safe empty template is returned for any miss (default
 * wing/suit/chatBall ids `PlayerInfo.parseStyle` looks up regardless of what's actually equipped).
 */
function buildItemManager(allEntries: Entry[]): void {
  const map = new Map<number, ItemTemplateInfo>();
  for (const e of allEntries) {
    if (e.kind !== "character") continue;
    for (const [templateId, categoryId, needSex, property1, level, pic, property8] of e.equip) {
      const info = new ItemTemplateInfo();
      info.TemplateID = templateId;
      info.CategoryID = categoryId;
      info.NeedSex = needSex;
      info.Property1 = String(property1);
      info.Property8 = String(property8 ?? "");
      info.Level = level;
      info.Pic = pic ?? "";
      map.set(templateId, info);
    }
  }
  const empty = new ItemTemplateInfo();
  empty.TemplateID = 0;
  empty.CategoryID = 0;
  empty.Pic = "";
  empty.Property1 = "0";
  empty.Property8 = "";
  empty.Level = 1;
  empty.NeedSex = 0;
  const list = { get: (id: number) => map.get(id) ?? empty };
  ItemManager.Instance.setupGoodsTemplates({ list } as unknown as Parameters<typeof ItemManager.prototype.setupGoodsTemplates>[0]);
}

function postReady(): void {
  try {
    window.parent.postMessage({ type: "ddt-avatar-ready" }, "*");
  } catch {
    /* no parent (opened directly for debugging) */
  }
}

/** A single text line, pre-measured via `autoSize` before being handed back (so the caller can center it). */
function makeLine(text: string, size: number, color: number, bold: boolean): TextField {
  const tf = new TextField();
  tf.defaultTextFormat = new TextFormat(FONT, size, color, bold);
  tf.autoSize = TextFieldAutoSize.CENTER;
  tf.selectable = false;
  tf.mouseEnabled = false;
  tf.text = text;
  return tf;
}

/** In-stage nameplate (coordinator ask: "render the plate inside the same Pixi stage, not a CSS box") —
 *  same engine/classes `ShowCharacter` itself draws with (`Shape`/`TextField`), not a DOM element. Built
 *  once per slot and placed as a child of that slot's own container, so it moves/scales/dims together with
 *  the character on every focus change. */
function buildNameplate(data: { nickname: string; level: number; title: string | null; guild: string | null; vipLevel: number }): Sprite {
  const plate = new Sprite();
  const lines: TextField[] = [];
  let vipLine: TextField | null = null;
  if (data.vipLevel > 0) {
    vipLine = makeLine(`★ VIP ${data.vipLevel}`, 13, COLOR.sunDeep, true);
    lines.push(vipLine);
  }
  const nick = makeLine(data.nickname, 21, COLOR.ink, true);
  lines.push(nick);
  const meta = makeLine(`Nv. ${data.level}` + (data.title ? ` · ${data.title}` : ""), 13, COLOR.muted, false);
  lines.push(meta);
  let guildLine: TextField | null = null;
  if (data.guild) {
    guildLine = makeLine(data.guild, 12, COLOR.muted, false);
    lines.push(guildLine);
  }

  const padX = 18;
  const padY = 8;
  const gap = 3;
  const contentW = Math.max(...lines.map((l) => l.width), 60);
  let contentH = padY * 2;
  for (const l of lines) contentH += l.height + gap;
  contentH -= gap;

  const bg = new Shape();
  bg.graphics.beginFill(COLOR.plate, 0.74);
  bg.graphics.lineStyle(1, 0x30364a, 0.8);
  bg.graphics.drawRoundRect(-contentW / 2 - padX, 0, contentW + padX * 2, contentH, 16);
  bg.graphics.endFill();
  plate.addChild(bg);

  if (vipLine) {
    const badge = new Shape();
    badge.graphics.beginFill(COLOR.sun, 0.92);
    badge.graphics.drawRoundRect(-vipLine.width / 2 - 8, padY - 3, vipLine.width + 16, vipLine.height + 2, 10);
    badge.graphics.endFill();
    plate.addChild(badge);
  }

  let y = padY;
  for (const l of lines) {
    l.x = -l.width / 2;
    l.y = y;
    y += l.height + gap;
    plate.addChild(l);
  }
  return plate;
}

/** The trailing "create a new character" slot — a plain silhouette with a "+", not a real `ShowCharacter`
 *  (there's no character yet). Drawn with the same engine classes so it lives on the same single canvas. */
function buildCreateSlot(label: string): Sprite {
  const container = new Sprite();
  const cy = -ShowCharacter.BIG_HEIGHT / 2;
  const ring = new Shape();
  ring.graphics.lineStyle(3, 0x8a92a8, 0.55);
  ring.graphics.beginFill(0xffffff, 0.05);
  ring.graphics.drawCircle(0, cy, 88);
  ring.graphics.endFill();
  container.addChild(ring);
  const plus = makeLine("+", 64, 0xc7cde0, true);
  plus.x = -plus.width / 2;
  plus.y = cy - plus.height / 2;
  container.addChild(plus);
  const labelTf = makeLine(label, 15, COLOR.ink, true);
  labelTf.x = -labelTf.width / 2;
  labelTf.y = cy + 100;
  container.addChild(labelTf);
  return container;
}

interface Slot {
  container: Sprite;
  character: ShowCharacter | null;
  current: { xFrac: number; yFrac: number; scale: number; alpha: number };
  target: { xFrac: number; yFrac: number; scale: number; alpha: number };
}

const slots: Slot[] = [];

function applySlot(s: Slot): void {
  s.container.x = s.current.xFrac * W;
  s.container.y = s.current.yFrac * H;
  s.container.scaleX = s.current.scale;
  s.container.scaleY = s.current.scale;
  s.container.alpha = s.current.alpha;
}

function retarget(focus: number): void {
  focusIndex = focus;
  for (let i = 0; i < slots.length; i++) {
    const t = layoutFor(i - focus);
    slots[i]!.target = t;
    if (REDUCED_MOTION) {
      slots[i]!.current = t;
      applySlot(slots[i]!);
    }
  }
  // Front-to-back draw order: focused in front, further offsets behind it — the stage's own addChild
  // order, no real Z axis.
  const stage = currentStageRef;
  if (stage) {
    const order = slots.map((_, i) => i).sort((a, b) => Math.abs(b - focus) - Math.abs(a - focus));
    order.forEach((slotIndex, z) => stage.setChildIndex(slots[slotIndex]!.container, z));
  }
}

let currentStageRef: import("@ddt/flash/display/Stage").Stage | null = null;
let tweenRunning = false;
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}
/**
 * Drives the tween off the STAGE's own `ENTER_FRAME` (the engine's 25fps logic tick — `frame-loop.ts`),
 * not a free-running `requestAnimationFrame` loop. `packages/flash/src/player.ts`'s render loop snapshots
 * every DisplayObject's transform once per logic tick and smoothly BLENDS toward the next one for 60fps
 * rendering (`snapshot`/`applyInterp` in `packages/flash/src/interp.ts`) — moving `container.x/y/scaleX/
 * alpha` from an independent, more-frequent rAF loop fights that system (it keeps re-snapshotting a moving
 * target) and was rendering duplicate/smeared nameplate text mid-tween. One update per ENTER_FRAME lets the
 * built-in interpolation do the actual 60fps smoothing, same as everything else in the game.
 */
function startTweenLoop(): void {
  if (tweenRunning || REDUCED_MOTION || !currentStageRef) return;
  tweenRunning = true;
  const stage = currentStageRef;
  const start = performance.now();
  const from = slots.map((s) => ({ ...s.current }));
  const tick = () => {
    const t = Math.min(1, (performance.now() - start) / TWEEN_MS);
    const e = easeOutCubic(t);
    for (let i = 0; i < slots.length; i++) {
      const s = slots[i]!;
      const f = from[i]!;
      s.current = {
        xFrac: f.xFrac + (s.target.xFrac - f.xFrac) * e,
        yFrac: f.yFrac + (s.target.yFrac - f.yFrac) * e,
        scale: f.scale + (s.target.scale - f.scale) * e,
        alpha: f.alpha + (s.target.alpha - f.alpha) * e,
      };
      applySlot(s);
    }
    if (t >= 1) {
      stage.removeEventListener(Event.ENTER_FRAME, tick);
      tweenRunning = false;
    }
  };
  stage.addEventListener(Event.ENTER_FRAME, tick);
}

window.addEventListener("message", (e: MessageEvent) => {
  const data = e.data as { type?: string; focus?: number } | null;
  if (data?.type !== "ddt-avatar-layout" || typeof data.focus !== "number") return;
  retarget(data.focus);
  startTweenLoop();
});

async function boot(): Promise<void> {
  const container = document.getElementById("avatar")!;
  const user = "preview";

  setAssetBase(`${import.meta.env.BASE_URL}assets/`);
  registerVirtualSwf("flash/2");
  setUrlRewriter((url) => (/^[a-z]+:\/\//i.test(url) ? url : `${API}/flash/${url.replace(/^\/+/, "")}`));
  setResponseFilter((url, bytes) => (/\/md5\.xml/i.test(url) ? new TextEncoder().encode("<Result/>") : bytes));

  const [stage, , configXml] = await Promise.all([
    startPlayer({ container, width: W, height: H, frameRate: 25, backgroundAlpha: 0 }),
    loadAssetIndex(),
    fetch(`${API}/flash/config.xml`).then((r) => r.text()),
  ]);
  currentStageRef = stage;

  const info = new LoaderInfo(null);
  info.$url = `${API}/flash/Loading.swf`;
  info.$loaderURL = info.$url;
  info.$parameters = { user, key: "", config: `${API}/flash/config.xml`, rid: "", site: "", enterCode: "" };
  stage.$loaderInfo = info;

  ConfigParaser.paras($toXML(new XML(configXml).child("config")), stage.$loaderInfo, user);
  LanguageMgr._dic ??= new Dictionary();
  buildItemManager(entries);

  class FigureBgAssetStub extends MovieClip {}
  $class(FigureBgAssetStub, "asset.core.character.FigureBgAsset");

  let initialCharacter: ShowCharacter | null = null;
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]!;
    const slotContainer = new Sprite();

    if (entry.kind === "create") {
      slotContainer.addChild(buildCreateSlot(entry.label));
      stage.addChild(slotContainer);
      slots.push({ container: slotContainer, character: null, current: { xFrac: 0.5, yFrac: GROUND_FRAC, scale: 0, alpha: 0 }, target: { xFrac: 0.5, yFrac: GROUND_FRAC, scale: 0, alpha: 0 } });
      continue;
    }

    const info2 = new PlayerInfo();
    const character = $as(CharactoryFactory.createCharacter(info2, CharactoryFactory.SHOW), ShowCharacter);
    character.x = -ShowCharacter.BIG_WIDTH / 2;
    character.y = -ShowCharacter.BIG_HEIGHT;
    character.setShowLight(true, new Point(ShowCharacter.BIG_WIDTH / 2, 70));
    slotContainer.addChild(character);

    const nameplate = buildNameplate({
      nickname: entry.nickname,
      level: Number(entry.grade || 1),
      title: entry.dutyName || null,
      guild: entry.consortiaName || null,
      vipLevel: Number(entry.vipLevel || 0),
    });
    nameplate.y = 14;
    slotContainer.addChild(nameplate);

    stage.addChild(slotContainer);
    slots.push({ container: slotContainer, character, current: { xFrac: 0.5, yFrac: GROUND_FRAC, scale: 0, alpha: 0 }, target: { xFrac: 0.5, yFrac: GROUND_FRAC, scale: 0, alpha: 0 } });

    if (REDUCED_MOTION) character.stopAnimation();

    info2.beginChanges();
    info2.ID = i + 1;
    info2.NickName = entry.nickname;
    info2.Sex = entry.sex === "1";
    info2.typeVIP = Number(entry.typeVip || 0);
    info2.VIPLevel = Number(entry.vipLevel || 0);
    info2.ConsortiaName = entry.consortiaName || "";
    info2.DutyName = entry.dutyName || "";
    info2.Grade = Number(entry.grade || 1);
    info2.Nimbus = Number(entry.nimbus || 0);
    info2.Skin = entry.skin && entry.skin !== "undefined" ? entry.skin : "";
    const styleField = padFields(entry.style);
    info2.Colors = padFields(entry.colors);
    info2.Style = styleField;
    const weaponId = Number(styleField.split(",")[6]?.split("|")[0] ?? 0);
    if (Number.isFinite(weaponId)) info2.WeaponID = weaponId;
    info2.commitChanges();

    if (i === focusIndex) initialCharacter = character;
  }

  retarget(focusIndex);
  // First placement: snap straight to target (no 420ms tween from the all-stacked-at-zero starting point).
  for (const s of slots) {
    s.current = s.target;
    applySlot(s);
  }

  dlog("info", `avatar: ${entries.length} slot(s), focus=${focusIndex}`);

  const start = Date.now();
  const waitLoaded = () =>
    new Promise<void>((resolve) => {
      const tick = () => {
        if (!initialCharacter || initialCharacter.completed || Date.now() - start > 6000) resolve();
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
