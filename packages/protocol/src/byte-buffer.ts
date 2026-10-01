/**
 * Port of Game.Base/PacketIn.cs (the C# base class that both reads and writes packet bodies).
 *
 * Semantics mirrored on purpose:
 *  - one growable buffer + `length` (high-water mark) + `offset` (cursor shared by reads and writes);
 *  - reads past `length` but inside the backing buffer return whatever is there (zeros for a freshly
 *    received packet, because the server always allocates `new byte[8192]`), and only reads past the
 *    backing buffer throw (C# IndexOutOfRangeException);
 *  - integers are big-endian; float/double are LITTLE-endian (BitConverter on x86);
 *  - strings: u16 length prefix, UTF-8; WriteString appends a NUL and counts it, ReadString strips every NUL;
 *  - the infamous WriteLong/ReadLong quirks (see methods).
 */

const utf8Encoder = new TextEncoder();
const utf8Decoder = new TextDecoder("utf-8", { fatal: false, ignoreBOM: true });

/** Calendar parts as written by PacketIn.WriteDateTime (7 bytes). Month is 1-12. */
export interface DateParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

export class ProtocolRangeError extends RangeError {
  constructor(message: string) {
    super(message);
    this.name = "ProtocolRangeError";
  }
}

const TWO_POW_32 = 4294967296;
const TWO_POW_63 = 9223372036854775808; // exactly representable
const LONG_MIN = -9223372036854775808n;

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate() || [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]!;
}

function isLeap(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

/** Validation done by `new DateTime(y, M, d, h, m, s)`. */
export function validateDateParts(p: DateParts): void {
  const dim = [31, isLeap(p.year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][p.month - 1] ?? 0;
  if (
    p.year < 1 || p.year > 9999 ||
    p.month < 1 || p.month > 12 ||
    p.day < 1 || p.day > dim ||
    p.hour < 0 || p.hour > 23 ||
    p.minute < 0 || p.minute > 59 ||
    p.second < 0 || p.second > 59
  ) {
    throw new ProtocolRangeError(`invalid DateTime ${JSON.stringify(p)}`);
  }
}

/** Converts a JS Date into the parts the C# server would write for `DateTime.Now`-style values (local time). */
export function datePartsFromDate(d: Date, utc = false): DateParts {
  return utc
    ? { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(), hour: d.getUTCHours(), minute: d.getUTCMinutes(), second: d.getUTCSeconds() }
    : { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate(), hour: d.getHours(), minute: d.getMinutes(), second: d.getSeconds() };
}

export function dateFromParts(p: DateParts, utc = false): Date {
  return utc
    ? new Date(Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second))
    : new Date(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
}

/** C# `(long)double` as executed by the original .NET Framework x86/x64 JIT (cvttsd2si: overflow -> long.MinValue). */
function doubleToLongNetFx(x: number): bigint {
  if (!Number.isFinite(x) || x >= TWO_POW_63 || x < -TWO_POW_63) return LONG_MIN;
  return BigInt(Math.trunc(x));
}

export class ByteBuffer {
  protected _buffer: Uint8Array;
  protected _length: number;
  protected _offset: number;

  constructor(buffer: Uint8Array, length: number) {
    this._buffer = buffer;
    this._length = length;
    this._offset = 0;
  }

  /** Backing buffer (may be larger than `length`). */
  get buffer(): Uint8Array {
    return this._buffer;
  }

  get length(): number {
    return this._length;
  }

  get offset(): number {
    return this._offset;
  }

  set offset(v: number) {
    this._offset = v;
  }

  /** C# DataLeft = m_length - m_offset. */
  get dataLeft(): number {
    return this._length - this._offset;
  }

  /** Copy of bytes [0, length). */
  toBytes(): Uint8Array {
    return this._buffer.slice(0, this._length);
  }

  // ------------------------------------------------------------------ reads

  protected byteAt(i: number): number {
    if (i < 0 || i >= this._buffer.length) {
      throw new ProtocolRangeError(`read at ${i} outside buffer of ${this._buffer.length}`);
    }
    return this._buffer[i]!;
  }

  readByte(): number {
    return this.byteAt(this._offset++);
  }

  readBoolean(): boolean {
    return this.readByte() !== 0;
  }

  /** Signed big-endian i16 (Marshal.ConvertToInt16). */
  readShort(): number {
    const a = this.readByte();
    const b = this.readByte();
    return (((a << 8) | b) << 16) >> 16;
  }

  /** Unsigned big-endian u16 (not in the C#, convenience for AS3 readUnsignedShort). */
  readUShort(): number {
    const a = this.readByte();
    const b = this.readByte();
    return (a << 8) | b;
  }

  /** PacketIn.ReadShortLowEndian. */
  readShortLowEndian(): number {
    const lo = this.readByte();
    const hi = this.readByte();
    return (((hi << 8) | lo) << 16) >> 16;
  }

  /** Signed big-endian i32. */
  readInt(): number {
    const a = this.readByte();
    const b = this.readByte();
    const c = this.readByte();
    const d = this.readByte();
    return (a << 24) | (b << 16) | (c << 8) | d;
  }

  /** PacketIn.ReadUInt. */
  readUInt(): number {
    return this.readInt() >>> 0;
  }

  /**
   * PacketIn.ReadLong: hi = ReadInt() (signed), lo = readUnsignedInt(), and the value is rebuilt with doubles:
   * `sign(hi) * (|hi * 2^32| + lo)` then cast to long. This is NOT two's complement for negative values
   * (e.g. ff ff ff ff 00 00 00 01 -> -4294967297) and loses precision above 2^53.
   * Overflow is mirrored as on the original .NET Framework runtime (long.MinValue).
   */
  readLong(): bigint {
    const hi = this.readInt();
    const lo = this.readUInt();
    const sign = hi < 0 ? -1 : 1;
    const x = sign * (Math.abs(hi * TWO_POW_32) + lo);
    return doubleToLongNetFx(x);
  }

  /** readLong() as a JS number (precision loss above 2^53, same as the C# double math). */
  readLongNumber(): number {
    return Number(this.readLong());
  }

  /** PacketIn.ReadFloat: 4 bytes LITTLE-endian (BitConverter.ToSingle). */
  readFloat(): number {
    const b = this.readBytes(4);
    return new DataView(b.buffer, b.byteOffset, 4).getFloat32(0, true);
  }

  /** PacketIn.ReadDouble: 8 bytes LITTLE-endian (BitConverter.ToDouble). */
  readDouble(): number {
    const b = this.readBytes(8);
    return new DataView(b.buffer, b.byteOffset, 8).getFloat64(0, true);
  }

  /** Big-endian float (AS3 ByteArray default). Not used by the C# server; provided for client-side code. */
  readFloatBE(): number {
    const b = this.readBytes(4);
    return new DataView(b.buffer, b.byteOffset, 4).getFloat32(0, false);
  }

  readDoubleBE(): number {
    const b = this.readBytes(8);
    return new DataView(b.buffer, b.byteOffset, 8).getFloat64(0, false);
  }

  /** PacketIn.ReadBytes(maxLen) / ReadBytes() (= rest up to `length`). */
  readBytes(maxLen?: number): Uint8Array {
    const n = maxLen ?? this._length - this._offset;
    if (n < 0) throw new ProtocolRangeError(`negative byte count ${n}`);
    if (this._offset < 0 || this._offset + n > this._buffer.length) {
      throw new ProtocolRangeError(`readBytes(${n}) at ${this._offset} outside buffer of ${this._buffer.length}`);
    }
    const out = this._buffer.slice(this._offset, this._offset + n);
    this._offset += n;
    return out;
  }

  /**
   * PacketIn.ReadString: count = ReadShort() (signed), UTF-8 decode of `count` bytes, then remove every U+0000.
   * Accepts both the server format (len+1, bytes, NUL) and the AS3 writeUTF format (len, bytes).
   */
  readString(): string {
    const count = this.readShort();
    if (count < 0 || this._offset + count > this._buffer.length) {
      throw new ProtocolRangeError(`readString(${count}) at ${this._offset} outside buffer of ${this._buffer.length}`);
    }
    const s = utf8Decoder.decode(this._buffer.subarray(this._offset, this._offset + count));
    this._offset += count;
    return s.includes("\0") ? s.replaceAll("\0", "") : s;
  }

  /** PacketIn.ReadDateTime: i16 year, u8 month, u8 day, u8 hour, u8 minute, u8 second. Throws like `new DateTime(...)`. */
  readDateTimeParts(): DateParts {
    const p: DateParts = {
      year: this.readShort(),
      month: this.readByte(),
      day: this.readByte(),
      hour: this.readByte(),
      minute: this.readByte(),
      second: this.readByte(),
    };
    validateDateParts(p);
    return p;
  }

  /** readDateTimeParts() as a JS Date (local time unless `utc`). */
  readDateTime(utc = false): Date {
    return dateFromParts(this.readDateTimeParts(), utc);
  }

  /** PacketIn.Skip. */
  skip(n: number): void {
    this._offset += n;
  }

  // ------------------------------------------------------------------ writes

  private grow(): void {
    const old = this._buffer;
    const next = new Uint8Array(Math.max(old.length * 2, 1));
    next.set(old);
    this._buffer = next;
  }

  private bump(): void {
    if (this._offset > this._length) this._length = this._offset;
  }

  writeByte(val: number): void {
    if (this._offset === this._buffer.length) this.grow();
    this._buffer[this._offset++] = val & 0xff;
    this.bump();
  }

  writeBoolean(val: boolean): void {
    this.writeByte(val ? 1 : 0);
  }

  /** Big-endian; value truncated to 16 bits like a C# (short) cast. */
  writeShort(val: number): void {
    this.writeByte((val >> 8) & 0xff);
    this.writeByte(val & 0xff);
  }

  writeShortLowEndian(val: number): void {
    this.writeByte(val & 0xff);
    this.writeByte((val >> 8) & 0xff);
  }

  /** Big-endian i32/u32 (value truncated to 32 bits). */
  writeInt(val: number): void {
    this.writeByte((val >>> 24) & 0xff);
    this.writeByte((val >>> 16) & 0xff);
    this.writeByte((val >>> 8) & 0xff);
    this.writeByte(val & 0xff);
  }

  /** PacketIn.vmethod_0(uint) - identical bytes to writeInt. */
  writeUInt(val: number): void {
    this.writeInt(val >>> 0);
  }

  /**
   * PacketIn.WriteLong - mirrors a bug in the original: the high word is built by scanning the binary string
   * with `Substring(len - (i+1))` (a suffix, not a char), so only bit 32 survives. Wire = [i32 bit32(val)][i32 low32(val)].
   * e.g. 2^33 -> 00000000 00000000, 2^32+5 -> 00000001 00000005, -1 -> 00000001 ffffffff.
   */
  writeLong(val: bigint | number): void {
    const v = BigInt.asIntN(64, typeof val === "bigint" ? val : BigInt(Math.trunc(val)));
    const high = Number((BigInt.asUintN(64, v) >> 32n) & 1n);
    const low = Number(BigInt.asIntN(32, v));
    this.writeInt(high);
    this.writeInt(low);
  }

  /** Mathematically correct i64 (hi:i32, lo:u32). NOT what the C# writes; use only for new code paths. */
  writeLongTwosComplement(val: bigint | number): void {
    const v = BigInt.asUintN(64, typeof val === "bigint" ? val : BigInt(Math.trunc(val)));
    this.writeInt(Number(v >> 32n));
    this.writeInt(Number(v & 0xffffffffn));
  }

  /** PacketIn.WriteFloat: (float) value, 4 bytes LITTLE-endian. */
  writeFloat(val: number): void {
    const b = new Uint8Array(4);
    new DataView(b.buffer).setFloat32(0, val, true);
    this.write(b);
  }

  /** PacketIn.WriteDouble: 8 bytes LITTLE-endian. */
  writeDouble(val: number): void {
    const b = new Uint8Array(8);
    new DataView(b.buffer).setFloat64(0, val, true);
    this.write(b);
  }

  writeFloatBE(val: number): void {
    const b = new Uint8Array(4);
    new DataView(b.buffer).setFloat32(0, val, false);
    this.write(b);
  }

  writeDoubleBE(val: number): void {
    const b = new Uint8Array(8);
    new DataView(b.buffer).setFloat64(0, val, false);
    this.write(b);
  }

  /** PacketIn.Write(byte[] src, int offset, int len). Growth rule copied (`m_offset + len >= m_buffer.Length`). */
  write(src: Uint8Array, offset = 0, len = src.length - offset): void {
    while (this._offset + len >= this._buffer.length) this.grow();
    this._buffer.set(src.subarray(offset, offset + len), this._offset);
    this._offset += len;
    this.bump();
  }

  /**
   * PacketIn.WriteString(string): null/"" -> 00 01 00; otherwise u16(utf8.length + 1), utf8 bytes, 00.
   * Lone surrogates are encoded as EF BF BD (same as .NET Encoding.UTF8).
   */
  writeString(str: string | null | undefined): void {
    if (str) {
      const bytes = utf8Encoder.encode(str);
      this.writeShort(bytes.length + 1);
      this.write(bytes, 0, bytes.length);
      this.writeByte(0);
    } else {
      this.writeShort(1);
      this.writeByte(0);
    }
  }

  /** PacketIn.WriteString(string, int maxlen): u16(len) + first len UTF-8 bytes (may cut a code point), no NUL. */
  writeStringMax(str: string, maxlen: number): void {
    const bytes = utf8Encoder.encode(str);
    const len = bytes.length < maxlen ? bytes.length : maxlen;
    this.writeShort(len);
    this.write(bytes, 0, len);
  }

  /**
   * AS3 ByteArray.writeUTF (client -> server string format): u16(len) + utf8, no NUL. The server reads it with readString().
   */
  writeUTF(str: string): void {
    const bytes = utf8Encoder.encode(str);
    if (bytes.length > 65535) throw new ProtocolRangeError("writeUTF: string too long");
    this.writeShort(bytes.length);
    this.write(bytes);
  }

  /** PacketIn.WriteDateTime. Accepts parts or a Date (local time, like DateTime.Now; pass utc=true for UTC). */
  writeDateTime(date: DateParts | Date, utc = false): void {
    const p = date instanceof Date ? datePartsFromDate(date, utc) : date;
    this.writeShort(p.year);
    this.writeByte(p.month);
    this.writeByte(p.day);
    this.writeByte(p.hour);
    this.writeByte(p.minute);
    this.writeByte(p.second);
  }

  /** PacketIn.Fill(val, num). */
  fill(val: number, num: number): void {
    for (let i = 0; i < num; i++) this.write