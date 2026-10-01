/**
 * Port of Game.Base/Packets/GSPacketIn.cs (header, checksum, nested packets) on top of ByteBuffer.
 *
 * Header (20 bytes, big-endian):
 *   0  u16 magic 0x71AB (29099)
 *   2  u16 total length incl. header (written as (short)m_length)
 *   4  u16 checksum = (119 + sum(bytes[6..length))) & 0x7F7F   (16-bit wrap-around, header bytes 6..19 included)
 *   6  i16 code
 *   8  i32 clientId
 *  12  i32 parameter1
 *  16  i32 parameter2
 */
import { ByteBuffer } from "./byte-buffer.js";
import {
  CHECKSUM_MASK,
  CHECKSUM_SEED,
  CHECKSUM_START,
  DEFAULT_PACKET_CAPACITY,
  HDR_SIZE,
  PACKET_BUFFER_SIZE,
  PACKET_HEADER,
} from "./constants.js";

/**
 * GSPacketIn.checkSum(): 119 + every byte from offset 6 up to `length` (exclusive), as a wrapping 16-bit sum,
 * masked with 0x7F7F. Identical to PackageIn/PackageOut.calculateCheckSum on the AS3 side.
 */
export function computeChecksum(buf: Uint8Array, length = buf.length): number {
  let sum = CHECKSUM_SEED;
  for (let i = CHECKSUM_START; i < length; i++) sum = (sum + buf[i]!) & 0xffff;
  return sum & CHECKSUM_MASK;
}

export interface PacketHeader {
  magic: number;
  /** length field, read as signed i16 like GSPacketIn.ReadHeader. */
  length: number;
  checksum: number;
  code: number;
  clientId: number;
  parameter1: number;
  parameter2: number;
}

export function readHeader(buf: Uint8Array, offset = 0): PacketHeader {
  const dv = new DataView(buf.buffer, buf.byteOffset + offset, HDR_SIZE);
  return {
    magic: dv.getUint16(0),
    length: dv.getInt16(2),
    checksum: dv.getUint16(4),
    code: dv.getInt16(6),
    clientId: dv.getInt32(8),
    parameter1: dv.getInt32(12),
    parameter2: dv.getInt32(16),
  };
}

export class GSPacket extends ByteBuffer {
  code: number;
  clientId: number;
  parameter1: number;
  parameter2: number;
  /** Checksum field as received (only meaningful for parsed packets). */
  receivedChecksum = 0;

  /** new GSPacketIn(code, clientId, size): empty body, offset = length = 20. */
  constructor(code: number, clientId = 0, capacity = DEFAULT_PACKET_CAPACITY) {
    super(new Uint8Array(Math.max(capacity, HDR_SIZE)), HDR_SIZE);
    this._offset = HDR_SIZE;
    this.code = (code << 16) >> 16;
    this.clientId = clientId | 0;
    this.parameter1 = 0;
    this.parameter2 = 0;
  }

  /**
   * new GSPacketIn(buf, size) + ReadHeader(): wraps an existing buffer (not copied). Afterwards offset = 20,
   * length = the header's length field (signed i16), exactly like the C#.
   */
  static wrap(buf: Uint8Array, size = buf.length): GSPacket {
    const p = new GSPacket(0, 0, 0);
    p._buffer = buf;
    p._length = size;
    p._offset = 0;
    p.readHeader();
    return p;
  }

  /**
   * Parses a complete plaintext packet. The bytes are copied into a zero-filled buffer of at least 8192 bytes,
   * as StreamProcessor does (`new GSPacketIn(new byte[8192], 8192)`), so over-reads return 0 like on the server.
   */
  static parse(bytes: Uint8Array, capacity = PACKET_BUFFER_SIZE): GSPacket {
    const buf = new Uint8Array(Math.max(capacity, bytes.length));
    buf.set(bytes);
    return GSPacket.wrap(buf, buf.length);
  }

  /** GSPacketIn.ReadHeader. */
  readHeader(): void {
    this.readShort();
    this._length = this.readShort();
    this.receivedChecksum = this.readShort() & 0xffff;
    this.code = this.readShort();
    this.clientId = this.readInt();
    this.parameter1 = this.readInt();
    this.parameter2 = this.readInt();
  }

  /** GSPacketIn.checkSum. */
  checkSum(): number {
    return computeChecksum(this._buffer, this._length);
  }

  /** True when the received checksum matches the content (the 4.1 server never checks; the AS3 client does). */
  verifyChecksum(): boolean {
    return this.receivedChecksum === this.checkSum();
  }

  /** GSPacketIn.WriteHeader (result identical to the C# double-write): magic, length, checksum, code, ids. */
  writeHeader(): void {
    const b = this._buffer;
    const len = this._length;
    b[0] = PACKET_HEADER >> 8;
    b[1] = PACKET_HEADER & 0xff;
    b[2] = (len >> 8) & 0xff;
    b[3] = len & 0xff;
    b[6] = (this.code >> 8) & 0xff;
    b[7] = this.code & 0xff;
    const dv = new DataView(b.buffer, b.byteOffset, HDR_SIZE);
    dv.setInt32(8, this.clientId | 0);
    dv.setInt32(12, this.parameter1 | 0);
    dv.setInt32(16, this.parameter2 | 0);
    const cs = this.checkSum();
    b[4] = (cs >> 8) & 0xff;
    b[5] = cs & 0xff;
  }

  /** writeHeader() + copy of [0, length): the plaintext frame to put on the wire (before encryption). */
  encode(): Uint8Array {
    this.writeHeader();
    return this.toBytes();
  }

  /** GSPacketIn.ClearContext. */
  clearContext(): void {
    this._offset = HDR_SIZE;
    this._length = HDR_SIZE;
  }

  /** GSPacketIn.ClearOffset (rewind reads to the body). */
  clearOffset(): void {
    this._offset = HDR_SIZE;
  }

  /** Body bytes [20, length). */
  body(): Uint8Array {
    return this._buffer.slice(HDR_SIZE, Math.max(HDR_SIZE, this._length));
  }

  /** GSPacketIn.Clone: shares the buffer, re-reads the header, offset = length. */
  clone(): GSPacket {
    const p = GSPacket.wrap(this._buffer, this._length);
    p._offset = this._length;
    return p;
  }

  /** GSPacketIn.WritePacket: writes header of `pkg` then appends its full bytes (packet-in-packet routing). */
  writePacket(pkg: GSPacket): void {
    pkg.writeHeader();
    this.write(pkg.buffer, 0, pkg.length);
  }

  /** GSPacketIn.ReadPacket: the rest of this packet is a complete inner packet. */
  readPacket(): GSPacket {
    const arr = this.readBytes();
    return GSPacket.wrap(arr, arr.length);
  }

  /** Replace the body (offset = 20, length = 20 + body.length). Used by compression helpers. */
  setBody(body: Uint8Array): void {
    this._offset = HDR_SIZE;
    this.write(body);
    this._length = body.length + HDR_SIZE;
  }
}

/** Writer-oriented alias: `new PacketOut(code, clientId?)`, then write*(), then encode(). */
export class PacketOut extends GSPacket {
  constructor(code: number, clientId = 0, parameter1 = 0, parameter2 = 0, capacity = DEFAULT_PACKET_CAPACITY) {
    super(code, clientId, capacity);
    this.parameter1 = parameter1 | 0;
    this.parameter2 = parameter2 | 0;
  }
}

/** Reader-oriented alias. `PacketIn.from(bytes)` parses a complete plaintext frame; offset starts at 20. */
export class PacketIn extends GSPacket {
  static from(bytes: Uint8Array): GSPacket {
    return GSPacket.parse(bytes);
  }
}
