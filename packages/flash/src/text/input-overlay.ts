/**
 * Digitação: quando um TextField de input ganha foco, um `<input>` (ou
 * `<textarea>` se multiline) de verdade é colocado por cima do canvas, na
 * mesma posição/fonte/cor. O que for digitado volta pro TextField
 * (`$userInput`), e as teclas viram KeyboardEvent do Flash no campo (Enter pra
 * mandar chat etc. funciona igual).
 *
 * O Player informa como converter coordenadas do palco pra tela (`setHost`).
 */
import { dlog } from "../debug";
import { Point } from "../geom/Point";
import { KeyboardEvent } from "../events/KeyboardEvent";
import { cssFont, type TextField } from "./TextField";

export interface InputHost {
  /** elemento que recebe os inputs (por cima do canvas) */
  container: HTMLElement;
  /** escala atual palco → tela (canvas pode estar esticado) */
  scale(): { sx: number; sy: number; ox: number; oy: number };
  /** devolve o foco pro palco (Stage.focus = null) */
  blur(tf: TextField): void;
}

let host: InputHost | null = null;
let active: { tf: TextField; el: HTMLInputElement | HTMLTextAreaElement } | null = null;

export const InputOverlay = {
  setHost(h: InputHost): void { host = h; },

  open(tf: TextField): void {
    if (!host || typeof document === "undefined") return;
    InputOverlay.close(active?.tf ?? null);
    const el = document.createElement(tf.$multiline ? "textarea" : "input") as HTMLInputElement | HTMLTextAreaElement;
    if (el instanceof HTMLInputElement) el.type = tf.$password ? "password" : "text";
    el.value = tf.text.replace(/\r/g, "\n");
    if (tf.$maxChars > 0) el.maxLength = tf.$maxChars;
    el.spellcheck = false;
    el.autocomplete = "off";
    const f = tf.$runs[0]?.fmt ?? tf.$defaultFormat;
    Object.assign(el.style, {
      position: "absolute", margin: "0", padding: "1px 2px", border: "none", outline: "none", background: "transparent",
      resize: "none", overflow: "hidden", boxSizing: "border-box", transformOrigin: "0 0", zIndex: "10",
      font: cssFont(f), color: "#" + ((f.color ?? 0) >>> 0 & 0xffffff).toString(16).padStart(6, "0"),
      textAlign: f.align ?? "left", lineHeight: "normal",
    } as CSSStyleDeclaration);
    el.addEventListener("input", () => tf.$userInput(el.value));
    el.addEventListener("keydown", (e) => {
      e.stopPropagation();
      const ke = e as globalThis.KeyboardEvent;
      tf.dispatchEvent(new KeyboardEvent("keyDown", true, false, ke.key.length === 1 ? ke.key.charCodeAt(0) : 0, ke.keyCode, 0, ke.ctrlKey, ke.altKey, ke.shiftKey));
      if (ke.key === "Tab") { e.preventDefault(); host?.blur(tf); }
    });
    el.addEventListener("keyup", (e) => {
      e.stopPropagation();
      const ke = e as globalThis.KeyboardEvent;
      tf.dispatchEvent(new KeyboardEvent("keyUp", true, false, ke.key.length === 1 ? ke.key.charCodeAt(0) : 0, ke.keyCode, 0, ke.ctrlKey, ke.altKey, ke.shiftKey));
    });
    el.addEventListener("blur", () => { if (active?.el === el) host?.blur(tf); });
    host.container.appendChild(el);
    active = { tf, el };
    InputOverlay.reposition();
    el.focus();
    dlog("ui", `digitando em TextField "${tf.name}"`);
  },

  close(tf: TextField | null): void {
    if (!active || (tf && active.tf !== tf)) return;
    const { el } = active;
    active = null;
    el.remove();
  },

  setSelection(tf: TextField, b: number, e: number): void {
    if (active?.tf === tf) try { active.el.setSelectionRange(b, e); } catch { /* ok */ }
  },

  /** acompanha o campo (chamado todo frame pelo Player) */
  reposition(): void {
    if (!active || !host) return;
    const { tf, el } = active;
    if (!tf.$stage) { host.blur(tf); return; }
    const s = host.scale();
    const p = tf.localToGlobal(new Point(tf.$offX, tf.$offY));
    const m = tf.$concatMatrix();
    const sx = Math.hypot(m.a, m.b), sy = Math.hypot(m.c, m.d);
    el.style.left = `${s.ox + p.x * s.sx}px`;
    el.style.top = `${s.oy + p.y * s.sy}px`;
    el.style.width = `${tf.$w}px`;
    el.style.height = `${tf.$h}px`;
    el.style.transform = `scale(${sx * s.sx}, ${sy * s.sy})`;
  },
};
