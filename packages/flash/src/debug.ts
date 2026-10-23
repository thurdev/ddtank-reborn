/**
 * Modo debug do cliente — liga com `?debug=true` na URL do jogo.
 *
 * Com ele ligado, toda ação passa por aqui e aparece no console do navegador
 * (ou do launcher), dizendo ONDE está no código e QUAL arte foi usada:
 *
 *   [clique] Botão "okBtn" → com.pickgliss.ui.controls.BaseButton
 *            código: apps/client/src/game/com/pickgliss/ui/controls/BaseButton.ts
 *            AS3 original: vendor/DDTank41/Source Flash/src/com/pickgliss/ui/controls/BaseButton.as
 *            arte: ui/vietnam/swf/hall.swf  símbolo asset.hall.okBtn  → assets/ui/hall/123.png
 *            caminho: Stage > DDT > HallStateView > ... > okBtn
 *   [pacote ↑] 0x0040 GAME_ROOM_CREATE (12 bytes) ...
 *   [pacote ↓] 0x005B ... handler: ddt/manager/SocketManager.ts
 *   [load] ui/vietnam/swf/hall.swf → ok (34 símbolos)
 *
 * No console também fica `ddtDebug` com ferramentas:
 *   ddtDebug.under()        → o que está debaixo do mouse agora
 *   ddtDebug.find("okBtn")  → objetos com esse nome
 *   ddtDebug.only("click", "packet") / ddtDebug.all() → filtra categorias
 *   ddtDebug.outline(true)  → desenha a caixa do objeto sob o mouse
 *   ddtDebug.source(obj)    → arquivos de código/arte de um objeto
 */

export const DEBUG: boolean = (() => {
  try {
    const q = new URLSearchParams(globalThis.location?.search ?? "");
    return q.get("debug") === "true" || q.get("debug") === "1";
  } catch {
    return false;
  }
})();

export type DebugCategory = "click" | "mouse" | "key" | "packet" | "load" | "http" | "state" | "error" | "ui" | "sound" | "info";

const COLORS: Record<DebugCategory, string> = {
  click: "#ffb300", mouse: "#9e9e9e", key: "#80cbc4", packet: "#4fc3f7", load: "#aed581", http: "#81c784",
  state: "#ce93d8", error: "#ef5350", ui: "#ffd54f", sound: "#90a4ae", info: "#e0e0e0",
};

let enabled = new Set<DebugCategory>(["click", "key", "packet", "load", "http", "state", "error", "ui", "info"]);

/** onde o código-fonte gerado mora (relativo à raiz do repositório) */
export const GAME_SRC_ROOT = "apps/client/src/game/";
export const AS3_SRC_ROOT = "vendor/DDTank41/Source Flash/src/";

/** classe → fqn (preenchido por $class) */
const classNames = new WeakMap<Function, string>();
export function debugClassRegistered(fqn: string, cls: Function): void {
  if (DEBUG) classNames.set(cls, fqn);
}

/** informação de arte anexada pelos objetos criados a partir de SWF exportado */
export interface SymbolInfo {
  /** SWF original (ex.: `ui/vietnam/swf/hall.swf`) */
  swf: string;
  /** id do símbolo dentro do SWF */
  id: number;
  /** nome de linkage (classe AS3 do símbolo), se tiver */
  linkage?: string;
  /** arquivo PNG/JPG exportado, se for imagem */
  image?: string;
}

export interface SourceInfo {
  className: string;
  ts?: string;
  as3?: string;
  symbol?: SymbolInfo;
}

function fqnOf(obj: any): string | undefined {
  for (let c = obj?.constructor; c && c !== Object; c = Object.getPrototypeOf(c)) {
    const n = classNames.get(c) ?? (Object.hasOwn(c, "$fqn") ? c.$fqn : undefined);
    if (n) return n;
  }
  return obj?.constructor?.name;
}

/** fqn → arquivos (gerado e original), se for classe do jogo */
export function filesOf(fqn: string): { ts?: string; as3?: string } {
  if (!fqn || fqn.startsWith("flash.") || !fqn.includes(".") && !/^[A-Z]/.test(fqn)) return {};
  const path = fqn.replace(/\./g, "/");
  return { ts: `${GAME_SRC_ROOT}${path}.ts`, as3: `${AS3_SRC_ROOT}${path}.as` };
}

/** classe do jogo mais próxima na hierarquia (pula as do Flash) */
function gameClassOf(obj: any): string | undefined {
  for (let c = obj?.constructor; c && c !== Object; c = Object.getPrototypeOf(c)) {
    const n = Object.hasOwn(c, "$fqn") ? (c.$fqn as string) : undefined;
    if (n && !n.startsWith("flash.")) return n;
  }
  return undefined;
}

export function sourceOf(obj: any): SourceInfo {
  const className = fqnOf(obj) ?? "?";
  const game = gameClassOf(obj);
  return { className, ...(game ? filesOf(game) : {}), symbol: obj?.$symbol };
}

function displayPath(obj: any): string {
  const parts: string[] = [];
  for (let o = obj; o; o = o.parent) {
    const cls = (fqnOf(o) ?? "?").split(".").pop();
    parts.unshift(o.name && !/^instance\d+$/.test(o.name) ? `${o.name}:${cls}` : String(cls));
    if (parts.length > 14) { parts.unshift("…"); break; }
  }
  return parts.join(" > ");
}

/** artes (símbolos de SWF) usadas dentro de um objeto, até `max` */
function symbolsInside(obj: any, max = 6): SymbolInfo[] {
  const out: SymbolInfo[] = [];
  const walk = (o: any, depth: number) => {
    if (!o || out.length >= max || depth > 6) return;
    if (o.$symbol) out.push(o.$symbol);
    const n = typeof o.numChildren === "number" ? o.numChildren : 0;
    for (let i = 0; i < n && out.length < max; i++) walk(o.getChildAt(i), depth + 1);
  };
  walk(obj, 0);
  return out;
}

function fmtSymbol(s: SymbolInfo): string {
  return `${s.swf} #${s.id}${s.linkage ? ` (${s.linkage})` : ""}${s.image ? ` → ${s.image}` : ""}`;
}

export function dlog(cat: DebugCategory, title: string, ...details: unknown[]): void {
  if (!DEBUG || !enabled.has(cat)) return;
  const style = `color:${COLORS[cat]};font-weight:bold`;
  if (!details.length) { console.log(`%c[${cat}]%c ${title}`, style, ""); return; }
  console.groupCollapsed(`%c[${cat}]%c ${title}`, style, "");
  for (const d of details) console.log(d);
  console.groupEnd();
}

/** chamado pelo gerenciador de mouse em todo clique */
export function debugClick(target: any, stageX: number, stageY: number): void {
  if (!DEBUG || !enabled.has("click")) return;
  const src = sourceOf(target);
  const lines = [
    `classe: ${src.className}`,
    src.ts ? `código: ${src.ts}` : "",
    src.as3 ? `AS3 original: ${src.as3}` : "",
    ...symbolsInside(target).map((s) => `arte: ${fmtSymbol(s)}`),
    `caminho: ${displayPath(target)}`,
    `posição: (${Math.round(stageX)}, ${Math.round(stageY)})`,
  ].filter(Boolean);
  const label = target?.name && !/^instance\d+$/.test(target.name) ? `"${target.name}"` : src.className.split(".").pop();
  dlog("click", `${label} → ${src.className}`, lines.join("\n"), target);
}

export function debugPacket(dir: "in" | "out", code: number, name: string, size: number, extra?: unknown): void {
  if (!DEBUG || !enabled.has("packet")) return;
  const arrow = dir === "out" ? "↑ enviado" : "↓ recebido";
  dlog("packet", `${arrow} ${code} (0x${code.toString(16).padStart(4, "0")}) ${name} — ${size} bytes`, ...(extra ? [extra] : []));
}

// ------------------------------------------------------------------ ferramentas no console
interface DebugTools {
  under(): unknown;
  find(name: string): unknown[];
  only(...cats: DebugCategory[]): void;
  all(): void;
  outline(on: boolean): void;
  source(obj: unknown): SourceInfo;
  stage?: unknown;
}

let outlineHook: ((on: boolean) => void) | undefined;
let underHook: (() => unknown) | undefined;
let stageRef: any;

/** o Stage se registra aqui pra `ddtDebug` funcionar */
export function debugAttachStage(stage: any, hooks: { under: () => unknown; outline: (on: boolean) => void }): void {
  stageRef = stage;
  underHook = hooks.under;
  outlineHook = hooks.outline;
}

if (DEBUG && typeof globalThis !== "undefined") {
  const tools: DebugTools = {
    under: () => {
      const o = underHook?.();
      if (o) { const s = sourceOf(o); console.log(displayPath(o), s, symbolsInside(o)); }
      return o;
    },
    find: (name: string) => {
      const out: unknown[] = [];
      const walk = (o: any) => {
        if (!o) return;
        if (o.name === name) out.push(o);
        const n = typeof o.numChildren === "number" ? o.numChildren : 0;
        for (let i = 0; i < n; i++) walk(o.getChildAt(i));
      };
      walk(stageRef);
      return out;
    },
    only: (...cats: DebugCategory[]) => { enabled = new Set(cats); },
    all: () => { enabled = new Set(Object.keys(COLORS) as DebugCategory[]); },
    outline: (on: boolean) => outlineHook?.(on),
    source: (obj: unknown) => sourceOf(obj),
    get stage() { return stageRef; },
  };
  (globalThis as any).ddtDebug = tools;
  console.log("%c[debug] modo debug ligado — digite ddtDebug no console pra ver as ferramentas", "color:#ffb300;font-weight:bold");
}

// ------------------------------------------------------------------ pacotes do jogo
const nameTables = new Map<string, Map<number, string>>();
/** constantes numéricas de uma classe do jogo → nome (1º nome vence) */
function constName(fqn: string, value: number): string | undefined {
  let t = nameTables.get(fqn);
  if (!t) {
    t = new Map();
    const reg = (globalThis as any).$ddtClass?.(fqn);
    if (reg) for (const k of Object.getOwnPropertyNames(reg)) { const v = reg[k]; if (typeof v === "number" && k !== "length" && !t.has(v)) t.set(v, k); }
    if (reg) nameTables.set(fqn, t);
  }
  return t.get(value);
}

/** nome do pacote pelo código (constantes de ddt.data.socket.ePackageType) */
export function packetName(code: number): string {
  return constName("ddt.data.socket.ePackageType", code) ?? "?";
}

/**
 * Pacotes "guarda-chuva" levam o subtipo no 1º byte do corpo (depois do
 * cabeçalho de 20 bytes): GAME_ROOM (94) → GameRoomPackageType, GAME_CMD (91)
 * → CrazyTankPackageType. Mostra "GAME_CMD/START_GAME" no log.
 */
const SUB_TABLES: Record<number, string> = {
  94: "ddt.data.socket.GameRoomPackageType",
  91: "ddt.data.socket.CrazyTankPackageType",
  81: "ddt.data.socket.FarmPackageType",
};
function subName(code: number, pkg: any): string {
  const fqn = SUB_TABLES[code];
  if (!fqn || typeof pkg?.$bytes !== "function") return "";
  const b: Uint8Array = pkg.$bytes();
  if (b.length <= 20) return "";
  return `/${constName(fqn, b[20]!) ?? b[20]}`;
}

/** ByteSocket do jogo chama em todo pacote enviado/recebido (só loga com ?debug=true) */
export function debugGamePacket(dir: "in" | "out", code: number, size: number, pkg?: unknown): void {
  if (!DEBUG || !enabled.has("packet")) return;
  debugPacket(dir, code, packetName(code) + subName(code, pkg), size, pkg);
}
