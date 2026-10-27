/**
 * O "Flash Player": cria o Stage sobre um canvas PixiJS e roda o loop.
 *
 * Loop (igual ao Flash, separando lógica de desenho):
 *   - lógica a `stage.frameRate` (25 fps no DDTank): avança timelines,
 *     dispara ENTER_FRAME, roda frame scripts, RENDER;
 *   - desenho a cada requestAnimationFrame (60+ fps): envia mudanças pra GPU
 *     e renderiza. (Movimento suave a 60 fps de verdade fica pra uma etapa
 *     seguinte — interpolação — sem mudar a lógica do jogo.)
 *
 * Entrada:
 *   - mouse: acha o alvo com as regras do Flash (mouseEnabled/mouseChildren,
 *     forma exata), dispara MOUSE_DOWN/UP/CLICK/OVER/OUT/ROLL_*, WHEEL,
 *     troca estado de SimpleButton e de MovieClip com buttonMode;
 *   - teclado: KEY_DOWN/KEY_UP no objeto com foco (ou no palco);
 *   - modo debug (`?debug=true`): cada clique é logado com classe/arquivo/arte.
 */
import { Application, type Container } from "pixi.js";
// overlay, hard-light, difference, lighten, darken... (efeitos de luz das batalhas); sem isso viram "normal"
import "pixi.js/advanced-blend-modes";
import { debugAttachStage, debugClick, dlog, DEBUG } from "./debug";
import { applyInterp, restoreInterp, snapshot } from "./interp";
import { startStats, Stats } from "./stats";
import { Event } from "./events/Event";
import { broadcastTargets } from "./events/EventDispatcher";
import { KeyboardEvent } from "./events/KeyboardEvent";
import { MouseEvent } from "./events/MouseEvent";
import { Point } from "./geom/Point";
import { flushRenderQueue } from "./render-queue";
import { safe } from "./player-safe";
import { runLogicFrame } from "./frame-loop";
import { DisplayObject, Player } from "./display/DisplayObject";
import { DisplayObjectContainer } from "./display/DisplayObjectContainer";
import { InteractiveObject } from "./display/InteractiveObject";
import { MovieClip, runPendingFrameScripts } from "./display/MovieClip";
import { SimpleButton } from "./display/SimpleButton";
import { Sprite } from "./display/Sprite";
import { Stage } from "./display/Stage";
import { Drag } from "./display/drag";
import { TextField } from "./text/TextField";
import { InputOverlay } from "./text/input-overlay";
import { unlockAudio } from "./media/audio";
import { MouseState } from "./ui/mouse-state";

export interface PlayerOptions {
  /** elemento onde o canvas entra (ocupa 100% dele, mantendo a proporção) */
  container: HTMLElement;
  width?: number;
  height?: number;
  frameRate?: number;
  background?: number;
  /** task multi-char (apps/client avatar.ts): 0 = canvas transparente (character preview embutido
   *  numa página sem o fundo preto do stage). Padrão 1 (opaco), igual sempre foi. */
  backgroundAlpha?: number;
  /** task multi-char (round 2, coordinator-found root cause): PixiJS's back buffer — needed for the
   *  advanced blend modes battle light effects use (overlay/hard-light/...), see the `pixi.js/advanced-blend-modes`
   *  import below — presents itself onto the real canvas with a BLENDED (not cleared) draw
   *  (`GlBackBufferSystem._presentBackBuffer`: `renderTarget.bind({..., clear: false})`, then a full-screen
   *  triangle draw with normal alpha blending). With an OPAQUE canvas (the default, `backgroundAlpha: 1`)
   *  that draw is alpha=1 everywhere so it still fully overwrites every pixel — equivalent to a clear. With
   *  a TRANSPARENT canvas (`backgroundAlpha: 0`, only `avatar.ts` uses this) the back buffer has transparent
   *  regions wherever nothing was drawn that frame, so the composite only blends there — it never actually
   *  erases a moving object's PREVIOUS position, leaving permanent smear trails behind anything that moves.
   *  Default true (unchanged for the full game client); `avatar.ts` passes false — its character preview(s)
   *  don't need those specific blend modes, just `setShowLight`'s aura (plain ADD, natively supported). */
  useBackBuffer?: boolean;
}

let stageRef: Stage | null = null;
export function currentStage(): Stage | null {
  return stageRef;
}

export async function startPlayer(opts: PlayerOptions): Promise<Stage> {
  const W = opts.width ?? 1000, H = opts.height ?? 600;
  const app = new Application();
  await app.init({
    width: W, height: H, background: opts.background ?? 0x000000, backgroundAlpha: opts.backgroundAlpha ?? 1, antialias: true,
    resolution: Math.min(2, globalThis.devicePixelRatio || 1), autoDensity: true, preference: "webgl",
    // deixa prints/captura de tela funcionarem (custo pequeno)
    preserveDrawingBuffer: true,
    // blend modes avançados (overlay, hard-light...) leem o que já foi desenhado — exceto quando o próprio
    // opt-out (`PlayerOptions.useBackBuffer`, ver seu comentário) troca por false: canvas transparente com
    // objetos em movimento (apps/client avatar.ts) não pode usar isso, deixa rastro.
    useBackBuffer: opts.useBackBuffer ?? true,
  });
  const host = opts.container;
  if (getComputedStyle(host).position === "static") host.style.position = "relative";
  host.style.overflow = "hidden";
  const canvas = app.canvas as HTMLCanvasElement;
  canvas.style.position = "absolute";
  canvas.style.touchAction = "none";
  host.appendChild(canvas);
  const overlay = document.createElement("div");
  Object.assign(overlay.style, { position: "absolute", left: "0", top: "0", width: "100%", height: "100%", pointerEvents: "none" });
  host.appendChild(overlay);

  const stage = new Stage(W, H);
  stageRef = stage;
  stage.$frameRate = opts.frameRate ?? 25;
  stage.$fullscreenHost = host;
  app.stage.addChild(stage.$node);

  // ---------------------------------------------------- encaixe na janela
  let scale = { sx: 1, sy: 1, ox: 0, oy: 0 };
  const fit = () => {
    const r = host.getBoundingClientRect();
    const s = Math.min(r.width / W, r.height / H) || 1;
    const w = W * s, h = H * s;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    canvas.style.left = `${(r.width - w) / 2}px`;
    canvas.style.top = `${(r.height - h) / 2}px`;
    scale = { sx: s, sy: s, ox: (r.width - w) / 2, oy: (r.height - h) / 2 };
    InputOverlay.reposition();
  };
  new ResizeObserver(fit).observe(host);
  fit();
  InputOverlay.setHost({
    container: overlay,
    scale: () => scale,
    blur: (tf) => { if (stage.focus === tf) stage.focus = null; },
  });
  overlay.style.pointerEvents = "none";
  // inputs dentro do overlay precisam receber clique
  const styleTag = document.createElement("style");
  styleTag.textContent = "input,textarea{pointer-events:auto}";
  overlay.appendChild(styleTag);

  // ---------------------------------------------------- loop
  let frameMs = 1000 / stage.$frameRate;
  stage.$onFrameRate = (fps) => { frameMs = 1000 / fps; };
  let acc = 0;
  let last = performance.now();
  const broadcast = (type: string) => {
    for (const t of [...broadcastTargets.get(type)!]) safe(() => t.dispatchEvent(new Event(type)), type);
  };
  const logicFrame = () => runLogicFrame(() => stage.$dispatchRender());
  const loop = (now: number) => {
    acc += now - last;
    last = now;
    if (acc > frameMs * 6) acc = frameMs * 6; // aba voltou do segundo plano: não tenta recuperar tudo
    let ran = false;
    while (acc >= frameMs) {
      acc -= frameMs;
      const t0 = performance.now();
      logicFrame();
      Stats.logic(performance.now() - t0);
      ran = true;
    }
    // loop nunca pode morrer: erro aqui congelaria a tela no último frame
    requestAnimationFrame(loop);
    const t1 = performance.now();
    safe(() => flushRenderQueue(), "flushRenderQueue");
    if (ran) safe(() => snapshot(app.stage), "interp");
    safe(() => InputOverlay.reposition(), "InputOverlay");
    // lógica a 25 fps, desenho na taxa do monitor misturando o quadro anterior com o atual (interp.ts)
    safe(() => applyInterp(app.stage, acc / frameMs), "interp");
    safe(() => app.renderer.render(app.stage), "render");
    restoreInterp();
    Stats.render(performance.now() - t1);
    Player.frames++;
  };
  app.ticker.stop();
  requestAnimationFrame(loop);
  startStats(host, () => { let n = 0; const c = (o: Container) => { n++; for (const k of o.children) c(k as Container); }; c(app.stage); return n; });

  // ---------------------------------------------------- mouse
  const toStage = (e: PointerEvent | WheelEvent): Point => {
    const r = canvas.getBoundingClientRect();
    return new Point(((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H);
  };
  let over: InteractiveObject | null = null;
  let downTarget: InteractiveObject | null = null;
  let lastClick = { t: 0, target: null as InteractiveObject | null };

  const mouseEvent = (type: string, target: InteractiveObject, p: Point, bubbles = true, related: any = null, delta = 0, e?: PointerEvent | WheelEvent) => {
    const local = target.globalToLocal(p);
    const ev = new MouseEvent(type, bubbles, false, local.x, local.y, related, !!e?.ctrlKey, !!e?.altKey, !!e?.shiftKey, MouseState.down, delta);
    ev.$stageX = p.x;
    ev.$stageY = p.y;
    safe(() => target.dispatchEvent(ev), `mouse ${type}`);
  };

  /** cadeia de InteractiveObjects do alvo até o palco */
  const chain = (o: DisplayObject | null): InteractiveObject[] => {
    const out: InteractiveObject[] = [];
    for (let p: any = o; p; p = p.$parent) if (p instanceof InteractiveObject) out.push(p);
    return out;
  };

  const updateOver = (target: InteractiveObject, p: Point, e: PointerEvent) => {
    if (target === over) return;
    const old = over;
    over = target;
    if (old) mouseEvent(MouseEvent.MOUSE_OUT, old, p, true, target, 0, e);
    // ROLL_OUT: quem estava na cadeia antiga e não está na nova
    const oldChain = chain(old), newChain = chain(target);
    for (const o of oldChain) if (!newChain.includes(o)) { mouseEvent(MouseEvent.ROLL_OUT, o, p, false, target, 0, e); buttonVisual(o, "up"); }
    mouseEvent(MouseEvent.MOUSE_OVER, target, p, true, old, 0, e);
    for (const o of [...newChain].reverse()) if (!oldChain.includes(o)) { mouseEvent(MouseEvent.ROLL_OVER, o, p, false, old, 0, e); buttonVisual(o, MouseState.down && downTarget === o ? "down" : "over"); }
  };

  const updateCursor = (target: InteractiveObject | null) => {
    let hand = false;
    for (const o of chain(target)) {
      if (o instanceof SimpleButton && o.$useHandCursor && o.$enabled) { hand = true; break; }
      if (o instanceof Sprite && o.$buttonMode && o.$useHandCursor) { hand = true; break; }
    }
    canvas.style.cursor = MouseState.hidden ? "none" : hand ? "pointer" : "default";
  };

  canvas.addEventListener("pointermove", (e) => {
    const p = toStage(e);
    Player.mouseX = p.x;
    Player.mouseY = p.y;
    Drag.move(p.x, p.y);
    const t = hitTarget(stage, p.x, p.y) ?? stage;
    updateOver(t, p, e);
    mouseEvent(MouseEvent.MOUSE_MOVE, t, p, true, null, 0, e);
    updateCursor(t);
    runPendingFrameScripts();
  });
  canvas.addEventListener("pointerdown", (e) => {
    unlockAudio();
    if (e.button !== 0) return;
    canvas.setPointerCapture(e.pointerId);
    MouseState.down = true;
    const p = toStage(e);
    Player.mouseX = p.x;
    Player.mouseY = p.y;
    const t = hitTarget(stage, p.x, p.y) ?? stage;
    downTarget = t;
    updateOver(t, p, e);
    // foco: TextField de input ganha; clicar em outra coisa tira o foco do campo
    if (t instanceof TextField && t.$type === "input") stage.focus = t;
    else if (stage.focus instanceof TextField) stage.focus = null;
    for (const o of chain(t)) buttonVisual(o, "down");
    mouseEvent(MouseEvent.MOUSE_DOWN, t, p, true, null, 0, e);
    runPendingFrameScripts();
    e.preventDefault();
  });
  canvas.addEventListener("pointerup", (e) => {
    if (e.button !== 0) return;
    MouseState.down = false;
    const p = toStage(e);
    const t = hitTarget(stage, p.x, p.y) ?? stage;
    for (const o of chain(t)) buttonVisual(o, "over");
    mouseEvent(MouseEvent.MOUSE_UP, t, p, true, null, 0, e);
    if (downTarget && t === downTarget) {
      if (DEBUG) debugClick(t, p.x, p.y);
      if (t instanceof TextField) { const l = t.globalToLocal(p); t.$onClick(l.x, l.y); }
      mouseEvent(MouseEvent.CLICK, t, p, true, null, 0, e);
      const now = performance.now();
      if (t.$doubleClickEnabled && lastClick.target === t && now - lastClick.t < 400) {
        mouseEvent(MouseEvent.DOUBLE_CLICK, t, p, true, null, 0, e);
        lastClick = { t: 0, target: null };
      } else lastClick = { t: now, target: t };
    }
    downTarget = null;
    runPendingFrameScripts();
  });
  canvas.addEventListener("pointerleave", () => {
    stage.dispatchEvent(new Event(Event.MOUSE_LEAVE));
  });
  canvas.addEventListener("wheel", (e) => {
    const p = toStage(e);
    const t = hitTarget(stage, p.x, p.y) ?? stage;
    mouseEvent(MouseEvent.MOUSE_WHEEL, t, p, true, null, e.deltaY > 0 ? -3 : 3, e);
    e.preventDefault();
  }, { passive: false });
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());

  // ---------------------------------------------------- teclado
  const keyTarget = () => (stage.focus && (stage.focus as DisplayObject).$stage ? stage.focus : stage);
  window.addEventListener("keydown", (e) => {
    if ((e.target as HTMLElement)?.tagName === "INPUT" || (e.target as HTMLElement)?.tagName === "TEXTAREA") return;
    unlockAudio();
    const ke = new KeyboardEvent(KeyboardEvent.KEY_DOWN, true, false, e.key.length === 1 ? e.key.charCodeAt(0) : 0, flashKeyCode(e), e.location, e.ctrlKey, e.altKey, e.shiftKey);
    safe(() => keyTarget().dispatchEvent(ke), "KEY_DOWN");
    runPendingFrameScripts();
    if (["Tab", " ", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Backspace"].includes(e.key)) e.preventDefault();
  });
  window.addEventListener("keyup", (e) => {
    if ((e.target as HTMLElement)?.tagName === "INPUT" || (e.target as HTMLElement)?.tagName === "TEXTAREA") return;
    const ke = new KeyboardEvent(KeyboardEvent.KEY_UP, true, false, e.key.length === 1 ? e.key.charCodeAt(0) : 0, flashKeyCode(e), e.location, e.ctrlKey, e.altKey, e.shiftKey);
    safe(() => keyTarget().dispatchEvent(ke), "KEY_UP");
  });
  window.addEventListener("blur", () => broadcast(Event.DEACTIVATE));
  window.addEventListener("focus", () => broadcast(Event.ACTIVATE));

  // ---------------------------------------------------- debug
  let outline = false;
  const outlineBox = document.createElement("div");
  Object.assign(outlineBox.style, { position: "absolute", border: "1px solid #ffb300", pointerEvents: "none", display: "none", zIndex: "20" });
  overlay.appendChild(outlineBox);
  debugAttachStage(stage, {
    under: () => hitTarget(stage, Player.mouseX, Player.mouseY),
    hit: (x: number, y: number) => hitTarget(stage, x, y),
    outline: (on) => { outline = on; outlineBox.style.display = on ? "block" : "none"; },
    logicFrames: () => Player.logicFrames,
  });
  if (DEBUG) {
    canvas.addEventListener("pointermove", () => {
      if (!outline) return;
      const t = hitTarget(stage, Player.mouseX, Player.mouseY);
      if (!t) return;
      const b = t.getBounds(stage);
      Object.assign(outlineBox.style, { left: `${scale.ox + b.x * scale.sx}px`, top: `${scale.oy + b.y * scale.sy}px`, width: `${b.width * scale.sx}px`, height: `${b.height * scale.sy}px` });
    });
  }
  dlog("info", `player iniciado ${W}x${H} @${stage.$frameRate}fps`);
  return stage;
}

/** estados visuais de botão (SimpleButton e MovieClip com buttonMode + rótulos _up/_over/_down) */
function buttonVisual(o: InteractiveObject, state: "up" | "over" | "down"): void {
  if (o instanceof SimpleButton) { o.$setMouseState(state); return; }
  if (o instanceof MovieClip && o.$buttonMode && o.$tl?.labels) {
    const lbl = `_${state}`;
    if (o.$tl.labels[lbl]) safe(() => o.gotoAndStop(lbl), "buttonMode");
  }
}

/**
 * Objeto que recebe o mouse no ponto (gx, gy), regras do Flash:
 * - de cima pra baixo; invisível/máscara não conta;
 * - `mouseEnabled = false`: o próprio não recebe e é "transparente"
 *   (o clique passa pra quem está embaixo), mas filhos interativos recebem;
 * - `mouseChildren = false`: qualquer acerto nos filhos vai pro container;
 * - forma não interativa (Shape/Bitmap) acertada → vai pro container pai.
 */
export function hitTarget(o: DisplayObject, gx: number, gy: number): InteractiveObject | null {
  if (!o.$visible || o.$maskOf) return null;
  if (o instanceof DisplayObjectContainer) {
    const c = o;
    if (c.$scrollRect || c.$mask) {
      if (!c.$hitGlobal(gx, gy, true)) return null;
    }
    const hitArea = (c as any).$hitArea as DisplayObject | null;
    if (hitArea) return hitArea.$hitGlobal(gx, gy, true) && c.$mouseEnabled ? c : null;
    if (!c.$mouseChildren) {
      if (c.$hitGlobal(gx, gy, true)) return c.$mouseEnabled ? c : null;
      return null;
    }
    // Desenho não interativo (Bitmap/Shape) por cima de um botão irmão: o clique
    // continua procurando um objeto interativo embaixo antes de ficar com o pai.
    // Ex.: brilho do botão de Tarefas (AddMovieEffect põe um Bitmap em cima dele).
    let decorHit = false;
    for (let i = c.$children.length - 1; i >= 0; i--) {
      const ch = c.$children[i]!;
      if (!ch.$visible || ch.$maskOf) continue;
      if (ch instanceof InteractiveObject) {
        const r = hitTarget(ch, gx, gy);
        if (r) return r;
      } else if (!decorHit && ch.$hitGlobal(gx, gy, true)) {
        decorHit = true;
      }
    }
    if (decorHit && c.$mouseEnabled && !(c instanceof Stage)) return c;
    const p = c.globalToLocal(new Point(gx, gy));
    if (c.$hitLocal(p.x, p.y, true) && c.$mouseEnabled && !(c instanceof Stage)) return c;
    return null;
  }
  if (o instanceof InteractiveObject) {
    if (!o.$mouseEnabled) return null;
    if (o instanceof TextField) {
      const p = o.globalToLocal(new Point(gx, gy));
      return o.$hitLocal(p.x, p.y, false) ? o : null;
    }
    return o.$hitGlobal(gx, gy, true) ? o : null;
  }
  return null;
}

/** keyCode do Flash ≈ keyCode legado do navegador */
function flashKeyCode(e: globalThis.KeyboardEvent): number {
  if (e.keyCode) return e.keyCode;
  const k = e.key;
  if (k.length === 1) return k.toUpperCase().charCodeAt(0);
  const map: Record<string, number> = { Enter: 13, Escape: 27, Backspace: 8, Tab: 9, " ": 32, ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40, Shift: 16, Control: 17, Alt: 18, Delete: 46 };
  return map[k] ?? 0;
}
