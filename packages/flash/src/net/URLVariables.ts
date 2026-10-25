/**
 * `flash.net.URLVariables` — variáveis de query (`v.username = "x"`),
 * vira `a=1&b=2` no `toString()`.
 */
import { $class } from "../as3";

export class URLVariables {
  // `dynamic class` no AS3: cada par chave/valor vira propriedade direta
  // (`v.username`, `v.key`...). Essa assinatura só avisa o tsc.
  [name: string]: any;

  constructor(source: string | null = null) {
    if (source) this.decode(source);
  }

  decode(source: string): void {
    for (const part of String(source).split("&")) {
      if (!part) continue;
      const i = part.indexOf("=");
      if (i < 0) throw Object.assign(new Error("Error #2101: The String passed to URLVariables.decode() must be a URL-encoded query string containing name/value pairs."), { name: "Error" });
      const k = decodeURIComponent(part.slice(0, i).replace(/\+/g, " "));
      const v = decodeURIComponent(part.slice(i + 1).replace(/\+/g, " "));
      const cur = (this as any)[k];
      if (cur === undefined) (this as any)[k] = v;
      else if (Array.isArray(cur)) cur.push(v);
      else (this as any)[k] = [cur, v];
    }
  }

  toString(): string {
    const out: string[] = [];
    for (const k of Object.keys(this)) {
      const v = (this as any)[k];
      if (typeof v === "function") continue;
      const vals = Array.isArray(v) ? v : [v];
      for (const x of vals) out.push(`${escapeFlash(k)}=${escapeFlash(String(x))}`);
    }
    return out.join("&");
  }
}
$class(URLVariables, "flash.net.URLVariables", { dynamic: true });

/** `escape` do Flash (encodeURIComponent, mas mantém alguns caracteres) */
export function escapeFlash(s: string): string {
  return encodeURIComponent(s).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
}
