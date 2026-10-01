/**
 * zlib helpers (Node only).
 *
 * Marshal.Compress = zlib.NET ZOutputStream(level 9): a standard zlib stream (78 DA ... adler32).
 * Node's deflate at level 9 produces a stream the client inflates identically (ByteArray.uncompress) but it is
 * not always byte-identical to zlib.NET (zlib.NET is a port of zlib 1.1.x; e.g. 2112 vs 2114 bytes on a 10 KB XML).
 */
import { deflateSync, inflateSync } from "node:zlib";
import { HDR_SIZE } from "./constants.js";
import type { GSPacket } from "./packet.js";

/** Marshal.Compress(src) / StaticFunction.Compress. */
export function compress(src: Uint8Array): Uint8Array {
  return new Uint8Array(deflateSync(src, { level: 9 }));
}

/** Marshal.Uncompress / AS3 ByteArray.uncompress. */
export function uncompress(src: Uint8Array): Uint8Array {
  return new Uint8Array(inflateSync(src));
}

/** GSPacketIn.Compress(): deflate body [20, length) in place; length = 20 + compressed.length. */
export function compressPacket(pkt: GSPacket): void {
  const body = pkt.buffer.slice(HDR_SIZE, pkt.length);
  pkt.setBody(compress(body));
}

/** PackageIn.deCompress(): inflate body in place (client side), offset = 20. */
export function uncompressPacket(pkt: GSPacket): void {
  const body = pkt.buffer.slice(HDR_SIZE, pkt.length);
  pkt.setBody(uncompress(body));
  pkt.offset = HDR_SIZE;
}
