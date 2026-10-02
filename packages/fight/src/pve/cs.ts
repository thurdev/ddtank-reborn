/**
 * Minimal C# runtime for the transpiled donor scripts (packages/fight/scripts/transpile-pve.ts): List<T>, Dictionary,
 * System.Math, System.Random, Point, int casts, string.Format, LanguageMgr. Deterministic: `new Random()` inside a
 * script draws its seed from the current game's RNG (see `setScriptRng`).
 */
import type { Rng } from "../math/random.js";
import { DotNetRandom } from "../math/random.js";

/** System.Collections.Generic.List<T> / T[] (both Count and Length work). */
export class CsList<T> extends Array<T> {
  static from2<T>(a: Iterable<T> | ArrayLike<T>): CsList<T> {
    const l = new CsList<T>();
    for (const v of Array.from(a)) l.push(v);
    return l;
  }
  get Count(): number {
    return this.length;
  }
  get Length(): number {
    return this.length;
  }
  Add(v: T): void {
    this.push(v);
  }
  AddRange(v: Iterable<T>): void {
    for (const x of v) this.push(x);
  }
  Remove(v: T): boolean {
    const i = this.indexOf(v);
    if (i < 0) return false;
    this.splice(i, 1);
    return true;
  }
  RemoveAt(i: number): void {
    this.splice(i, 1);
  }
  RemoveAll(pred: (v: T) => boolean): number {
    let n = 0;
    for (let i = this.length - 1; i >= 0; i--) if (pred(this[i]!)) (this.splice(i, 1), n++);
    return n;
  }
  Insert(i: number, v: T): void {
    this.splice(i, 0, v);
  }
  Contains(v: T): boolean {
    return this.includes(v);
  }
  IndexOf(v: T): number {
    return this.indexOf(v);
  }
  Clear(): void {
    this.length = 0;
  }
  ToArray(): CsList<T> {
    return CsList.from2(this);
  }
  ToList(): CsList<T> {
    return CsList.from2(this);
  }
  Find(pred: (v: T) => boolean): T | null {
    return this.find(pred) ?? null;
  }
  FindAll(pred: (v: T) => boolean): CsList<T> {
    return CsList.from2(this.filter(pred));
  }
  Exists(pred: (v: T) => boolean): boolean {
    return this.some(pred);
  }
  ElementAt(i: number): T {
    return this[i]!;
  }
  First(): T {
    return this[0]!;
  }
  Last(): T {
    return this[this.length - 1]!;
  }
  Reverse2(): void {
    this.reverse();
  }
}

/** `{1, 2}` / `new int[] {..}` → CsList */
export function __arr<T>(a: T[]): CsList<T> {
  return CsList.from2(a);
}
/** `new T[n]` */
export function __newArr<T>(n: number, fill: T): CsList<T> {
  return CsList.from2(new Array(Math.max(0, n | 0)).fill(fill));
}

export class CsDictionary<K, V> extends Map<K, V> {
  get Count(): number {
    return this.size;
  }
  Add(k: K, v: V): void {
    if (this.has(k)) throw new Error("duplicate key");
    this.set(k, v);
  }
  ContainsKey(k: K): boolean {
    return this.has(k);
  }
  ContainsValue(v: V): boolean {
    return [...this.values()].includes(v);
  }
  Remove(k: K): boolean {
    return this.delete(k);
  }
  Clear(): void {
    this.clear();
  }
  get Keys(): CsList<K> {
    return CsList.from2(this.keys());
  }
  get Values(): CsList<V> {
    return CsList.from2(this.values());
  }
  /** indexer get (transpiler emits `.Item(k)` only when it can tell) */
  Item(k: K): V {
    return this.get(k) as V;
  }
}

/** System.Drawing.Point */
export class Point {
  constructor(public X = 0, public Y = 0) {}
  static get Empty(): Point {
    return new Point(0, 0);
  }
  get x(): number {
    return this.X;
  }
  get y(): number {
    return this.Y;
  }
  get IsEmpty(): boolean {
    return this.X === 0 && this.Y === 0;
  }
}
export class Rectangle {
  constructor(public X = 0, public Y = 0, public Width = 0, public Height = 0) {}
}

/** C# (int) cast: truncation toward zero, NaN → 0 */
export function __int(v: unknown): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.trunc(n) | 0;
}

export const CsMath = {
  Abs: Math.abs,
  Max: Math.max,
  Min: Math.min,
  Sqrt: Math.sqrt,
  Pow: Math.pow,
  Floor: Math.floor,
  Ceiling: Math.ceil,
  Sin: Math.sin,
  Cos: Math.cos,
  Tan: Math.tan,
  Atan: Math.atan,
  Atan2: Math.atan2,
  Log: Math.log,
  Exp: Math.exp,
  Sign: Math.sign,
  Truncate: Math.trunc,
  PI: Math.PI,
  /** banker's rounding like Math.Round(double) */
  Round(v: number, digits?: number): number {
    const k = digits ? 10 ** digits : 1;
    const x = v * k;
    const r = Math.round(x);
    const res = Math.abs(x % 1) === 0.5 ? (r % 2 === 0 ? r : r - 1) : r;
    return res / k;
  },
};

let scriptRng: Rng | null = null;
/** the engine sets the RNG of the game whose script code is running (keeps `new Random()` deterministic) */
export function setScriptRng(r: Rng | null): void {
  scriptRng = r;
}

/** System.Random (seeded from the running game's RNG). */
export class CsRandom {
  private r: DotNetRandom;
  constructor(seed?: number) {
    this.r = new DotNetRandom(seed ?? (scriptRng ? scriptRng.nextMax(0x7fffffff) : 12345));
  }
  Next(a?: number, b?: number): number {
    return rngNext(this.r, a, b);
  }
  NextDouble(): number {
    return this.r.nextDouble();
  }
}

/** Random.Next() / Next(max) / Next(min, max) with C# argument checks relaxed (max < min → min). */
export function rngNext(r: Rng, a?: number, b?: number): number {
  if (a === undefined) return r.next();
  if (b === undefined) return a <= 0 ? 0 : r.nextMax(a | 0);
  a = a | 0;
  b = b | 0;
  if (b <= a) return a;
  return r.nextRange(a, b);
}

/** string.Format("{0} x {1}", a, b) */
export function __fmt(f: string, ...args: unknown[]): string {
  return String(f).replace(/\{(\d+)(?::[^}]*)?\}/g, (_m, i) => String(args[Number(i)] ?? ""));
}

let translator: (key: string, args: unknown[]) => string = (k) => k;
/** server installs Language-*.txt lookup (GameServerScript.* keys) */
export function setTranslator(t: (key: string, args: unknown[]) => string): void {
  translator = t;
}
/** Translated text resolved lazily: donor scripts build their chat tables in static initialisers, i.e. at import
 *  time, before the server installed the Language-*.txt translator. String(x) / concatenation translate on use. */
export class LazyText {
  constructor(readonly key: string, readonly args: unknown[]) {}
  toString(): string {
    try {
      return translator(this.key, this.args);
    } catch {
      return this.key;
    }
  }
  valueOf(): string {
    return this.toString();
  }
  get length(): number {
    return this.toString().length;
  }
}
export const LanguageMgr = {
  GetTranslation(key: string, ...args: unknown[]): string {
    return new LazyText(key, args) as unknown as string;
  },
};

export const Console = { WriteLine: (..._a: unknown[]) => {}, Write: (..._a: unknown[]) => {} };

export class NotImplementedException extends Error {}
export class Exception extends Error {}

/** `x is T` */
export function __is(v: unknown, T: unknown): boolean {
  return typeof T === "function" && v instanceof (T as new (...a: never[]) => unknown);
}
/** `x as T` */
export function __as<T>(v: unknown, T: unknown): T | null {
  return __is(v, T) ? (v as T) : null;
}
