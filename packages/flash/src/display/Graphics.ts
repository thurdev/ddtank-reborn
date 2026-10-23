/**
 * `flash.display.Graphics` — desenho vetorial (`sprite.graphics.beginFill...`).
 *
 * Os comandos são gravados numa lista (`$cmds`). A lista é:
 * - reproduzida num `Graphics` do Pixi pra desenhar na tela (quando muda);
 * - reproduzida num Canvas2D pra hit-test exato (`hitTestPoint(..., true)`) e
 *   pra `BitmapData.draw` (que precisa dos pixels no CPU).
 *
 * Semântica do Flash: o preenchimento vale do `beginFill` até o `endFill` (ou
 * próximo `beginFill`) e fecha o caminho sozinho; `lineStyle` vale pros
 * segmentos desenhados depois dele.
 */
import { FillGradient, Graphics as PGraphics, Matrix as PMatrix, type Texture } from "pixi.js";
import { $class } from "../as3";
import { Matrix } from "../geom/Matrix";
import { Rectangle } from "../geom/Rectangle";

type Cmd =
  | { t: "fill"; color: number; alpha: number }
  | { t: "bfill"; bd: any; matrix: Matrix | null; repeat: boolean; smooth: boolean }
  | { t: "gfill"; type: string; colors: number[]; alphas: number[]; ratios: number[]; matrix: Matrix | null }
  | { t: "end" }
  | { t: "line"; width: number; color: number; alpha: number; none: boolean }
  | { t: "lgrad"; type: string; colors: number[]; alphas: number[]; ratios: number[]; matrix: Matrix | null }
  | { t: "move"; x: number; y: number }
  | { t: "lineTo"; x: number; y: number }
  | { t: "curve"; cx: number; cy: number; x: number; y: number }
  | { t: "cubic"; c1x: number; c1y: number; c2x: number; c2y: number; x: number; y: number }
  | { t: "rect"; x: number; y: number; w: number; h: number }
  | { t: "rrect"; x: number; y: number; w: number; h: number; r: number }
  | { t: "circle"; x: number; y: number; r: number }
  | { t: "ellipse"; x: number; y: number; w: number; h: number };

const rgba = (c: number, a: number) => `rgba(${(c >> 16) & 255},${(c >> 8) & 255},${c & 255},${a})`;

export class Graphics {
  $cmds: Cmd[] = [];
  /** dono (Sprite/Shape) — avisado quando muda */
  $owner: any;
  $pixi: PGraphics | null = null;
  $dirty = false;
  private $boundsCache: Rectangle | null | undefined;

  constructor(owner?: any) {
    this.$owner = owner;
  }

  private $push(c: Cmd): void {
    this.$cmds.push(c);
    this.$dirty = true;
    this.$boundsCache = undefined;
    this.$owner?.$graphicsChanged?.();
  }

  clear(): void {
    this.$cmds = [];
    this.$dirty = true;
    this.$boundsCache = undefined;
    this.$owner?.$graphicsChanged?.();
  }

  beginFill(color: number, alpha = 1): void { this.$push({ t: "fill", color: color >>> 0 & 0xffffff, alpha }); }
  beginBitmapFill(bitmap: any, matrix: Matrix | null = null, repeat = true, smooth = false): void {
    this.$push({ t: "bfill", bd: bitmap, matrix: matrix?.clone() ?? null, repeat, smooth });
  }
  beginGradientFill(type: string, colors: number[], alphas: number[], ratios: number[], matrix: Matrix | null = null, ..._rest: any[]): void {
    this.$push({ t: "gfill", type, colors: colors.slice(), alphas: alphas.slice(), ratios: ratios.slice(), matrix: matrix?.clone() ?? null });
  }
  beginShaderFill(_shader: any, _matrix?: Matrix): void { this.$push({ t: "fill", color: 0, alpha: 0 }); }
  endFill(): void { this.$push({ t: "end" }); }
  lineStyle(thickness: number = NaN, color = 0, alpha = 1, ..._rest: any[]): void {
    this.$push({ t: "line", width: Number.isNaN(thickness) ? 0 : Math.max(thickness, 0.5), color: color >>> 0 & 0xffffff, alpha, none: Number.isNaN(thickness) || thickness === undefined });
  }
  lineGradientStyle(type: string, colors: number[], alphas: number[], ratios: number[], matrix: Matrix | null = null, ..._rest: any[]): void {
    this.$push({ t: "lgrad", type, colors, alphas, ratios, matrix });
  }
  lineBitmapStyle(..._a: any[]): void {}
  lineShaderStyle(..._a: any[]): void {}
  moveTo(x: number, y: number): void { this.$push({ t: "move", x, y }); }
  lineTo(x: number, y: number): void { this.$push({ t: "lineTo", x, y }); }
  curveTo(cx: number, cy: number, x: number, y: number): void { this.$push({ t: "curve", cx, cy, x, y }); }
  cubicCurveTo(c1x: number, c1y: number, c2x: number, c2y: number, x: number, y: number): void { this.$push({ t: "cubic", c1x, c1y, c2x, c2y, x, y }); }
  drawRect(x: number, y: number, w: number, h: number): void { this.$push({ t: "rect", x, y, w, h }); }
  drawRoundRect(x: number, y: number, w: number, h: number, ew: number, eh: number = ew): void {
    this.$push({ t: "rrect", x, y, w, h, r: Math.min(ew, eh ?? ew) / 2 });
  }
  drawRoundRectComplex(x: number, y: number, w: number, h: number, tl: number, _tr: number, _bl: number, _br: number): void {
    this.$push({ t: "rrect", x, y, w, h, r: tl });
  }
  drawCircle(x: number, y: number, r: number): void { this.$push({ t: "circle", x, y, r }); }
  drawEllipse(x: number, y: number, w: number, h: number): void { this.$push({ t: "ellipse", x, y, w, h }); }
  drawPath(commands: number[], data: number[], _winding = "evenOdd"): void {
    let i = 0;
    for (const c of commands) {
      switch (c) {
        case 1: this.moveTo(data[i]!, data[i + 1]!); i += 2; break;
        case 2: this.lineTo(data[i]!, data[i + 1]!); i += 2; break;
        case 3: this.curveTo(data[i]!, data[i + 1]!, data[i + 2]!, data[i + 3]!); i += 4; break;
        case 6: this.cubicCurveTo(data[i]!, data[i + 1]!, data[i + 2]!, data[i + 3]!, data[i + 4]!, data[i + 5]!); i += 6; break;
      }
    }
  }
  drawTriangles(vertices: number[], indices: number[] | null = null, ..._rest: any[]): void {
    const idx = indices ?? vertices.map((_, i) => i).filter((i) => i < vertices.length / 2);
    for (let i = 0; i + 2 < idx.length; i += 3) {
      const p = (k: number) => [vertices[idx[k]! * 2]!, vertices[idx[k]! * 2 + 1]!] as const;
      const [a, b, c] = [p(i), p(i + 1), p(i + 2)];
      this.moveTo(a[0], a[1]); this.lineTo(b[0], b[1]); this.lineTo(c[0], c[1]); this.lineTo(a[0], a[1]);
    }
  }
  drawGraphicsData(_d: any[]): void {}
  readGraphicsData(_recurse = true): any[] { return []; }
  copyFrom(src: Graphics): void {
    this.$cmds = src.$cmds.slice();
    this.$dirty = true;
    this.$boundsCache = undefined;
    this.$owner?.$graphicsChanged?.();
  }

  /** render-queue: reconstrói o Pixi uma vez por frame */
  $flush(): void { this.$updatePixi(); }

  // ------------------------------------------------------------ reprodução (Pixi)
  /** reconstrói o Graphics do Pixi se mudou */
  $updatePixi(): PGraphics {
    const g = (this.$pixi ??= new PGraphics());
    if (!this.$dirty) return g;
    this.$dirty = false;
    g.clear();
    replay(this.$cmds, {
      path: (op) => {
        switch (op.t) {
          case "move": g.moveTo(op.x, op.y); break;
          case "lineTo": g.lineTo(op.x, op.y); break;
          case "curve": g.quadraticCurveTo(op.cx, op.cy, op.x, op.y); break;
          case "cubic": g.bezierCurveTo(op.c1x, op.c1y, op.c2x, op.c2y, op.x, op.y); break;
          case "rect": g.rect(op.x, op.y, op.w, op.h); break;
          case "rrect": g.roundRect(op.x, op.y, op.w, op.h, op.r); break;
          case "circle": g.circle(op.x, op.y, op.r); break;
          case "ellipse": g.ellipse(op.x + op.w / 2, op.y + op.h / 2, op.w / 2, op.h / 2); break;
        }
      },
      fill: (f) => {
        if (f.t === "fill") g.fill({ color: f.color, alpha: f.alpha });
        else if (f.t === "bfill") {
          const tex: Texture | null = f.bd?.$texture?.() ?? null;
          if (tex) {
            const m = f.matrix ? new PMatrix(f.matrix.a, f.matrix.b, f.matrix.c, f.matrix.d, f.matrix.tx, f.matrix.ty) : new PMatrix();
            g.fill({ texture: tex, matrix: m, textureSpace: "global" } as any);
          } else g.fill({ color: 0, alpha: 0 });
        } else if (f.t === "gfill") {
          g.fill(makeGradient(f));
        }
      },
      stroke: (s) => {
        if (s.t === "line") g.stroke({ width: s.width, color: s.color, alpha: s.alpha });
        else g.stroke({ width: 1, fill: makeGradient(s as any) } as any);
      },
    });
    return g;
  }

  // ------------------------------------------------------------ reprodução (Canvas2D)
  /** desenha num contexto 2D (BitmapData.draw) */
  $drawCanvas(ctx: CanvasRenderingContext2D): void {
    ctx.beginPath();
    replay(this.$cmds, {
      path: (op) => canvasPath(ctx, op),
      fill: (f) => {
        if (f.t === "fill") ctx.fillStyle = rgba(f.color, f.alpha);
        else if (f.t === "bfill") {
          const src = f.bd?.$canvasSource?.();
          if (src) {
            const p = ctx.createPattern(src, f.repeat ? "repeat" : "no-repeat");
            if (p && f.matrix) p.setTransform({ a: f.matrix.a, b: f.matrix.b, c: f.matrix.c, d: f.matrix.d, e: f.matrix.tx, f: f.matrix.ty });
            ctx.fillStyle = p ?? "transparent";
          } else ctx.fillStyle = "transparent";
        } else {
          ctx.fillStyle = rgba(f.colors[0] ?? 0, f.alphas[0] ?? 1);
        }
        ctx.fill("evenodd");
        ctx.beginPath();
      },
      stroke: (s) => {
        if (s.t === "line") { ctx.strokeStyle = rgba(s.color, s.alpha); ctx.lineWidth = s.width; }
        ctx.stroke();
        ctx.beginPath();
      },
    });
  }

  /** ponto (local) dentro da forma preenchida? */
  $hitShape(x: number, y: number): boolean {
    const b = this.$bounds();
    if (!b || !b.contains(x, y)) return false;
    const ctx = hitCtx();
    if (!ctx) return true;
    let hit = false;
    ctx.beginPath();
    replay(this.$cmds, {
      path: (op) => canvasPath(ctx, op),
      fill: () => { if (ctx.isPointInPath(x, y, "evenodd")) hit = true; ctx.beginPath(); },
      stroke: (s) => {
        ctx.lineWidth = s.t === "line" ? Math.max(1, s.width) : 1;
        if (ctx.isPointInStroke(x, y)) hit = true;
        ctx.beginPath();
      },
    });
    return hit;
  }

  /** bounds do desenho (espaço local), incluindo meia espessura de linha */
  $bounds(): Rectangle | null {
    if (this.$boundsCache !== undefined) return this.$boundsCache;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let lw = 0;
    const add = (x: number, y: number, pad = lw / 2) => {
      if (x - pad < minX) minX = x - pad;
      if (y - pad < minY) minY = y - pad;
      if (x + pad > maxX) maxX = x + pad;
      if (y + pad > maxY) maxY = y + pad;
    };
    let cx = 0, cy = 0;
    for (const c of this.$cmds) {
      switch (c.t) {
        case "line": lw = c.none ? 0 : c.width; break;
        case "move": cx = c.x; cy = c.y; break;
        case "lineTo": add(cx, cy); add(c.x, c.y); cx = c.x; cy = c.y; break;
        case "curve": add(cx, cy); add(c.cx, c.cy); add(c.x, c.y); cx = c.x; cy = c.y; break;
        case "cubic": add(cx, cy); add(c.c1x, c.c1y); add(c.c2x, c.c2y); add(c.x, c.y); cx = c.x; cy = c.y; break;
        case "rect": case "rrect": add(c.x, c.y); add(c.x + c.w, c.y + c.h); break;
        case "circle": add(c.x - c.r, c.y - c.r); add(c.x + c.r, c.y + c.r); break;
        case "ellipse": add(c.x, c.y); add(c.x + c.w, c.y + c.h); break;
      }
    }
    this.$boundsCache = minX === Infinity ? null : new Rectangle(minX, minY, maxX - minX, maxY - minY);
    return this.$boundsCache;
  }
}
$class(Graphics, "flash.display.Graphics");

// ------------------------------------------------------------------ replay comum
type PathOp = Extract<Cmd, { t: "move" | "lineTo" | "curve" | "cubic" | "rect" | "rrect" | "circle" | "ellipse" }>;
type FillOp = Extract<Cmd, { t: "fill" | "bfill" | "gfill" }>;
type LineOp = Extract<Cmd, { t: "line" | "lgrad" }>;

/**
 * Percorre os comandos aplicando a regra do Flash: um caminho de
 * preenchimento por beginFill..endFill, e traços com o lineStyle vigente.
 */
function replay(cmds: Cmd[], out: { path: (op: PathOp) => void; fill: (f: FillOp) => void; stroke: (s: LineOp) => void }): void {
  let fill: FillOp | null = null;
  let line: LineOp | null = null;
  let fillPath: PathOp[] = [];
  let strokePath: PathOp[] = [];
  let start: { x: number; y: number } | null = null;
  let pen = { x: 0, y: 0 };

  const flushStroke = () => {
    if (line && !(line.t === "line" && line.none) && strokePath.some((o) => o.t !== "move")) {
      for (const o of strokePath) out.path(o);
      out.stroke(line);
    }
    strokePath = [];
  };
  const flushFill = () => {
    if (fill && fillPath.some((o) => o.t !== "move")) {
      // fecha o caminho até o início (Flash fecha sozinho)
      if (start && (pen.x !== start.x || pen.y !== start.y)) fillPath.push({ t: "lineTo", x: start.x, y: start.y });
      for (const o of fillPath) out.path(o);
      out.fill(fill);
    }
    fillPath = [];
  };

  for (const c of cmds) {
    switch (c.t) {
      case "fill": case "bfill": case "gfill":
        flushFill(); flushStroke();
        fill = c; start = null;
        fillPath.push({ t: "move", x: pen.x, y: pen.y });
        strokePath.push({ t: "move", x: pen.x, y: pen.y });
        break;
      case "end":
        flushFill(); flushStroke();
        fill = null;
        strokePath.push({ t: "move", x: pen.x, y: pen.y });
        break;
      case "line": case "lgrad":
        flushStroke();
        line = c;
        strokePath.push({ t: "move", x: pen.x, y: pen.y });
        break;
      case "move":
        pen = { x: c.x, y: c.y };
        start = { ...pen };
        fillPath.push(c);
        strokePath.push(c);
        break;
      case "lineTo": case "curve": case "cubic":
        if (!start) start = { ...pen };
        fillPath.push(c);
        strokePath.push(c);
        pen = { x: c.x, y: c.y };
        break;
      default:
        // formas fechadas (rect/círculo...)
        fillPath.push(c);
        strokePath.push(c);
        break;
    }
  }
  flushFill();
  flushStroke();
}

function canvasPath(ctx: CanvasRenderingContext2D, op: PathOp): void {
  switch (op.t) {
    case "move": ctx.moveTo(op.x, op.y); break;
    case "lineTo": ctx.lineTo(op.x, op.y); break;
    case "curve": ctx.quadraticCurveTo(op.cx, op.cy, op.x, op.y); break;
    case "cubic": ctx.bezierCurveTo(op.c1x, op.c1y, op.c2x, op.c2y, op.x, op.y); break;
    case "rect": ctx.rect(op.x, op.y, op.w, op.h); break;
    case "rrect": ctx.roundRect?.(op.x, op.y, op.w, op.h, op.r) ?? ctx.rect(op.x, op.y, op.w, op.h); break;
    case "circle": ctx.moveTo(op.x + op.r, op.y); ctx.arc(op.x, op.y, op.r, 0, Math.PI * 2); break;
    case "ellipse": ctx.moveTo(op.x + op.w, op.y + op.h / 2); ctx.ellipse(op.x + op.w / 2, op.y + op.h / 2, op.w / 2, op.h / 2, 0, 0, Math.PI * 2); break;
  }
}

function makeGradient(f: { type: string; colors: number[]; alphas: number[]; ratios: number[]; matrix: Matrix | null }): FillGradient {
  // caixa de gradiente do Flash: -819.2..819.2 transformada pela matriz
  const m = f.matrix ?? new Matrix(100 / 1638.4, 0, 0, 100 / 1638.4, 50, 50);
  const tp = (x: number, y: number) => ({ x: m.a * x + m.c * y + m.tx, y: m.b * x + m.d * y + m.ty });
  const stops = f.colors.map((c, i) => ({ offset: (f.ratios[i] ?? 0) / 255, color: rgba(c, f.alphas[i] ?? 1) }));
  if (f.type === "radial") {
    const center = tp(0, 0);
    const edge = tp(819.2, 0);
    const r = Math.hypot(edge.x - center.x, edge.y - center.y);
    return new FillGradient({ type: "radial", center, innerRadius: 0, outerCenter: center, outerRadius: r, colorStops: stops, textureSpace: "global" } as any);
  }
  return new FillGradient({ type: "linear", start: tp(-819.2, 0), end: tp(819.2, 0), colorStops: stops, textureSpace: "global" } as any);
}

let _hitCtx: CanvasRenderingContext2D | null | undefined;
function hitCtx(): CanvasRenderingContext2D | null {
  if (_hitCtx !== undefined) return _hitCtx;
  try {
    const c = typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(1, 1) : document.createElement("canvas");
    _hitCtx = (c.getContext("2d") as CanvasRenderingContext2D) ?? null;
  } catch {
    _hitCtx = null;
  }
  return _hitCtx;
}
