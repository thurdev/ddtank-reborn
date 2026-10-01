/**
 * Stream framing. Input may be TCP data or WebSocket binary messages split/merged arbitrarily.
 *
 * ServerFrameDecoder is a literal port of the receive path of the C# server:
 *   BaseClient.ReceiveAsyncImp/RecvEventCallback (8192-byte read buffer, a read never exceeds the free space),
 *   GameClient.OnRecv (in-band policy-file answer), StreamProcessor.ReceiveBytes (scan for 0x71AB, length checks,
 *   resync, partial tails, encrypted header peek with a cloned key, Strict disconnect).
 * Because it is a literal port it yields exactly the same packets / key states / disconnects as the C# for any
 * chunking (verified against golden vectors produced by the original source).
 *
 * ClientFrameDecoder mirrors the AS3 client (ByteSocket.readPackage + handlePackage) for bots / test clients.
 */
import { NULL_CIPHER, type FrameCipher } from "./cipher.js";
import { HDR_SIZE, PACKET_BUFFER_SIZE, PACKET_HEADER, POLICY_TRIGGER_BYTE } from "./constants.js";
import { GSPacket } from "./packet.js";

export type DisconnectReason =
  /** header length outside [20, 8192] while Strict (StreamProcessor.ReceiveBytes). */
  | "bad-length"
  /** read buffer full (BaseClient.ReceiveAsyncImp "buffer overflow"). */
  | "buffer-overflow"
  /** an exception inside ReceiveBytes (e.g. encrypted header peek reading past the 8192 buffer). */
  | "exception";

export interface ServerFrameDecoderOptions {
  /** Cipher (RollingKeyCipher for game clients, NULL_CIPHER / disabled for inter-server links). */
  cipher?: FrameCipher;
  /** BaseClient.Strict (default true). Center/Fighting set it to false after the inter-server login. */
  strict?: boolean;
  /**
   * Answer `<policy-file-request/>` in-band (GameClient behaviour: while no packet has been received yet,
   * if the first buffered byte is '<' the read is dropped and POLICY is sent). Default true.
   * Inter-server sockets (Center/Fighting ServerClient) do not do this; pass false there.
   */
  policy?: boolean;
  /** Receive buffer size (default 8192, as on the server). */
  bufferSize?: number;
  /** Called synchronously for every packet. Key changes (setKey) made here apply to the next packet. */
  onPacket: (pkt: GSPacket) => void;
  /** Called when the server would send POLICY_RESPONSE (and keep the socket open; Flash closes it). */
  onPolicyRequest?: () => void;
  /** Called once when the C# would call Disconnect(). Further input is ignored. */
  onDisconnect?: (reason: DisconnectReason) => void;
  /** Exceptions thrown by onPacket are caught and reported here (C#: log.Error("HandlePacket(pak)")). */
  onHandlerError?: (err: unknown, pkt: GSPacket) => void;
}

export class ServerFrameDecoder {
  readonly buf: Uint8Array;
  /** BaseClient.PacketBufSize. */
  size = 0;
  cipher: FrameCipher;
  strict: boolean;
  policy: boolean;
  /** GameClient: m_packetProcessor != null (set by the first received packet). */
  handshakeDone = false;
  closed = false;
  private readonly opts: ServerFrameDecoderOptions;

  constructor(opts: ServerFrameDecoderOptions) {
    this.opts = opts;
    this.cipher = opts.cipher ?? NULL_CIPHER;
    this.strict = opts.strict ?? true;
    this.policy = opts.policy ?? true;
    this.buf = new Uint8Array(opts.bufferSize ?? PACKET_BUFFER_SIZE);
  }

  /** Bytes currently buffered (partial frame). */
  pending(): Uint8Array {
    return this.buf.slice(0, this.size);
  }

  /** Feed a chunk of any size. */
  push(chunk: Uint8Array): void {
    let off = 0;
    let len = chunk.length;
    while (len > 0 && !this.closed) {
      const free = this.buf.length - this.size;
      if (free <= 0) {
        this.disconnect("buffer-overflow");
        return;
      }
      const n = Math.min(free, len);
      this.buf.set(chunk.subarray(off, off + n), this.size);
      this.onRecv(n);
      off += n;
      len -= n;
    }
  }

  /** GameClient.OnRecv. */
  private onRecv(n: number): void {
    if (!this.handshakeDone && this.policy && this.buf[0] === POLICY_TRIGGER_BYTE) {
      // m_sock.Send(POLICY); bytes are NOT consumed (m_readBufEnd unchanged) and get overwritten by the next read.
      this.opts.onPolicyRequest?.();
      return;
    }
    try {
      this.receiveBytes(n);
    } catch (err) {
      // RecvEventCallback catch -> Disconnect()
      this.disconnect("exception");
      if (!(err instanceof ScanOutOfRange)) throw err;
    }
  }

  private disconnect(reason: DisconnectReason): void {
    if (this.closed) return;
    this.closed = true;
    this.opts.onDisconnect?.(reason);
  }

  /** StreamProcessor.ReceiveBytes, line by line. */
  private receiveBytes(numBytes: number): void {
    const packetBuf = this.buf;
    const num = this.size + numBytes;
    if (num < HDR_SIZE) {
      this.size = num;
      return;
    }
    this.size = 0;
    let cur = 0;
    const max = packetBuf.length;
    do {
      let num2 = 0;
      if (this.cipher.enabled) {
        const scanKey = this.cipher.beginScan();
        for (; cur + 4 < num; cur++) {
          // decryptBytes(packetBuf, curOffset, 8, ...) reads up to curOffset + 7 -> IndexOutOfRange near the end.
          if (cur + 7 >= max) throw new ScanOutOfRange();
          const h = this.cipher.peekHeader(packetBuf, cur, scanKey);
          if ((h[0]! << 8) + h[1]! === PACKET_HEADER) {
            num2 = (h[2]! << 8) + h[3]!;
            break;
          }
        }
      } else {
        for (; cur + 4 < num; cur++) {
          if ((packetBuf[cur]! << 8) + packetBuf[cur + 1]! === PACKET_HEADER) {
            num2 = (packetBuf[cur + 2]! << 8) + packetBuf[cur + 3]!;
            break;
          }
        }
      }
      if ((num2 === 0 || num2 >= HDR_SIZE) && num2 <= max) {
        const length = num - cur;
        if (length >= num2 && num2 !== 0) {
          const pkg = this.extract(cur, num2);
          this.emit(pkg);
          if (this.closed) return;
          cur += num2;
          continue;
        }
        packetBuf.copyWithin(0, cur, num);
        this.size = length;
        break;
      }
      this.size = 0;
      if (this.strict) this.disconnect("bad-length");
      return;
    } while (num - 1 > cur);
    if (num - 1 === cur) {
      packetBuf[0] = packetBuf[cur]!;
      this.size = 1;
    }
  }

  /** new GSPacketIn(new byte[8192], 8192) + CopyFrom/CopyFrom3 + ReadHeader. */
  private extract(cur: number, count: number): GSPacket {
    const max = this.buf.length;
    const target = new Uint8Array(max);
    if (this.cipher.enabled) {
      // CopyFrom3 first copies src[0..count) (from index 0, not srcOffset!) and only decrypts when count < 8192.
      target.set(this.buf.subarray(0, count), 0);
      if (count < max) target.set(this.cipher.decryptFrame(this.buf, cur, count), 0);
    } else if (count < max) {
      // CopyFrom refuses count >= buffer length (returns -1, buffer stays zeroed): the 8192-byte frame quirk.
      target.set(this.buf.subarray(cur, cur + count), 0);
    }
    return GSPacket.wrap(target, max);
  }

  private emit(pkg: GSPacket): void {
    this.handshakeDone = true;
    try {
      this.opts.onPacket(pkg);
    } catch (err) {
      if (this.opts.onHandlerError) this.opts.onHandlerError(err, pkg);
      else console.error("[@ddt/protocol] packet handler error", err);
    }
  }
}

class ScanOutOfRange extends Error {}

/**
 * Encodes outgoing packets: writeHeader() (checksum) then encrypt with the send key.
 * Byte-identical to StreamProcessor.SendTCP + AsyncTcpSendCallback/CopyTo3 for any number of queued packets.
 */
export function encodeFrame(pkt: GSPacket, cipher: FrameCipher = NULL_CIPHER): Uint8Array {
  const plain = pkt.encode();
  return cipher.enabled ? cipher.encryptFrame(plain) : plain;
}

// ---------------------------------------------------------------------------------------------- client side

export interface ClientFrameDecoderOptions {
  /** Receive key (ByteSocket.RECEIVE_KEY) and enabled flag; usually a RollingKeyCipher shared with the sender. */
  cipher?: FrameCipher;
  /** Drop packets whose checksum mismatches (ByteSocket.handlePackage). Default true. */
  verifyChecksum?: boolean;
  onPacket: (pkt: GSPacket) => void;
  onChecksumError?: (pkt: GSPacket) => void;
}

/**
 * AS3 client receive path (ByteSocket.handleIncoming/readPackage/handlePackage): scans for 0x71AB using a FRESH
 * copy of the receive key at each offset, reads the length as u16, waits for the full frame, decrypts with the
 * real key (PackageIn.loadE) and drops frames whose checksum is wrong. No length validation (like the client).
 */
export class ClientFrameDecoder {
  private data = new Uint8Array(16384);
  private writeOffset = 0;
  cipher: FrameCipher;
  private readonly opts: ClientFrameDecoderOptions;

  constructor(opts: ClientFrameDecoderOptions) {
    this.opts = opts;
    this.cipher = opts.cipher ?? NULL_CIPHER;
  }

  push(chunk: Uint8Array): void {
    if (this.writeOffset + chunk.length > this.data.length) {
      const next = new Uint8Array(Math.max(this.data.length * 2, this.writeOffset + chunk.length));
      next.set(this.data.subarray(0, this.writeOffset));
      this.data = next;
    }
    this.data.set(chunk, this.writeOffset);
    this.writeOffset += chunk.length;
    if (this.writeOffset >= HDR_SIZE) this.readPackages();
  }

  private readPackages(): void {
    let readOffset = 0;
    let remaining = this.writeOffset;
    do {
      let len = 0;
      while (readOffset + 4 < this.writeOffset) {
        const h = this.cipher.enabled
          ? this.cipher.peekHeader(this.data, readOffset, this.cipher.beginScan())
          : this.data.subarray(readOffset, readOffset + 4);
        if (((h[0]! << 8) | h[1]!) === PACKET_HEADER) {
          len = (h[2]! << 8) | h[3]!;
          break;
        }
        readOffset++;
      }
      remaining = this.writeOffset - readOffset;
      if (!(remaining >= len && len !== 0)) break;
      const plain = this.cipher.enabled
        ? this.cipher.decryptFrame(this.data, readOffset, len)
        : this.data.slice(readOffset, readOffset + len);
      readOffset += len;
      remaining = this.writeOffset - readOffset;
      const pkt = GSPacket.wrap(plain, plain.length);
      if ((this.opts.verifyChecksum ?? true) && !pkt.verifyChecksum()) {
        this.opts.onChecksumError?.(pkt);
      } else {
        pkt.offset = HDR_SIZE;
        this.opts.onPacket(pkt);
      }
    } while (remaining >= HDR_SIZE);
    this.data.copyWithin(0, readOffset, this.writeOffset);
    this.writeOffset = Math.max(0, remaining);
  }
}
