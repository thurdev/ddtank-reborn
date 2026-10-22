/**
 * `flash.utils.Dictionary` — mapa com chave de qualquer tipo (inclusive objeto).
 *
 * Em JS `obj[chave]` transforma a chave em string, então o transpilador troca
 * `dict[k]` por `dict.get(k)` / `dict.set(k, v)` quando sabe que é Dictionary.
 * Quando o código acessa por variável sem tipo (`o[k]` com `o:*`), as chaves
 * string/número também ficam como propriedade própria, pra continuar
 * funcionando.
 */
import { $class } from "../as3";

export class Dictionary {
  declare $map: Map<unknown, unknown>;

  constructor(_weakKeys = false) {
    Object.defineProperty(this, "$map", { value: new Map(), enumerable: false });
  }

  /** chave numérica e string "3" são a mesma no AS3 */
  private static norm(k: unknown): unknown {
    return typeof k === "number" ? String(k) : k;
  }

  /** chave string que pode virar propriedade própria (não pode esconder método) */
  private static own(n: unknown): n is string {
    return typeof n === "string" && !(n in Dictionary.prototype) && n !== "$map";
  }

  get(k: unknown): any {
    const n = Dictionary.norm(k);
    if (Dictionary.own(n) && Object.prototype.hasOwnProperty.call(this, n)) return (this as any)[n];
    return this.$map.get(n);
  }

  set(k: unknown, v: unknown): void {
    const n = Dictionary.norm(k);
    if (Dictionary.own(n)) {
      (this as any)[n] = v;
      return;
    }
    this.$map.set(n, v);
  }

  delete(k: unknown): boolean {
    const n = Dictionary.norm(k);
    if (Dictionary.own(n)) {
      const had = Object.prototype.hasOwnProperty.call(this, n);
      delete (this as any)[n];
      return had;
    }
    return this.$map.delete(n);
  }

  has(k: unknown): boolean {
    const n = Dictionary.norm(k);
    if (Dictionary.own(n)) return Object.prototype.hasOwnProperty.call(this, n);
    return this.$map.has(n);
  }

  /** usado por `$in` */
  $has(k: unknown): boolean { return this.has(k); }

  /** `for (k in dict)` */
  $keysOf(): unknown[] { return [...Object.keys(this), ...this.$map.keys()]; }

  /** `for each (v in dict)` */
  $values(): unknown[] { return [...Object.keys(this).map((k) => (this as any)[k]), ...this.$map.values()]; }

  /** quantidade de entradas (não existe no Flash; útil pra debug) */
  get $size(): number { return Object.keys(this).length + this.$map.size; }

  toString(): string { return "[object Dictionary]"; }
}
$class(Dictionary, "flash.utils.Dictionary", { dynamic: true });
