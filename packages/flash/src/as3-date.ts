/**
 * Compatibilidade `flash.utils.Date` (AS3) sobre o `Date` nativo do JS.
 *
 * Em AS3, `Date` tem **propriedades** (`d.fullYear`, `d.month`, `d.hours`...)
 * em vez de métodos (`d.getFullYear()`, `d.getMonth()`...). O transpilador
 * (`tools/as3-to-ts`) mapeia o tipo `Date` do AS3 direto pro `Date` do JS
 * (são compatíveis pra construção, aritmética, `toString`...) e emite o
 * código do jogo com acesso no estilo AS3 — então essas propriedades
 * precisam existir de verdade no `Date` do JS.
 *
 * Este módulo tem efeito colateral: ao ser importado (sempre é, via
 * `as3.ts`, que todo arquivo gerado importa), estende `Date.prototype` com
 * getters/setters que delegam pros métodos nativos, e faz a extensão de
 * tipo (`declare global`) pro `tsc` aceitar esses nomes.
 */

export {};

function defineAccessor(name: string, get: (d: Date) => number, set?: (d: Date, v: number) => void): void {
  if (Object.prototype.hasOwnProperty.call(Date.prototype, name)) return;
  const desc: PropertyDescriptor = { configurable: true, enumerable: false, get(this: Date) { return get(this); } };
  if (set) desc.set = function (this: Date, v: number) { set(this, v); };
  Object.defineProperty(Date.prototype, name, desc);
}

defineAccessor("fullYear", (d) => d.getFullYear(), (d, v) => d.setFullYear(v));
defineAccessor("month", (d) => d.getMonth(), (d, v) => d.setMonth(v));
defineAccessor("date", (d) => d.getDate(), (d, v) => d.setDate(v));
defineAccessor("day", (d) => d.getDay());
defineAccessor("hours", (d) => d.getHours(), (d, v) => d.setHours(v));
defineAccessor("minutes", (d) => d.getMinutes(), (d, v) => d.setMinutes(v));
defineAccessor("seconds", (d) => d.getSeconds(), (d, v) => d.setSeconds(v));
defineAccessor("milliseconds", (d) => d.getMilliseconds(), (d, v) => d.setMilliseconds(v));
defineAccessor("time", (d) => d.getTime(), (d, v) => d.setTime(v));
defineAccessor("timezoneOffset", (d) => d.getTimezoneOffset());
defineAccessor("fullYearUTC", (d) => d.getUTCFullYear(), (d, v) => d.setUTCFullYear(v));
defineAccessor("monthUTC", (d) => d.getUTCMonth(), (d, v) => d.setUTCMonth(v));
defineAccessor("dateUTC", (d) => d.getUTCDate(), (d, v) => d.setUTCDate(v));
defineAccessor("dayUTC", (d) => d.getUTCDay());
defineAccessor("hoursUTC", (d) => d.getUTCHours(), (d, v) => d.setUTCHours(v));
defineAccessor("minutesUTC", (d) => d.getUTCMinutes(), (d, v) => d.setUTCMinutes(v));
defineAccessor("secondsUTC", (d) => d.getUTCSeconds(), (d, v) => d.setUTCSeconds(v));
defineAccessor("millisecondsUTC", (d) => d.getUTCMilliseconds(), (d, v) => d.setUTCMilliseconds(v));

declare global {
  interface Date {
    /** AS3: ano local (equivalente a `getFullYear()`/`setFullYear()`) */
    fullYear: number;
    /** AS3: mês local 0-11 */
    month: number;
    /** AS3: dia do mês local 1-31 */
    date: number;
    /** AS3: dia da semana local 0-6, somente leitura */
    readonly day: number;
    hours: number;
    minutes: number;
    seconds: number;
    milliseconds: number;
    /** AS3: ms desde epoch (equivalente a `getTime()`/`setTime()`) */
    time: number;
    /** AS3: deslocamento de fuso em minutos, somente leitura */
    readonly timezoneOffset: number;
    fullYearUTC: number;
    monthUTC: number;
    dateUTC: number;
    readonly dayUTC: number;
    hoursUTC: number;
    minutesUTC: number;
    secondsUTC: number;
    millisecondsUTC: number;
  }
}
