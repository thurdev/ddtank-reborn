/**
 * `flash.display.MovieClip` — Sprite com linha do tempo.
 *
 * A timeline vem do `library.json` exportado do SWF (tools/swf-export): cada
 * frame tem operações "coloca caractere X na profundidade D com matriz M",
 * "move", "remove". Aqui elas são reproduzidas com as regras do Flash:
 * - avançar 1 frame aplica só as operações do próximo frame;
 * - voltar (gotoAndStop num frame anterior / loop) reconstrói a partir do 1,
 *   reaproveitando os objetos que continuam no mesmo lugar;
 * - filhos com nome de instância viram propriedade (`mc.btn_ok`);
 * - máscaras de camada (clipDepth) recortam as profundidades de cima;
 * - frame scripts (`addFrameScript`, vindos das classes TS geradas) rodam
 *   quando o frame é alcançado.
 *
 * Como lê esse código:
 * - `$tl`  timeline (TimelineT); `$lib` biblioteca do SWF que cria os filhos
 * - `$frame` frame atual (1-based); `$playing` tocando?
 * - `$depths` profundidade → filho colocado pela timeline
 * - `$scripts` índice do frame (0-based) → função
 */
import { Matrix as PMatrix, Sprite as PSprite } from "pixi.js";
import { $class } from "../as3";
import { dlog } from "../debug";
import { ColorTransform } from "../geom/ColorTransform";
import { Matrix } from "../geom/Matrix";
import type { FilterT, Op, PlaceOp, TimelineT } from "../swf/library-types";
import { BevelFilter } from "../filters/BevelFilter";
import { BlurFilter } from "../filters/BlurFilter";
import { ColorMatrixFilter } from "../filters/ColorMatrixFilter";
import { DropShadowFilter } from "../filters/DropShadowFilter";
import { GlowFilter } from "../filters/GlowFilter";
import { GradientGlowFilter } from "../filters/GradientGlowFilter";
import { safe } from "../player-safe";
import type { DisplayObject } from "./DisplayObject";
import { FrameLabel } from "./FrameLabel";
import { Scene } from "./Scene";
import { Sprite } from "./Sprite";
import { Rectangle } from "../geom/Rectangle";
import { symbolOf, takePendingSymbol } from "../swf/symbol";

/** biblioteca que sabe criar caracteres (implementada em swf/SwfLibrary.ts) */
export interface CharFactory {
  create(id: number): DisplayObject | null;
  key: string;
}

/** clips tocando no palco (Player avança todos a cada frame) */
export const playingClips = new Set<MovieClip>();

export function filtersFromData(list: FilterT[] | undefined): any[] {
  if (!list) return [];
  return list.map((f) => {
    switch (f.t) {
      case "glow": return new GlowFilter(f.color, f.alpha, f.bx, f.by, f.s, 1, !!f.inner, !!f.ko);
      case "shadow": return new DropShadowFilter(f.dist, f.angle, f.color, f.alpha, f.bx, f.by, f.s, 1, !!f.inner, !!f.ko, !!f.hide);
      case "blur": return new BlurFilter(f.bx, f.by, f.q);
      case "matrix": return new ColorMatrixFilter(f.m);
      case "bevel": return new BevelFilter(f.dist, f.angle, f.hc, f.ha, f.sc, f.sa, f.bx, f.by, f.s, 1, f.type);
      case "gglow": return new GradientGlowFilter(f.dist, f.angle, f.colors, f.alphas, f.ratios, f.bx, f.by, f.s);
    }
  });
}

interface Placed {
  obj: DisplayObject;
  id: number;
  /** frame em que foi colocado (pra reaproveitar ao voltar) */
  at: number;
  clip?: number;
}

export class MovieClip extends Sprite {
  $tl: TimelineT | null = null;
  $lib: CharFactory | null = null;
  $frame = 1;
  $playing = false;
  $depths = new Map<number, Placed>();
  $scripts = new Map<number, () => void>();
  /** já rodou o script do frame atual */
  $scriptDone = false;
  $enabled = true;
  trackAsMenu = false;

  constructor() {
    super();
    const sym = takePendingSymbol() ?? symbolOf(this.constructor);
    if (sym && sym.char.k === "sprite") {
      this.$symbol = { swf: sym.lib.key, id: sym.id, linkage: sym.linkage };
      if (sym.char.grid) this.scale9Grid = new Rectangle(...sym.char.grid);
      this.$initSymbol(sym.lib, sym.char.tl);
    }
  }

  /** chamado pelo Sprite quando a classe tem símbolo de SWF */
  $initSymbol(lib: CharFactory, tl: TimelineT): void {
    this.$lib = lib;
    this.$tl = tl;
    this.$frame = 1;
    this.$apply(tl.f[0] ?? [], 1);
    this.$playing = tl.n > 1;
    this.$updateClipMasks();
    this.$scriptDone = false;
    queueFrameScript(this);
  }

  get currentFrame(): number { return this.$frame; }
  get totalFrames(): number { return this.$tl?.n ?? 1; }
  get framesLoaded(): number { return this.totalFrames; }
  get isPlaying(): boolean { return this.$playing; }
  get enabled(): boolean { return this.$enabled; }
  set enabled(v: boolean) { this.$enabled = !!v; }

  get currentLabel(): string | null {
    let best: string | null = null, bf = 0;
    for (const [n, f] of Object.entries(this.$tl?.labels ?? {})) if (f <= this.$frame && f >= bf) { best = n; bf = f; }
    return best;
  }
  get currentFrameLabel(): string | null {
    for (const [n, f] of Object.entries(this.$tl?.labels ?? {})) if (f === this.$frame) return n;
    return null;
  }
  get currentLabels(): FrameLabel[] {
    return Object.entries(this.$tl?.labels ?? {}).sort((a, b) => a[1] - b[1]).map(([n, f]) => new FrameLabel(n, f));
  }
  get currentScene(): Scene { return new Scene("Scene 1", this.currentLabels, this.totalFrames); }
  get scenes(): Scene[] { return [this.currentScene]; }

  /** `addFrameScript(frame0, fn, frame0b, fnb, ...)` */
  addFrameScript(...args: any[]): void {
    for (let i = 0; i + 1 < args.length; i += 2) {
      const f = args[i] as number, fn = args[i + 1];
      if (typeof fn === "function") this.$scripts.set(f, fn);
      else this.$scripts.delete(f);
    }
    if (this.$scripts.has(this.$frame - 1)) { this.$scriptDone = false; queueFrameScript(this); }
  }

  play(): void { this.$playing = this.totalFrames > 1; this.$syncPlaying(); }
  stop(): void { this.$playing = false; this.$syncPlaying(); }
  nextFrame(): void { this.$goto(Math.min(this.totalFrames, this.$frame + 1)); this.stop(); }
  prevFrame(): void { this.$goto(Math.max(1, this.$frame - 1)); this.stop(); }
  nextScene(): void {}
  prevScene(): void {}

  gotoAndStop(frame: any, _scene: string | null = null): void {
    this.$playing = false;
    this.$syncPlaying();
    this.$goto(this.$resolveFrame(frame));
  }
  gotoAndPlay(frame: any, _scene: string | null = null): void {
    this.$playing = this.totalFrames > 1;
    this.$syncPlaying();
    this.$goto(this.$resolveFrame(frame));
  }

  $resolveFrame(frame: any): number {
    if (typeof frame === "number") return Math.max(1, Math.min(this.totalFrames, Math.floor(frame)));
    const s = String(frame);
    const lf = this.$tl?.labels?.[s];
    if (lf) return lf;
    const n = Number(s);
    if (!Number.isNaN(n) && s.trim() !== "") return Math.max(1, Math.min(this.totalFrames, Math.floor(n)));
    // Flash lança ArgumentError #2109 pra rótulo inexistente
    throw Object.assign(new Error(`Error #2109: Frame label ${s} not found in scene Scene 1.`), { name: "ArgumentError" });
  }

  $syncPlaying(): void {
    if (this.$playing && this.$stage) playingClips.add(this);
    else playingClips.delete(this);
  }

  $setStage(stage: any): void {
    super.$setStage(stage);
    this.$syncPlaying();
  }

  /** Player chama 1x por frame do jogo */
  $advance(): void {
    if (!this.$playing || !this.$tl) return;
    const next = this.$frame >= this.$tl.n ? 1 : this.$frame + 1;
    this.$goto(next, false);
  }

  /** vai pro frame `target` (1-based) */
  $goto(target: number, runScriptNow = true): void {
    const tl = this.$tl;
    if (!tl) return;
    if (target === this.$frame) return;
    if (target > this.$frame) {
      for (let f = this.$frame + 1; f <= target; f++) this.$apply(tl.f[f - 1] ?? [], f);
    } else {
      this.$rebuild(target);
    }
    this.$frame = target;
    this.$updateClipMasks();
    this.$scriptDone = false;
    if (runScriptNow) this.$runFrameScript();
    else queueFrameScript(this);
  }

  $runFrameScript(): void {
    if (this.$scriptDone) return;
    this.$scriptDone = true;
    const fn = this.$scripts.get(this.$frame - 1);
    if (fn) safe(() => fn.call(this), `frame script ${this.constructor.name} frame ${this.$frame}`);
  }

  /** volta: calcula o estado do frame alvo do zero e reaproveita o que dá */
  private $rebuild(target: number): void {
    const tl = this.$tl!;
    const state = new Map<number, { op: PlaceOp; id: number; at: number }>();
    for (let f = 1; f <= target; f++) {
      for (const op of tl.f[f - 1] ?? []) {
        if ("rm" in op) { state.delete(op.rm); continue; }
        const prev = state.get(op.d);
        if (op.mv && prev) {
          const merged = { ...prev.op, ...op } as PlaceOp;
          if (op.id !== undefined && op.id !== prev.id) state.set(op.d, { op: merged, id: op.id, at: f });
          else state.set(op.d, { op: merged, id: prev.id, at: prev.at });
        } else if (op.id !== undefined) {
          state.set(op.d, { op: { ...op }, id: op.id, at: f });
        }
      }
    }
    // remove o que não existe mais (ou foi recolocado em outro frame)
    for (const [d, p] of [...this.$depths]) {
      const s = state.get(d);
      if (!s || s.id !== p.id || s.at !== p.at) this.$removeDepth(d);
    }
    // coloca/atualiza
    for (const [d, s] of [...state].sort((a, b) => a[0] - b[0])) {
      const p = this.$depths.get(d);
      if (p) this.$applyProps(p.obj, s.op, true);
      else this.$place({ ...s.op, mv: undefined, id: s.id }, s.at);
    }
  }

  /** aplica as operações de um frame */
  $apply(ops: Op[], frame: number): void {
    for (const op of ops) {
      if ("rm" in op) { this.$removeDepth(op.rm); continue; }
      const cur = this.$depths.get(op.d);
      if (op.mv && cur) {
        if (op.id !== undefined && op.id !== cur.id) {
          // troca o caractere mantendo as propriedades
          this.$removeDepth(op.d);
          this.$place(op, frame);
        } else this.$applyProps(cur.obj, op, false);
      } else if (op.id !== undefined) {
        if (cur) this.$removeDepth(op.d);
        this.$place(op, frame);
      }
    }
  }

  private $place(op: PlaceOp, frame: number): void {
    const obj = this.$lib?.create(op.id!);
    if (!obj) return;
    (obj as any).$depth = op.d;
    this.$depths.set(op.d, { obj, id: op.id!, at: frame, clip: op.cl });
    this.$applyProps(obj, op, true);
    // ordem de exibição = profundidade (filhos adicionados por código ficam por cima)
    let idx = this.$children.length;
    for (let i = 0; i < this.$children.length; i++) {
      const d = (this.$children[i] as any).$depth;
      if (d !== undefined && d > op.d) { idx = i; break; }
      if (d === undefined) { idx = i; break; }
    }
    this.$addAt(obj, idx);
    if (op.nm) (this as any)[op.nm] = obj;
  }

  private $applyProps(obj: DisplayObject, op: PlaceOp, full: boolean): void {
    if (op.m) obj.$setMatrix(new Matrix(...op.m));
    else if (full) obj.$setMatrix(new Matrix());
    if (op.ct) {
      const c = op.ct;
      obj.$colorTransform = new ColorTransform(c[0], c[1], c[2], c[3], c[4], c[5], c[6], c[7]);
      obj.$applyColor();
    } else if (full && !obj.$colorTransform.$isIdentity) {
      obj.$colorTransform = new ColorTransform();
      obj.$applyColor();
    }
    if (op.nm) obj.name = op.nm;
    if (op.fl) obj.filters = filtersFromData(op.fl);
    if (op.bl) obj.blendMode = op.bl;
    if (op.vis !== undefined) obj.visible = !!op.vis;
    const p = this.$depths.get(op.d);
    if (p && op.cl !== undefined) p.clip = op.cl;
  }

  private $removeDepth(d: number): void {
    const p = this.$depths.get(d);
    if (!p) return;
    this.$depths.delete(d);
    if (p.obj.$parent === this) this.$detach(p.obj);
    const nm = p.obj.$name;
    if (nm && (this as any)[nm] === p.obj) (this as any)[nm] = null;
  }

  /** máscaras de camada: o objeto em `d` com clip `c` recorta as profundidades (d, c] */
  private $updateClipMasks(): void {
    let any = false;
    for (const p of this.$depths.values()) if (p.clip !== undefined) { any = true; break; }
    if (!any && !this.$hasClipMasks) return;
    this.$hasClipMasks = any;
    const masks = [...this.$depths.entries()].filter(([, p]) => p.clip !== undefined);
    for (const [d, p] of this.$depths) {
      const m = masks.find(([md, mp]) => d > md && d <= mp.clip!);
      const node = p.obj.$node as any;
      if (p.clip !== undefined) {
        p.obj.$maskOf = p.obj; // não desenha nem recebe mouse
        node.renderable = false;
        continue;
      }
      if (!m) {
        if (node.$clipMask) { node.mask = null; node.removeChild(node.$clipMask); node.$clipMask = null; }
        continue;
      }
      const maskObj = m[1].obj;
      const img: PSprite | null = (maskObj as any).$img ?? null;
      if (!img) continue;
      // cópia da imagem da máscara dentro do filho, no espaço dele
      let mk: PSprite = node.$clipMask;
      if (!mk) { mk = new PSprite(img.texture); node.addChild(mk); node.$clipMask = mk; node.mask = mk; }
      const inv = p.obj.$m.clone();
      inv.invert();
      const rel = maskObj.$m.clone();
      rel.concat(inv);
      const r = (maskObj as any).$imgRect;
      const local = new Matrix(r.width / img.texture.width, 0, 0, r.height / img.texture.height, r.x, r.y);
      local.concat(rel);
      mk.setFromMatrix(new PMatrix(local.a, local.b, local.c, local.d, local.tx, local.ty));
    }
  }
  $hasClipMasks = false;
}
(MovieClip.prototype as any).$isTimeline = true;
$class(MovieClip, "flash.display.MovieClip", { dynamic: true });

// ------------------------------------------------------------------ fila de frame scripts
const pendingScripts = new Set<MovieClip>();
export function queueFrameScript(mc: MovieClip): void {
  if (mc.$scripts.size) pendingScripts.add(mc);
}
/** Player chama depois do ENTER_FRAME e depois de eventos de input */
export function runPendingFrameScripts(): void {
  let guard = 0;
  while (pendingScripts.size && guard++ < 10) {
    const list = [...pendingScripts];
    pendingScripts.clear();
    for (const mc of list) mc.$runFrameScript();
  }
  if (guard >= 10) dlog("error", "frame scripts em loop (gotoAndPlay dentro de frame script?)");
}
