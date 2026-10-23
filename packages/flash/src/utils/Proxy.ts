/**
 * `flash.utils.Proxy` — objeto dinâmico com getProperty/setProperty/callProperty.
 * Implementado com Proxy do JS: subclasses sobrescrevem os métodos
 * `getProperty`, `setProperty`, `callProperty`, `hasProperty`, `deleteProperty`.
 */
import { $class } from "../as3";

export class Proxy {
  constructor() {
    const self = this;
    return new globalThis.Proxy(this, {
      get(t, p, r) {
        if (typeof p !== "string" || p in t) return Reflect.get(t, p, r);
        const v = (self as any).getProperty?.(p);
        if (v === undefined && typeof (self as any).callProperty === "function") return (...a: any[]) => (self as any).callProperty(p, ...a);
        return v;
      },
      set(t, p, v, r) {
        if (typeof p !== "string" || p in t) return Reflect.set(t, p, v, r);
        (self as any).setProperty?.(p, v);
        return true;
      },
      has(t, p) { return typeof p === "string" && !(p in t) ? !!(self as any).hasProperty?.(p) : Reflect.has(t, p); },
      deleteProperty(t, p) { return typeof p === "string" && !(p in t) ? !!(self as any).deleteProperty?.(p) : Reflect.deleteProperty(t, p); },
    });
  }
}
$class(Proxy, "flash.utils.Proxy");
