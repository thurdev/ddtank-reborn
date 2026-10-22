/**
 * `flash.external.ExternalInterface` — chamadas pro JavaScript da página.
 * Agora o jogo já é JS: `call("x", ...)` chama `window.x(...)` se existir;
 * `addCallback("x", f)` publica `window.x = f`.
 */
import { $class } from "../as3";
import { dlog } from "../debug";

export class ExternalInterface {
  static marshallExceptions = false;
  static get available(): boolean { return typeof window !== "undefined"; }
  static get objectID(): string { return "ddtank"; }
  static call(name: string, ...args: any[]): any {
    dlog("info", `ExternalInterface.call(${name})`, args);
    const fn = name.split(".").reduce<any>((o, k) => (o == null ? undefined : o[k]), globalThis as any);
    if (typeof fn !== "function") return null;
    try { return fn(...args); } catch (e) { dlog("error", `ExternalInterface ${name}: ${(e as Error).message}`); return null; }
  }
  static addCallback(name: string, fn: Function | null): void {
    (globalThis as any)[name] = fn ? (...a: any[]) => fn(...a) : undefined;
  }
}
$class(ExternalInterface, "flash.external.ExternalInterface");
