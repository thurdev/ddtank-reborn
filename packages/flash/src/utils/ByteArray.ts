/**
 * `flash.utils.ByteArray` — buffer binário crescente com cursor (`position`).
 * Padrão big-endian, igual ao Flash. É por aqui que passam todos os pacotes
 * do jogo (PackageIn/PackageOut estendem ByteArray).
 */
import { deflateSync, inflateSync, unzlibSync, zlibSync } from "fflate";
import { $class } from "../as3";
import { Endian } from "./Endian";
import { IDataInput } from "./IDataInput";
import { IDataOutput } from "./IDataOutput";

const enc = new TextEncoder();
const dec = new TextDecoder("utf-8");

export class ByteArray {
  static defaultObjectEncoding = 3;

  $buf: Uint8Array = new Uint8Array(32);
  $view: DataView = new DataView(this.$buf.buffer);
  $len = 0;
  $pos = 0;
  $little = false;
  objectEncoding = 3;
  shareable = false;
  /** URL de onde veio (Loader.loadBytes usa pra achar o SWF exportado) */
  $sourceUrl?: string;
  /** fila do writeObject/readObject (clone profundo em memória, sem AMF) */
  $objects?: unknown[];

  /** cria a partir de bytes já existentes */
  static fromBytes(bytes: Uint8Array, url?: string): ByteArray {
    const b = new ByteArray();
    b.$buf = bytes.slice();
    b.$view = new DataView(b.$buf.buffer);
    b.$len = bytes.length;
    b.$sourceUrl = url;
    return b;
  }

  /** cópia dos bytes válidos */
  $bytes(): Uint8Array { return this.$buf.subarray(0, this.$len); }

  get length(): number { return this.$len; }
  set length(v: number) {
    this.$ensure(v);
    if (v > this.$len) this.$buf.fill(0, this.$len, v);
    this.$len = v;
    if (this.$pos > v) this.$pos = v;
  }
  get position(): number { return this.$pos; }
  set position(v: number) { this.$pos = v >>> 0; }
  get bytesAvailable(): number { return Math.max(0, this.$len - this.$pos); }
  get endian(): string { return this.$little ? Endian.LITTLE_ENDIAN : Endian.BIG_ENDIAN; }
  set endian(v: string) { this.$little = v === Endian.LITTLE_ENDIAN; }

  private $ensure(n: number): void {
    if (n <= this.$buf.length) return;
    let cap = this.$buf.length * 2;
    while (cap < n) cap *= 2;
    const nb = new Uint8Array(cap);
    nb.set(this.$buf.subarray(0, this.$len));
    this.$buf = nb;
    this.$view = new DataView(nb.buffer);
  }
  private $w(n: number): number {
    const p = this.$pos;
    this.$ensure(p + n);
    this.$pos = p + n;
    if (this.$pos > this.$len) this.$len = this.$pos;
    return p;
  }
  private $r(n: number): number {
    const p = this.$pos;
    if (p + n > this.$len) throw new RangeError("Error #2030: End of file was encountered.");
    this.$pos = p + n;
    return p;
  }

  // ---- leitura
  readBoolean(): boolean { return this.$buf[this.$r(1)] !== 0; }
  readByte(): number { return this.$view.getInt8(this.$r(1)); }
  readUnsignedByte(): number { return this.$buf[this.$r(1)]!; }
  readShort(): number { return this.$view.getInt16(this.$r(2), this.$little); }
  readUnsignedShort(): number { return this.$view.getUint16(this.$r(2), this.$little); }
  readInt(): number { return this.$view.getInt32(this.$r(4), this.$little); }
  readUnsignedInt(): number { return this.$view.getUint32(this.$r(4), this.$little); }
  readFloat(): number { return this.$view.getFloat32(this.$r(4), this.$little); }
  readDouble(): number { return this.$view.getFloat64(this.$r(8), this.$little); }
  readUTF(): string { const n = this.readUnsignedShort(); return this.readUTFBytes(n); }
  readUTFBytes(n: number): string {
    const p = this.$r(n);
    let s = dec.decode(this.$buf.subarray(p, p + n));
    const z = s.indexOf("\0");
    if (z >= 0) s = s.slice(0, z);
    return s;
  }
  readMultiByte(n: number, charSet: string): string {
    const p = this.$r(n);
    try { return new TextDecoder(charSet.toLowerCase() === "gb2312" ? "gbk" : charSet).decode(this.$buf.subarray(p, p + n)).replace(/\0.*$/s, ""); }
    catch { return dec.decode(this.$buf.subarray(p, p + n)); }
  }
  /** copia `length` bytes (0 = todos disponíveis) pra `bytes` a partir de `offset` */
  readBytes(bytes: ByteArray, offset = 0, length = 0): void {
    const n = length || this.bytesAvailable;
    const p = this.$r(n);
    bytes.$ensure(offset + n);
    bytes.$buf.set(this.$buf.subarray(p, p + n), offset);
    if (offset + n > bytes.$len) bytes.$len = offset + n;
  }
  readObject(): any {
    return this.$objects?.shift();
  }

  // ---- escrita
  writeBoolean(v: boolean): void { const p = this.$w(1); this.$buf[p] = v ? 1 : 0; }
  writeByte(v: number): void { const p = this.$w(1); this.$view.setInt8(p, (v << 24) >> 24); }
  writeShort(v: number): void { const p = this.$w(2); this.$view.setInt16(p, (v << 16) >> 16, this.$little); }
  writeInt(v: number): void { const p = this.$w(4); this.$view.setInt32(p, v | 0, this.$little); }
  writeUnsignedInt(v: number): void { const p = this.$w(4); this.$view.setUint32(p, v >>> 0, this.$little); }
  writeFloat(v: number): void { const p = this.$w(4); this.$view.setFloat32(p, v, this.$little); }
  writeDouble(v: number): void { { const p = this.$w(8); this.$view.setFloat64(p, v, this.$little); } }
  writeUTF(v: string): void {
    const b = enc.encode(v ?? "");
    if (b.length > 65535) throw new RangeError("Error #2006: The supplied index is out of bounds.");
    this.writeShort(b.length);
    const p = this.$w(b.length);
    this.$buf.set(b, p);
  }
  writeUTFBytes(v: string): void {
    const b = enc.encode(v ?? "");
    const p = this.$w(b.length);
    this.$buf.set(b, p);
  }
  writeMultiByte(v: string, _charSet: string): void { this.writeUTFBytes(v); }
  writeBytes(bytes: ByteArray, offset = 0, length = 0): void {
    const n = length || bytes.$len - offset;
    if (n <= 0) return;
    const src = bytes.$buf.subarray(offset, offset + n).slice(); // cópia: bytes pode ser o próprio this
    const p = this.$w(n);
    this.$buf.set(src, p);
  }
  writeObject(v: unknown): void {
    (this.$objects ??= []).push(deepClone(v));
    this.writeByte(0); // ocupa espaço, como o AMF ocuparia
  }

  // ---- compressão
  compress(algorithm = "zlib"): void {
    const out = algorithm === "deflate" ? deflateSync(this.$bytes()) : zlibSync(this.$bytes());
    this.$set(out);
  }
  uncompress(algorithm = "zlib"): void {
    const out = algorithm === "deflate" ? inflateSync(this.$bytes()) : unzlibSync(this.$bytes());
    this.$set(out);
  }
  deflate(): void { this.compress("deflate"); }
  inflate(): void { this.uncompress("deflate"); }

  private $set(bytes: Uint8Array): void {
    this.$buf = bytes.length ? bytes.slice() : new Uint8Array(32);
    this.$view = new DataView(this.$buf.buffer);
    this.$len = bytes.length;
    this.$pos = 0;
  }

  clear(): void { this.$len = 0; this.$pos = 0; }

  /** `ba[i]` (o transpilador converte quando sabe que é ByteArray) */
  $get(i: number): number | undefined { return i < this.$len ? this.$buf[i]! : undefined; }
  /** `ba[i] = v` — cresce o buffer se precisar */
  $setAt(i: number, v: number): void {
    this.$ensure(i + 1);
    if (i >= this.$len) { this.$buf.fill(0, this.$len, i); this.$len = i + 1; }
    this.$buf[i] = v & 255;
  }

  toString(): string {
    let s = dec.decode(this.$bytes());
    if (s.charCodeAt(0) === 0xfeff) s = s.slice(1);
    return s;
  }
}
$class(ByteArray, "flash.utils.ByteArray", { implements: [IDataInput, IDataOutput] });

function deepClone(v: unknown, seen = new Map<unknown, unknown>()): unknown {
  if (v === null || typeof v !== "object") return v;
  if (seen.has(v)) return seen.get(v);
  if (Array.isArray(v)) {
    const a: unknown[] = [];
    seen.set(v, a);
    for (const x of v) a.push(deepClone(x, seen));
    return a;
  }
  if (v instanceof Date) return new Date(v.getTime());
  // AMF sem registerClassAlias devolve Object simples com as propriedades públicas
  const o: Record<string, unknown> = {};
  seen.set(v, o);
  for (const k of Object.keys(v)) {
    const x = (v as Record<string, unknown>)[k];
    if (typeof x !== "function") o[k] = deepClone(x, seen);
  }
  return o;
}
