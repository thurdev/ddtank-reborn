/**
 * Runtime da linguagem AS3 pro código transpilado (`apps/client/src/game`).
 *
 * Tudo que o AS3 faz e o JS não faz igual mora aqui. O transpilador
 * (tools/as3-to-ts) gera chamadas pra estas funções — ver a tabela em
 * `tools/as3-to-ts/src/emit.ts` e `docs/client-pixi/TRANSPILADOR.md`.
 */
import { debugClassRegistered } from "./debug";
import { NATIVE_DESCRIBE } from "./gen/native-describe";
import { $toXML, $toXMLList, isXMLName, Namespace, QName, XML, XMLList } from "./xml";

export { $toXML, $toXMLList, isXMLName, Namespace, QName, XML, XMLList };

// ------------------------------------------------------------------ registro de classes
/** fqn AS3 (`ddt.manager.SocketManager`) → classe/interface */
const registry = new Map<string, any>();

export interface ClassOptions {
  implements?: AS3Interface[];
  /** inicializadores de campo de instância desta classe (rodam antes de qualquer construtor) */
  fields?: (this: any) => void;
  dynamic?: boolean;
  /** membros públicos pro describeType: "v:nome:Tipo;a:nome:Tipo:readwrite;..." */
  describe?: string;
}

export interface AS3Interface {
  readonly $fqn: string;
  readonly $supers: AS3Interface[];
  readonly $isInterface: true;
}

/**
 * Registra uma classe gerada: nome AS3 (pra getDefinitionByName,
 * getQualifiedClassName, debug), interfaces (pra `is`/`as`) e
 * inicializadores de campo.
 */
export function $class(cls: any, fqn: string, opts: ClassOptions = {}): void {
  Object.defineProperty(cls, "$fqn", { value: fqn, enumerable: false, configurable: true });
  Object.defineProperty(cls, "$interfaces", { value: opts.implements ?? [], enumerable: false, configurable: true });
  if (opts.fields) Object.defineProperty(cls, "$iinit", { value: opts.fields, enumerable: false, configurable: true });
  if (opts.describe) Object.defineProperty(cls, "$describe", { value: opts.describe, enumerable: false, configurable: true });
  if (opts.dynamic) Object.defineProperty(cls, "$dynamic", { value: true, enumerable: false, configurable: true });
  registry.set(fqn, cls);
  debugClassRegistered(fqn, cls);
}

export function $interface(fqn: string, supers: AS3Interface[] = []): AS3Interface {
  const i: AS3Interface = { $fqn: fqn, $supers: supers, $isInterface: true };
  registry.set(fqn, i);
  return i;
}

/** classe/interface pelo nome AS3 (com `.` ou `::`) */
export function $cls<T = any>(fqn: string): T {
  const c = registry.get(fqn.replace("::", "."));
  if (!c) throw new ReferenceError(`Error #1065: Variable ${fqn} is not defined.`);
  return c;
}

export function $tryCls(fqn: string): any {
  return fqn ? registry.get(String(fqn).replace("::", ".")) : undefined;
}

// debug.ts acha classes por nome sem importar este módulo (evita ciclo)
(globalThis as any).$ddtClass = $tryCls;

/** registra classes vindas de SWF de assets (linkage) em tempo de execução */
export function $registerDynamic(fqn: string, cls: any): void {
  Object.defineProperty(cls, "$fqn", { value: fqn, enumerable: false, configurable: true });
  registry.set(fqn, cls);
}

export function $allClassNames(): string[] {
  return [...registry.keys()];
}

// ------------------------------------------------------------------ init de campos
const iinitChains = new WeakMap<Function, Function[]>();

/**
 * Roda os inicializadores de campo de toda a hierarquia (da classe mais alta
 * pra mais baixa). Chamado uma vez, no construtor da primeira classe do jogo
 * da hierarquia, logo depois do `super()` da classe do Flash. Assim os campos
 * da filha já existem quando o construtor da mãe chama métodos sobrescritos —
 * igual ao AS3 (em JS puro os campos da filha só existiriam depois).
 */
export function $init(obj: any): void {
  const ctor = obj.constructor as Function;
  let chain = iinitChains.get(ctor);
  if (!chain) {
    chain = [];
    for (let c: any = ctor; c && c !== Object && c !== Function.prototype; c = Object.getPrototypeOf(c)) {
      if (Object.hasOwn(c, "$iinit")) chain.unshift(c.$iinit);
    }
    iinitChains.set(ctor, chain);
  }
  for (const f of chain) f.call(obj);
}

// ------------------------------------------------------------------ closures de método
const boundCache = new WeakMap<object, Map<string, Function>>();

/**
 * Closure de método do AS3: `addEventListener(E, onX)` passa o método já
 * ligado ao objeto, e duas referências ao mesmo método são `==`. O cache
 * garante a mesma função (senão `removeEventListener` não acharia).
 */
export function $m(obj: any, name: string): any {
  if (obj == null) throw new TypeError(`Error #1009: Cannot access a property or method of a null object reference (${name}).`);
  const f = obj[name];
  if (typeof f !== "function") return f;
  let m = boundCache.get(obj);
  if (!m) { m = new Map(); boundCache.set(obj, m); }
  let b = m.get(name);
  if (!b || (b as any).$orig !== f) {
    b = f.bind(obj);
    Object.defineProperty(b, "$orig", { value: f });
    Object.defineProperty(b, "$owner", { value: obj });
    Object.defineProperty(b, "$name", { value: name });
    m.set(name, b!);
  }
  return b;
}

// ------------------------------------------------------------------ estáticos preguiçosos
/**
 * Estáticos com inicializador não-constante (`static var x = Outra.coisa()`).
 * No AS3 a classe só é inicializada quando é usada pela 1ª vez; aqui a 1ª
 * leitura/escrita de qualquer um desses nomes roda `init` (uma vez, na ordem
 * do fonte) e daí em diante viram propriedades normais.
 */
export function $statics(cls: any, names: string[], init: () => void): void {
  let state = 0; // 0 = não iniciado, 1 = iniciando, 2 = pronto
  const store: Record<string, unknown> = Object.create(null);
  const run = () => {
    if (state !== 0) return;
    state = 1;
    try {
      init();
    } finally {
      state = 2;
      // troca os acessores por valores comuns (mais rápido daqui pra frente)
      for (const n of names) Object.defineProperty(cls, n, { value: store[n], writable: true, enumerable: true, configurable: true });
    }
  };
  for (const n of names) {
    Object.defineProperty(cls, n, {
      get() { run(); return state === 2 ? cls[n] : store[n]; },
      set(v) { if (state === 2) Object.defineProperty(cls, n, { value: v, writable: true, enumerable: true, configurable: true }); else { if (state === 0) run(); store[n] = v; if (state === 2) cls[n] = v; } },
      enumerable: true,
      configurable: true,
    });
  }
}

// ------------------------------------------------------------------ late (ciclos)
const lateFns: (() => void)[] = [];
let lateDone = false;
/** referência a classe resolvida depois que todos os módulos carregam (ver cycles.ts) */
export function $late(f: () => void): void {
  if (lateDone) f();
  else lateFns.push(f);
}
export function $runLate(): void {
  lateDone = true;
  for (const f of lateFns.splice(0)) f();
}

// ------------------------------------------------------------------ int / uint
export interface IntFn {
  (v: unknown): number;
  readonly MAX_VALUE: number;
  readonly MIN_VALUE: number;
}
/** `int(x)` do AS3: ToInt32 (trunca, NaN→0, estoura igual) */
export const int: IntFn = Object.assign((v: unknown) => Number(v) | 0, { MAX_VALUE: 2147483647, MIN_VALUE: -2147483648 });
/** `uint(x)` do AS3: ToUint32 */
export const uint: IntFn = Object.assign((v: unknown) => Number(v) >>> 0, { MAX_VALUE: 4294967295, MIN_VALUE: 0 });

// ------------------------------------------------------------------ is / as
function implementsIface(cls: any, iface: AS3Interface): boolean {
  for (let c = cls; c && c !== Object; c = Object.getPrototypeOf(c)) {
    const list: AS3Interface[] | undefined = Object.hasOwn(c, "$interfaces") ? c.$interfaces : undefined;
    if (list) for (const i of list) if (ifaceExtends(i, iface)) return true;
  }
  return false;
}
function ifaceExtends(i: AS3Interface, target: AS3Interface): boolean {
  if (i === target) return true;
  return i.$supers.some((s) => ifaceExtends(s, target));
}

/** `v is T` */
export function $is(v: unknown, t: any): boolean {
  if (v === null || v === undefined) return false;
  if (typeof t === "string") {
    switch (t) {
      case "int": return typeof v === "number" && (v | 0) === v;
      case "uint": return typeof v === "number" && v >>> 0 === v;
      case "Number": return typeof v === "number";
      case "String": return typeof v === "string";
      case "Boolean": return typeof v === "boolean";
      case "Array": return Array.isArray(v);
      case "Vector": return Array.isArray(v);
      case "Object": return true;
      case "Function": return typeof v === "function";
      case "Class": return typeof v === "function";
      case "XML": return v instanceof XML;
      case "XMLList": return v instanceof XMLList;
    }
    return false;
  }
  if (t && t.$isInterface) return typeof v === "object" || typeof v === "function" ? implementsIface((v as object).constructor, t) : false;
  if (typeof t === "function") {
    if (t === Number) return typeof v === "number";
    if (t === String) return typeof v === "string";
    if (t === Boolean) return typeof v === "boolean";
    if (t === int) return typeof v === "number" && (v | 0) === v;
    if (t === uint) return typeof v === "number" && v >>> 0 === v;
    if (t === Object) return true;
    return v instanceof t;
  }
  return false;
}

/** `v as T` — v se for do tipo, senão null */
export function $as<T = any>(v: unknown, t: any): T {
  return ($is(v, t) ? v : null) as T;
}

/** `typeof` do AS3 (XML dá "xml") */
export function $typeof(v: unknown): string {
  if (v instanceof XML || v instanceof XMLList) return "xml";
  if (v === null) return "object";
  return typeof v;
}

/** `k in obj` (Dictionary e XMLList incluídos) */
export function $in(k: unknown, obj: any): boolean {
  if (obj == null) throw new TypeError("Error #1009: Cannot access a property or method of a null object reference.");
  if (typeof obj.$has === "function") return obj.$has(k);
  if (obj instanceof XMLList || obj instanceof XML) return obj.hasOwnProperty(String(k));
  return String(k) in Object(obj);
}

// ------------------------------------------------------------------ iteração
/** `for each (v in o)` */
export function $each(o: any): Iterable<any> {
  if (o == null) return [];
  if (Array.isArray(o)) return o.slice();
  if (o instanceof XMLList || o instanceof XML) return [...o];
  if (typeof o.$values === "function") return o.$values();
  if (typeof o === "object") return Object.keys(o).map((k) => o[k]);
  return [];
}

/** `for (k in o)` */
export function $keys(o: any, numeric = false): Iterable<any> {
  if (o == null) return [];
  if (Array.isArray(o)) {
    const out: any[] = [];
    for (let i = 0; i < o.length; i++) if (i in o) out.push(numeric ? i : String(i));
    for (const k of Object.keys(o)) if (!/^\d+$/.test(k)) out.push(k);
    return out;
  }
  if (o instanceof XMLList) return Array.from({ length: o.length() }, (_, i) => (numeric ? i : String(i)));
  if (typeof o.$keysOf === "function") return o.$keysOf();
  if (typeof o === "object" || typeof o === "function") {
    const ks = Object.keys(o);
    return numeric ? ks.map(Number) : ks;
  }
  return [];
}

// ------------------------------------------------------------------ Array/Vector
export const CASEINSENSITIVE = 1;
export const DESCENDING = 2;
export const UNIQUESORT = 4;
export const RETURNINDEXEDARRAY = 8;
export const NUMERIC = 16;

for (const [k, v] of Object.entries({ CASEINSENSITIVE, DESCENDING, UNIQUESORT, RETURNINDEXEDARRAY, NUMERIC })) {
  if (!(k in Array)) Object.defineProperty(Array, k, { value: v, enumerable: false });
}

function cmpWith(flags: number): (a: any, b: any) => number {
  const num = (flags & NUMERIC) !== 0;
  const ci = (flags & CASEINSENSITIVE) !== 0;
  const base = (a: any, b: any): number => {
    if (num) return Number(a) - Number(b);
    let x = String(a), y = String(b);
    if (ci) { x = x.toLowerCase(); y = y.toLowerCase(); }
    return x < y ? -1 : x > y ? 1 : 0;
  };
  return (flags & DESCENDING) ? (a, b) => -base(a, b) : base;
}

/** `arr.sort(...)` do AS3: aceita função, flags ou os dois */
export function $sort(arr: any[], ...args: any[]): any {
  let fn: ((a: any, b: any) => number) | undefined;
  let flags = 0;
  for (const a of args) {
    if (typeof a === "function") fn = a;
    else if (typeof a === "number") flags = a;
  }
  let cmp = fn ?? cmpWith(flags);
  if (fn && flags & DESCENDING) { const f = fn; cmp = (a, b) => -f(a, b); }
  if (flags & RETURNINDEXEDARRAY) {
    return arr.map((_, i) => i).sort((i, j) => cmp(arr[i], arr[j]));
  }
  if (flags & UNIQUESORT) {
    const copy = arr.slice().sort(cmp);
    for (let i = 1; i < copy.length; i++) if (cmp(copy[i - 1], copy[i]) === 0) return 0;
  }
  arr.sort(cmp);
  return arr;
}

/** `arr.sortOn(campo(s), flags)` do AS3 */
export function $sortOn(arr: any[], names: string | string[], options: number | number[] = 0): any {
  const ns = Array.isArray(names) ? names : [names];
  const opts = ns.map((_, i) => (Array.isArray(options) ? options[i] ?? 0 : options));
  const cmps = opts.map((f) => cmpWith(f));
  const cmp = (a: any, b: any): number => {
    for (let i = 0; i < ns.length; i++) {
      const r = cmps[i]!(a?.[ns[i]!], b?.[ns[i]!]);
      if (r) return r;
    }
    return 0;
  };
  const f0 = typeof options === "number" ? options : 0;
  if (f0 & RETURNINDEXEDARRAY) return arr.map((_, i) => i).sort((i, j) => cmp(arr[i], arr[j]));
  arr.sort(cmp);
  return arr;
}

/**
 * Arrays do AS3 têm `sortOn` e `sort(flags)`. O transpilador já converte
 * quando sabe o tipo; aqui cobre o resto (variáveis sem tipo). `sort(fn)` e
 * `sort()` continuam o nativo.
 */
{
  const AP = Array.prototype as any;
  const nativeSort = AP.sort;
  if (!AP.sortOn) {
    Object.defineProperty(AP, "sortOn", { value: function (this: any[], names: any, options: any = 0) { return $sortOn(this, names, options); }, writable: true, configurable: true });
    Object.defineProperty(AP, "sort", {
      value: function (this: any[], ...args: any[]) {
        if (args.length > 1 || (args.length === 1 && typeof args[0] === "number")) return $sort(this, ...args);
        return nativeSort.apply(this, args);
      },
      writable: true,
      configurable: true,
    });
  }
}

/** `new Vector.<T>(n)` — n posições com o default do tipo */
export function $vector<T>(length: number, def: T): T[] {
  return new Array<T>(Math.max(0, Number(length) | 0)).fill(def);
}

/** `Vector.<T>(arr)` / `new <T>[...]` */
export function $vectorOf<T>(src: Iterable<T> | ArrayLike<T> | null): T[] {
  if (src == null) return [];
  return Array.from(src as Iterable<T>);
}

/** `Array(x)` */
export function $toArray(v: unknown): any[] {
  if (Array.isArray(v)) return v;
  return [v];
}

/** `Vector` como valor (`x is Vector.<T>` → `$is(x, "Vector")`) */
export const Vector = Array;

/** `Class` como tipo/valor */
export const Class = Function;

// ------------------------------------------------------------------ trace / erros
export function trace(...args: unknown[]): void {
  console.log(...args.map((a) => (a instanceof XML || a instanceof XMLList ? a.toXMLString() : a)));
}

export class ArgumentError extends Error {
  constructor(message = "", public errorID = 0) { super(message); this.name = "ArgumentError"; }
}
export class SecurityError extends Error {
  constructor(message = "", public errorID = 0) { super(message); this.name = "SecurityError"; }
}
export class VerifyError extends Error {
  constructor(message = "", public errorID = 0) { super(message); this.name = "VerifyError"; }
}
export class DefinitionError extends Error {
  constructor(message = "", public errorID = 0) { super(message); this.name = "DefinitionError"; }
}
export class UninitializedError extends Error {
  constructor(message = "", public errorID = 0) { super(message); this.name = "UninitializedError"; }
}

// ------------------------------------------------------------------ escrita dinâmica tipada
const fieldTypes = new WeakMap<Function, Map<string, string>>();
function typesOf(ctor: any): Map<string, string> {
  let m = fieldTypes.get(ctor);
  if (!m) {
    m = new Map();
    const chain: any[] = [];
    for (let c = ctor; c && c !== Object && c !== Function.prototype; c = Object.getPrototypeOf(c)) chain.unshift(c);
    for (const c of chain) {
      const own = Object.hasOwn(c, "$fqn") ? (c.$fqn as string) : "";
      const d: string | undefined = Object.hasOwn(c, "$describe") ? c.$describe : NATIVE_DESCRIBE[own];
      if (!d) continue;
      for (const part of d.split(";")) {
        const [kind, name, type] = part.split(":");
        if ((kind === "v" || kind === "a") && name && type) m.set(name, type);
      }
    }
    fieldTypes.set(ctor, m);
  }
  return m;
}

/**
 * `obj[nome] = v` dinâmico. No AS3, gravar num campo declarado converte o
 * valor pro tipo do campo (string "9131" em `Port:Number` vira 9131). Aqui
 * usamos os tipos dos metadados de `$class` pra fazer o mesmo.
 */
export function $dset(obj: any, key: any, v: any): any {
  if (obj !== null && typeof obj === "object" && typeof key === "string") {
    const c = obj.constructor;
    if (c && "$fqn" in c) {
      switch (typesOf(c).get(key)) {
        case "int": v = Number(v) | 0; break;
        case "uint": v = Number(v) >>> 0; break;
        case "Number": v = Number(v); break;
        case "String": v = v == null ? null : String(v); break;
        case "Boolean": v = Boolean(v); break;
      }
    }
  }
  obj[key] = v;
  return v;
}

// ------------------------------------------------------------------ hasOwnProperty do AS3
/**
 * No AS3, `obj.hasOwnProperty("x")` é true também pra propriedades/métodos
 * DECLARADOS na classe (getter/setter, var). O pickgliss depende disso pra
 * aplicar os estilos do XML de layout (ObjectUtils.copyPorpertiesByXML).
 * Só muda o comportamento pra objetos de classes AS3 (registradas com $class);
 * o resto do JS continua igual. Código interno usa `Object.hasOwn`.
 */
{
  const native = Object.prototype.hasOwnProperty;
  Object.defineProperty(Object.prototype, "hasOwnProperty", {
    value: function hasOwnProperty(this: any, name: PropertyKey): boolean {
      if (native.call(this, name)) return true;
      if (this === null || this === undefined || typeof name !== "string") return false;
      const c = this.constructor;
      if (typeof c !== "function" || !("$fqn" in c) || name.startsWith("$")) return false;
      return name in this && !(name in Object.prototype);
    },
    writable: true,
    configurable: true,
    enumerable: false,
  });
}

// ------------------------------------------------------------------ polyfills (Error, Date)
const EP = Error.prototype as any;
if (!("getStackTrace" in EP)) {
  Object.defineProperty(EP, "getStackTrace", { value: function (this: Error) { return this.stack ?? ""; }, enumerable: false });
  Object.defineProperty(EP, "errorID", { get() { return 0; }, set(v) { Object.defineProperty(this, "errorID", { value: v, writable: true }); }, enumerable: false, configurable: true });
}

/** AS3 Date tem propriedades (`d.fullYear`, `d.time`...) que o JS só tem como métodos */
const DP = Date.prototype as any;
if (!("fullYear" in DP)) {
  const props: [string, string, string | null][] = [
    ["fullYear", "getFullYear", "setFullYear"], ["month", "getMonth", "setMonth"], ["date", "getDate", "setDate"],
    ["day", "getDay", null], ["hours", "getHours", "setHours"], ["minutes", "getMinutes", "setMinutes"],
    ["seconds", "getSeconds", "setSeconds"], ["milliseconds", "getMilliseconds", "setMilliseconds"],
    ["time", "getTime", "setTime"], ["timezoneOffset", "getTimezoneOffset", null],
    ["fullYearUTC", "getUTCFullYear", "setUTCFullYear"], ["monthUTC", "getUTCMonth", "setUTCMonth"],
    ["dateUTC", "getUTCDate", "setUTCDate"], ["dayUTC", "getUTCDay", null], ["hoursUTC", "getUTCHours", "setUTCHours"],
    ["minutesUTC", "getUTCMinutes", "setUTCMinutes"], ["secondsUTC", "getUTCSeconds", "setUTCSeconds"],
    ["millisecondsUTC", "getUTCMilliseconds", "setUTCMilliseconds"],
  ];
  for (const [p, g, s] of props) {
    Object.defineProperty(DP, p, {
      get() { return this[g](); },
      set: s ? function (this: any, v: number) { this[s](v); } : undefined,
      enumerable: false, configurable: true,
    });
  }
}
