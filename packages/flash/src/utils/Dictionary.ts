/**
 * `flash.utils.Dictionary` — mapa com chave de qualquer tipo (inclusive objeto).
 *
 * Em JS `obj[chave]` transforma a chave em string, então o transpilador troca
 * `dict[k]` por `dict.get(k)` / `dict.set(k, v)` / `dict.delete(k)` sempre que
 * sabe que é Dictionary (ou subclasse, como `DictionaryData` do jogo).
 * Todas as entradas ficam no Map interno — campos de subclasses nunca se
 * misturam com as entradas.
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

  get(k: unknown): any { return this.$map.get(Dictionary.norm(k)); }
  set(k: unknown, v: unknown): void { this.$map.set(Dictionary.norm(k), v); }
  delete(k: unknown): boolean { return this.$map.delete(Dictionary.norm(k)); }
  has(k: unknown): boolean { return this.$map.has(Dictionary.norm(k)); }

  /** usado por `$in` */
  $has(k: unknown): boolean { return this.has(k); }
  /** `for (k in dict)` */
  $keysOf(): unknown[] { return [...this.$map.keys()]; }
  /** `for each (v in dict)` */
  $values(): unknown[] { return [...this.$map.values()]; }
  /** quantidade de entradas (não existe no Flash; útil pra debug) */
  get $size(): number { return this.$map.size; }

  toString(): string { return "[object Dictionary]"; }
}
$class(Dictionary, "flash.utils.Dictionary", { dynamic: true });
