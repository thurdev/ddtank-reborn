/**
 * `flash.external.ExternalInterface` — chamadas pro JavaScript da página.
 *
 * Agora o jogo já é JS:
 * - `call("x", ...)` chama `window.x(...)` (aceita `"a.b.c"`);
 * - `call("function f(){...}", ...)` avalia o código e chama (o Flash fazia
 *   isso; o jogo usa pra redirecionar: `function redict(){top.location.href=...}`);
 * - se o cliente roda num `<iframe>` do site e a função não existe aqui, procura
 *   na página pai (mesma origem) ou manda `postMessage({ type: "ddt-external",
 *   name, args })` pra ela tratar (ex.: `game_interruption` quando cai a conexão).
 * - `addCallback("x", f)` publica `window.x = f`.
 */
import { $class } from "../as3";
import { dlog } from "../debug";

const lookup = (root: any, name: string): any => name.split(".").reduce<any>((o, k) => (o == null ? undefined : o[k]), root);

/** página pai, se for da mesma origem (senão acessar dá SecurityError) */
function sameOriginParent(): any {
  try {
    if (typeof window === "undefined" || window.parent === window) return null;
    void window.parent.document;
    return window.parent;
  } catch {
    return null;
  }
}

export class ExternalInterface {
  static marshallExceptions = false;
  static get available(): boolean { return typeof window !== "undefined"; }
  static get objectID(): string { return "ddtank"; }

  static call(name: string, ...args: any[]): any {
    dlog("info", `ExternalInterface.call(${name.length > 80 ? name.slice(0, 80) + "…" : name})`, args);
    try {
      if (/^\s*function\b/.test(name)) {
        // o Flash aceitava o código de uma função no lugar do nome
        const f = (0, eval)(`(${name})`);
        return f(...args);
      }
      let fn = lookup(globalThis, name);
      let self: any = globalThis;
      if (typeof fn !== "function") {
        const parent = sameOriginParent();
        if (parent) { fn = lookup(parent, name); self = parent; }
      }
      if (typeof fn === "function") return fn.apply(self, args);
      if (typeof window !== "undefined" && window.parent !== window) {
        window.parent.postMessage({ type: "ddt-external", name, args: JSON.parse(JSON.stringify(args ?? [])) }, "*");
      }
      return null;
    } catch (e) {
      dlog("error", `ExternalInterface ${name.slice(0, 60)}: ${(e as Error).message}`);
      return null;
    }
  }

  static addCallback(name: string, fn: Function | null): void {
    (globalThis as any)[name] = fn ? (...a: any[]) => fn(...a) : undefined;
  }
}
$class(ExternalInterface, "flash.external.ExternalInterface");
