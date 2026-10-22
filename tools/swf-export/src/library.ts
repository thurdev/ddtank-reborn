/**
 * Converte o XML do FFDec (`-swf2xml`) de um SWF em `library.json`
 * (formato em packages/flash/src/swf/library-types.ts).
 *
 * Só lê a estrutura (timelines, posições, filtros, textos, classes); as
 * imagens saem do `-export shape,image,...` do FFDec (ver main.ts).
 */
import type { CharT, CXForm, EditTextT, FilterT, LibraryT, Mat, Op, RectT, TimelineT } from "../../../packages/flash/src/swf/library-types.ts";
import { parseXml, type XNode } from "../../../packages/flash/src/xml.ts";

const attr = (n: XNode, name: string): string | undefined => n.attrs.find((a) => a.name === name)?.value;
const num = (n: XNode, name: string, def = 0): number => {
  const v = attr(n, name);
  return v === undefined ? def : Number(v);
};
const bool = (n: XNode, name: string): boolean => attr(n, name) === "true";
const kids = (n: XNode): XNode[] => n.children.filter((c) => c.kind === "element");
const child = (n: XNode, name: string): XNode | undefined => kids(n).find((c) => c.name === name);
const items = (n: XNode | undefined): XNode[] => (n ? kids(n).filter((c) => c.name === "item") : []);
const type = (n: XNode): string => attr(n, "type") ?? "";

function rect(n: XNode | undefined): RectT {
  if (!n) return [0, 0, 0, 0];
  const x0 = num(n, "Xmin") / 20, y0 = num(n, "Ymin") / 20;
  return [x0, y0, num(n, "Xmax") / 20 - x0, num(n, "Ymax") / 20 - y0];
}

function matrix(n: XNode | undefined): Mat | undefined {
  if (!n) return undefined;
  const hasScale = bool(n, "hasScale"), hasRot = bool(n, "hasRotate");
  return [
    hasScale ? num(n, "scaleX", 1) : 1,
    hasRot ? num(n, "rotateSkew0") : 0,
    hasRot ? num(n, "rotateSkew1") : 0,
    hasScale ? num(n, "scaleY", 1) : 1,
    num(n, "translateX") / 20,
    num(n, "translateY") / 20,
  ];
}

function cxform(n: XNode | undefined): CXForm | undefined {
  if (!n) return undefined;
  const mul = bool(n, "hasMultTerms"), add = bool(n, "hasAddTerms");
  return [
    mul ? num(n, "redMultTerm", 256) / 256 : 1,
    mul ? num(n, "greenMultTerm", 256) / 256 : 1,
    mul ? num(n, "blueMultTerm", 256) / 256 : 1,
    mul ? num(n, "alphaMultTerm", 256) / 256 : 1,
    add ? num(n, "redAddTerm") : 0,
    add ? num(n, "greenAddTerm") : 0,
    add ? num(n, "blueAddTerm") : 0,
    add ? num(n, "alphaAddTerm") : 0,
  ];
}

function rgba(n: XNode | undefined): [number, number] {
  if (!n) return [0, 1];
  return [(num(n, "red") << 16) | (num(n, "green") << 8) | num(n, "blue"), num(n, "alpha", 255) / 255];
}

function filters(list: XNode | undefined): FilterT[] | undefined {
  if (!list) return undefined;
  const out: FilterT[] = [];
  for (const f of items(list)) {
    switch (type(f)) {
      case "GLOWFILTER": {
        const [color, alpha] = rgba(child(f, "glowColor"));
        out.push({ t: "glow", color, alpha, bx: num(f, "blurX"), by: num(f, "blurY"), s: num(f, "strength"), inner: bool(f, "innerGlow") || undefined, ko: bool(f, "knockout") || undefined });
        break;
      }
      case "DROPSHADOWFILTER": {
        const [color, alpha] = rgba(child(f, "dropShadowColor"));
        out.push({ t: "shadow", color, alpha, bx: num(f, "blurX"), by: num(f, "blurY"), s: num(f, "strength"), angle: (num(f, "angle") * 180) / Math.PI, dist: num(f, "distance"), inner: bool(f, "innerShadow") || undefined, ko: bool(f, "knockout") || undefined, hide: !bool(f, "compositeSource") || undefined });
        break;
      }
      case "BLURFILTER":
        out.push({ t: "blur", bx: num(f, "blurX"), by: num(f, "blurY"), q: num(f, "passes", 1) });
        break;
      case "COLORMATRIXFILTER":
        out.push({ t: "matrix", m: items(child(f, "matrix")).map((i) => Number(i.children[0]?.value ?? 0)) });
        break;
      case "BEVELFILTER": {
        const [sc, sa] = rgba(child(f, "shadowColor"));
        const [hc, ha] = rgba(child(f, "highlightColor"));
        out.push({ t: "bevel", hc, ha, sc, sa, bx: num(f, "blurX"), by: num(f, "blurY"), s: num(f, "strength"), angle: (num(f, "angle") * 180) / Math.PI, dist: num(f, "distance"), type: bool(f, "innerShadow") ? "inner" : "outer" });
        break;
      }
      case "GRADIENTGLOWFILTER": case "GRADIENTBEVELFILTER": {
        const cols = items(child(f, "gradientColors")).map((c) => rgba(c));
        out.push({ t: "gglow", colors: cols.map((c) => c[0]), alphas: cols.map((c) => c[1]), ratios: items(child(f, "gradientRatio")).map((r) => Number(r.children[0]?.value ?? 0)), bx: num(f, "blurX"), by: num(f, "blurY"), s: num(f, "strength"), angle: (num(f, "angle") * 180) / Math.PI, dist: num(f, "distance") });
        break;
      }
    }
  }
  return out;
}

const BLEND_MODES = ["normal", "normal", "layer", "multiply", "screen", "lighten", "darken", "difference", "add", "subtract", "invert", "alpha", "erase", "overlay", "hardlight"];

function placeOp(t: XNode): Op {
  const op: Op = { d: num(t, "depth") };
  if (bool(t, "placeFlagHasCharacter")) op.id = num(t, "characterId");
  if (bool(t, "placeFlagMove")) op.mv = 1;
  if (bool(t, "placeFlagHasMatrix")) op.m = matrix(child(t, "matrix"));
  if (bool(t, "placeFlagHasColorTransform")) op.ct = cxform(child(t, "colorTransform"));
  if (bool(t, "placeFlagHasName")) op.nm = attr(t, "name");
  if (bool(t, "placeFlagHasRatio")) op.r = num(t, "ratio");
  if (bool(t, "placeFlagHasClipDepth")) op.cl = num(t, "clipDepth");
  if (bool(t, "placeFlagHasFilterList")) op.fl = filters(child(t, "surfaceFilterList"));
  if (bool(t, "placeFlagHasBlendMode")) op.bl = BLEND_MODES[num(t, "blendMode")] ?? "normal";
  if (bool(t, "placeFlagHasVisible")) op.vis = num(t, "visible") ? 1 : 0;
  if (bool(t, "placeFlagHasCacheAsBitmap")) op.cab = 1;
  return op;
}

let nestedDefine: ((t: XNode) => void) | null = null;

/** lê uma lista de tags de timeline (DefineSprite ou principal) */
function timeline(tags: XNode[], frameCount: number, warn: (m: string) => void): TimelineT {
  const tl: TimelineT = { n: Math.max(1, frameCount), f: [[]] };
  let cur = tl.f[0]!;
  for (const t of tags) {
    switch (type(t)) {
      case "ShowFrameTag":
        cur = [];
        tl.f.push(cur);
        break;
      case "PlaceObjectTag": case "PlaceObject2Tag": case "PlaceObject3Tag": case "PlaceObject4Tag":
        cur.push(placeOp(t));
        break;
      case "RemoveObjectTag": case "RemoveObject2Tag":
        cur.push({ rm: num(t, "depth") });
        break;
      case "FrameLabelTag":
        (tl.labels ??= {})[attr(t, "name") ?? ""] = tl.f.length;
        break;
      case "StartSoundTag": case "StartSound2Tag": {
        const fi = tl.f.length - 1;
        ((tl.snd ??= {})[fi] ??= []).push(num(t, "soundId"));
        break;
      }
      case "EndTag": case "SoundStreamHeadTag": case "SoundStreamHead2Tag": case "SoundStreamBlockTag": case "DoActionTag":
      case "VideoFrameTag": case "CSMTextSettingsTag": case "CSMSettingsTag":
        break;
      default:
        // definição dentro de sprite (SWF fora do padrão): processa como de topo
        if (/^Define/.test(type(t)) && nestedDefine) nestedDefine(t);
        else warn(`tag de timeline ignorada: ${type(t)}`);
    }
  }
  // o último ShowFrame cria um frame vazio extra
  while (tl.f.length > tl.n) tl.f.pop();
  while (tl.f.length < tl.n) tl.f.push([]);
  return tl;
}

function editText(t: XNode): EditTextT {
  const p: EditTextT = {};
  if (bool(t, "hasText")) p.text = attr(t, "initialText");
  if (bool(t, "html")) p.html = true;
  if (bool(t, "hasFont") || bool(t, "hasFontClass")) p.size = num(t, "fontHeight") / 20;
  if (bool(t, "hasTextColor")) { const [c, a] = rgba(child(t, "textColor")); p.color = c; p.alpha = a; }
  if (bool(t, "hasLayout")) {
    p.align = (["left", "right", "center", "justify"] as const)[num(t, "align")] ?? "left";
    p.leading = num(t, "leading") / 20;
    p.leftMargin = num(t, "leftMargin") / 20;
    p.rightMargin = num(t, "rightMargin") / 20;
    p.indent = num(t, "indent") / 20;
  }
  if (bool(t, "multiline")) p.multiline = true;
  if (bool(t, "wordWrap")) p.wordWrap = true;
  if (bool(t, "password")) p.password = true;
  if (bool(t, "readOnly")) p.readOnly = true;
  if (!bool(t, "noSelect")) p.selectable = true;
  if (bool(t, "border")) p.border = true;
  if (bool(t, "hasMaxLength")) p.maxChars = num(t, "maxLength");
  if (bool(t, "autoSize")) p.autoSize = true;
  if (bool(t, "useOutlines")) p.embed = true;
  const v = attr(t, "variableName");
  if (v) p.variable = v;
  (p as any).$fontId = bool(t, "hasFont") ? num(t, "fontId") : undefined;
  return p;
}

export interface ImageIndex {
  shapes: Map<number, string>;
  images: Map<number, string>;
  texts: Map<number, string>;
  morphs: Map<number, string>;
  sounds: Map<number, string>;
  binary: Map<number, string>;
}

export function buildLibrary(xml: string, swfRel: string, imgs: ImageIndex, warn: (m: string) => void): LibraryT {
  const roots = parseXml(xml).filter((n) => n.kind === "element");
  const swf = roots.find((n) => n.name === "swf");
  if (!swf) throw new Error("XML do FFDec sem <swf>");
  const disp = rect(child(swf, "displayRect"));
  const tags = items(child(swf, "tags"));
  const lib: LibraryT = {
    version: 1, swf: swfRel, frameRate: num(swf, "frameRate", 24), width: disp[2], height: disp[3],
    chars: {}, classes: {}, main: { n: 1, f: [[]] },
  };
  const fonts = new Map<number, { name: string; bold?: boolean; italic?: boolean }>();
  const grids = new Map<number, RectT>();
  const mainTags: XNode[] = [];

  const define = (t: XNode) => {
    const ty = type(t);
    switch (ty) {
      case "DefineShapeTag": case "DefineShape2Tag": case "DefineShape3Tag": case "DefineShape4Tag": {
        const id = num(t, "shapeId");
        const img = imgs.shapes.get(id);
        lib.chars[id] = { k: "shape", img: img ?? "", r: rect(child(t, "shapeBounds")) };
        if (!img) warn(`forma ${id} sem PNG exportado`);
        break;
      }
      case "DefineMorphShapeTag": case "DefineMorphShape2Tag": {
        const id = num(t, "characterId");
        lib.chars[id] = { k: "morph", img: imgs.morphs.get(id) ?? "", r: rect(child(t, "startBounds")) };
        break;
      }
      case "DefineBitsTag": case "DefineBitsJPEG2Tag": case "DefineBitsJPEG3Tag": case "DefineBitsJPEG4Tag":
      case "DefineBitsLosslessTag": case "DefineBitsLossless2Tag": {
        const id = num(t, "characterID", num(t, "characterId"));
        const w = num(t, "bitmapWidth"), h = num(t, "bitmapHeight");
        lib.chars[id] = { k: "bitmap", img: imgs.images.get(id) ?? "", w, h };
        if (!imgs.images.get(id)) warn(`bitmap ${id} sem imagem exportada`);
        break;
      }
      case "DefineSpriteTag": {
        const id = num(t, "spriteId");
        lib.chars[id] = { k: "sprite", tl: timeline(items(child(t, "subTags")), num(t, "frameCount", 1), warn) };
        break;
      }
      case "DefineButton2Tag": case "DefineButtonTag": {
        const id = num(t, "buttonId");
        const states: Record<"up" | "over" | "down" | "hit", Op[]> = { up: [], over: [], down: [], hit: [] };
        for (const rec of items(child(t, "characters"))) {
          if (type(rec) !== "BUTTONRECORD") continue;
          const op: Op = { d: num(rec, "placeDepth"), id: num(rec, "characterId") };
          op.m = matrix(child(rec, "placeMatrix"));
          const ct = cxform(child(rec, "colorTransform"));
          if (ct) op.ct = ct;
          if (bool(rec, "buttonHasFilterList")) op.fl = filters(child(rec, "filterList"));
          if (bool(rec, "buttonHasBlendMode")) op.bl = BLEND_MODES[num(rec, "blendMode")] ?? "normal";
          if (bool(rec, "buttonStateUp")) states.up.push(op);
          if (bool(rec, "buttonStateOver")) states.over.push(op);
          if (bool(rec, "buttonStateDown")) states.down.push(op);
          if (bool(rec, "buttonStateHitTest")) states.hit.push(op);
        }
        lib.chars[id] = { k: "button", ...states, menu: bool(t, "trackAsMenu") || undefined };
        break;
      }
      case "DefineEditTextTag": {
        const id = num(t, "characterID");
        lib.chars[id] = { k: "etext", r: rect(child(t, "bounds")), p: editText(t) };
        break;
      }
      case "DefineTextTag": case "DefineText2Tag": {
        const id = num(t, "characterID");
        const img = imgs.texts.get(id);
        lib.chars[id] = { k: "text", img, r: rect(child(t, "textBounds")) };
        break;
      }
      case "DefineSoundTag": {
        const id = num(t, "soundId");
        lib.chars[id] = { k: "sound", file: imgs.sounds.get(id) ?? "" };
        break;
      }
      case "DefineBinaryDataTag": {
        const id = num(t, "tag");
        lib.chars[id] = { k: "binary", file: imgs.binary.get(id) ?? "" };
        break;
      }
      case "DefineFontTag": case "DefineFont2Tag": case "DefineFont3Tag": case "DefineFont4Tag": {
        const id = num(t, "fontId", num(t, "fontID"));
        const f = { name: attr(t, "fontName") ?? "Arial", bold: bool(t, "fontFlagsBold") || undefined, italic: bool(t, "fontFlagsItalic") || undefined };
        fonts.set(id, f);
        lib.chars[id] = { k: "font", ...f };
        break;
      }
      case "DefineScalingGridTag": {
        grids.set(num(t, "characterId"), rect(child(t, "splitter")));
        break;
      }
      case "SymbolClassTag": case "ExportAssetsTag": {
        const ids = items(child(t, "tags")).map((i) => Number(i.children[0]?.value ?? 0));
        const names = items(child(t, "names")).map((i) => i.children[0]?.value ?? "");
        ids.forEach((id, i) => {
          const nm = names[i];
          if (nm) lib.classes[nm] = { id, base: "" };
        });
        break;
      }
      case "ShowFrameTag": case "PlaceObjectTag": case "PlaceObject2Tag": case "PlaceObject3Tag": case "RemoveObjectTag":
      case "RemoveObject2Tag": case "FrameLabelTag": case "StartSoundTag": case "StartSound2Tag":
        mainTags.push(t);
        break;
      case "CSMSettingsTag": case "TagStub":
        break;
      case "FileAttributesTag": case "MetadataTag": case "SetBackgroundColorTag": case "DoABCTag": case "DoABC2Tag":
      case "DefineFontAlignZonesTag": case "DefineFontNameTag": case "CSMTextSettingsTag": case "EndTag": case "ProductInfoTag":
      case "EnableDebugger2Tag": case "EnableDebuggerTag": case "DebugIDTag": case "ScriptLimitsTag": case "JPEGTablesTag":
      case "DefineSceneAndFrameLabelDataTag": case "DefineButtonCxformTag": case "DefineButtonSoundTag": case "SoundStreamHeadTag":
      case "SoundStreamHead2Tag": case "SoundStreamBlockTag": case "DefineFontInfoTag": case "DefineFontInfo2Tag": case "UnknownTag":
      case "ProtectTag": case "DefineVideoStreamTag": case "VideoFrameTag": case "DoActionTag": case "DoInitActionTag":
        break;
      default:
        warn(`tag ignorada: ${ty}`);
    }
  };
  nestedDefine = define;
  for (const t of tags) define(t);
  for (const [id, g] of grids) {
    const c = lib.chars[id];
    if (c && (c.k === "sprite" || c.k === "button")) c.grid = g;
  }
  // nome da fonte nos campos de texto
  for (const c of Object.values(lib.chars)) {
    if (c.k !== "etext") continue;
    const fid = (c.p as any).$fontId;
    delete (c.p as any).$fontId;
    if (fid !== undefined && fonts.has(fid)) c.p.font = fonts.get(fid)!.name;
  }
  lib.main = timeline(mainTags, num(swf, "frameCount", 1), warn);
  return lib;
}
