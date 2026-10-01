/**
 * DDTank 4.1 rolling-key cipher (8-byte key, state carried across packets, byte index restarts per packet).
 *
 *   encrypt:  c[0] = p[0] ^ k[0]
 *             i>=1: k[i%8] = (k[i%8] + c[i-1]) ^ i ;  c[i] = (p[i] ^ k[i%8]) + c[i-1]
 *   decrypt:  p[0] = c[0] ^ k[0]
 *             i>=1: k[i%8] = (k[i%8] + c[i-1]) ^ i ;  p[i] = (c[i] - c[i-1]) ^ k[i%8]
 * (all mod 256; `i` is the int index truncated to a byte).
 *
 * Sources: PacketIn.CopyTo3 (server send), PacketIn.CopyFrom3 + StreamProcessor.decryptBytes (server receive),
 * ByteSocket.send / PackageIn.loadE / ByteSocket.decrptBytes (client).
 */
import { DEFAULT_KEY } from "./constants.js";

/** Encrypts one whole packet, mutating `key` (8 bytes) in place. Returns a new array. */
export function encryptBytes(plain: Uint8Array, key: Uint8Array): Uint8Array {
  const n = plain.length;
  const out = new Uint8Array(n);
  if (n === 0) return out;
  out[0] = plain[0]! ^ key[0]!;
  for (let i = 1; i < n; i++) {
    const k = i & 7;
    key[k] = ((key[k]! + out[i - 1]!) ^ i) & 0xff;
    out[i] = ((plain[i]! ^ key[k]!) + out[i - 1]!) & 0xff;
  }
  return out;
}

/** Decrypts `len` bytes of `src` starting at `off`, mutating `key` (PacketIn.CopyFrom3 / PackageIn.loadE). */
export function decryptBytes(src: Uint8Array, off: number, len: number, key: Uint8Array): Uint8Array {
  const out = new Uint8Array(len);
  if (len === 0) return out;
  out[0] = src[off]! ^ key[0]!;
  for (let j = 1; j < len; j++) {
    const k = j & 7;
    key[k] = ((key[k]! + src[off + j - 1]!) ^ j) & 0xff;
    out[j] = ((src[off + j]! - src[off + j - 1]!) ^ key[k]!) & 0xff;
  }
  return out;
}

/** Copy of K0. */
export function defaultKey(): Uint8Array {
  return Uint8Array.from(DEFAULT_KEY);
}

/**
 * Pluggable per-connection cipher used by the frame decoder/encoder.
 * `enabled = false` makes the connection plaintext (inter-server links: BaseClient.Encryted defaults to false).
 */
export interface FrameCipher {
  readonly enabled: boolean;
  /** Start of one header scan; the server clones the receive key ONCE per scan (StreamProcessor.ReceiveBytes). */
  beginScan(): Uint8Array;
  /**
   * Decrypts the 4 header bytes at `off` using (and mutating) the scan key, exactly like
   * `decryptBytes(packetBuf, curOffset, 8, buffer2)` does for the bytes that matter.
   */
  peekHeader(buf: Uint8Array, off: number, scanKey: Uint8Array): Uint8Array;
  /** Decrypts a whole frame with the real receive key (mutates it). */
  decryptFrame(buf: Uint8Array, off: number, len: number): Uint8Array;
  /** Encrypts a whole frame with the real send key (mutates it). */
  encryptFrame(plain: Uint8Array): Uint8Array;
}

/** The 4.1 cipher with independent SEND/RECEIVE keys (BaseClient.SEND_KEY / RECEIVE_KEY). */
export class RollingKeyCipher implements FrameCipher {
  enabled: boolean;
  sendKey: Uint8Array;
  receiveKey: Uint8Array;

  constructor(enabled = true, key: ArrayLike<number> = DEFAULT_KEY) {
    this.enabled = enabled;
    this.sendKey = Uint8Array.from(key);
    this.receiveKey = Uint8Array.from(key);
  }

  /** BaseClient.resetKey: both keys back to K0. */
  resetKey(): void {
    this.sendKey.set(DEFAULT_KEY);
    this.receiveKey.set(DEFAULT_KEY);
  }

  /** BaseClient.setKey: both keys := data[0..8) (done by UserLoginHandler with the RSA-decrypted key). */
  setKey(data: ArrayLike<number>): void {
    for (let i = 0; i < 8; i++) {
      this.sendKey[i] = data[i]! & 0xff;
      this.receiveKey[i] = data[i]! & 0xff;
    }
  }

  beginScan(): Uint8Array {
    return this.receiveKey.slice();
  }

  peekHeader(buf: Uint8Array, off: number, scanKey: Uint8Array): Uint8Array {
    // Only key[1..3] influence header bytes 0..3; key[0] is never touched for j < 8 and key[4..7] are only
    // read by later header bytes we never look at. Mutating key[1..3] is therefore sufficient and exact.
    return decryptBytes(buf, off, 4, scanKey);
  }

  decryptFrame(buf: Uint8Array, off: number, len: number): Uint8Array {
    return decryptBytes(buf, off, len, this.receiveKey);
  }

  encryptFrame(plain: Uint8Array): Uint8Array {
    return this.enabled ? encryptBytes(plain, this.sendKey) : plain.slice();
  }
}

/** Plaintext connection. */
export const NULL_CIPHER: FrameCipher = Object.freeze({
  enabled: false,
  beginScan: () => new Uint8Array(8),
  peekHeader: (buf: Uint8Array, off: number) => buf.slice(off, off + 4),
  decryptFrame: (buf: Uint8Array, off: number, len: number) => buf.slice(off, off + len),
  encryptFrame: (plain: Uint8Array) => plain.slice(),
});
