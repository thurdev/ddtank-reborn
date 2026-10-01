/**
 * RSA used by the DDTank 4.1 login (PKCS#1 v1.5 type 2, 1024-bit key, no OAEP).
 *
 * Implemented with BigInt on purpose: Node >= 18.19/20.11 refuses `privateDecrypt` with RSA_PKCS1_PADDING
 * (CVE-2023-46809 / Marvin) unless started with --security-revert. This module never uses that path.
 *
 * Client:  hurlant RSAKey.encrypt (ddt/utils/CrytoUtils.rsaEncry5) with the public key hardcoded in DDT.as
 *          (base64 modulus + "AQAB"). NOTE: hurlant's BigInteger.toArray drops leading zero bytes, so ~1/256 of
 *          ciphertexts are shorter than the modulus; we left-pad instead of failing.
 * Server:  WorldMgr.RsaCryptor = RSACryptoServiceProvider.FromXmlString(GameServer config "PrivateKey");
 *          UserLoginHandler: RsaCryptor.Decrypt(packet.ReadBytes(), fOAEP: false).
 */
import { GSPacket, PacketOut } from "./packet.js";

export interface RsaPublicKey {
  n: bigint;
  e: bigint;
}

export interface RsaPrivateKey extends RsaPublicKey {
  d: bigint;
  p?: bigint;
  q?: bigint;
  dp?: bigint;
  dq?: bigint;
  qi?: bigint;
}

export class RsaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RsaError";
  }
}

// ------------------------------------------------------------------------------------------- bigint helpers

export function bytesToBigInt(b: Uint8Array): bigint {
  let x = 0n;
  for (const v of b) x = (x << 8n) | BigInt(v);
  return x;
}

/** Big-endian unsigned, left-padded to `len` (or minimal length when len is omitted). */
export function bigIntToBytes(x: bigint, len?: number): Uint8Array {
  const hex = x.toString(16);
  const minLen = Math.ceil(hex.length / 2);
  const n = len ?? minLen;
  if (minLen > n) throw new RsaError("integer too large");
  const out = new Uint8Array(n);
  let v = x;
  for (let i = n - 1; i >= 0 && v > 0n; i--) {
    out[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return out;
}

export function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
  let result = 1n;
  let b = base % mod;
  let e = exp;
  while (e > 0n) {
    if (e & 1n) result = (result * b) % mod;
    e >>= 1n;
    b = (b * b) % mod;
  }
  return result;
}

function byteLength(n: bigint): number {
  return Math.ceil(n.toString(16).length / 2);
}

// ------------------------------------------------------------------------------------------- base64 / XML

export function base64ToBytes(s: string): Uint8Array {
  const bin = atob(s.replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function bytesToBase64(b: Uint8Array): string {
  let s = "";
  for (const v of b) s += String.fromCharCode(v);
  return btoa(s);
}

function xmlField(xml: string, tag: string): bigint | undefined {
  const m = new RegExp(`<${tag}>([^<]*)</${tag}>`).exec(xml);
  return m ? bytesToBigInt(base64ToBytes(m[1]!)) : undefined;
}

/**
 * Parses .NET `RSA.ToXmlString(true|false)` output (`<RSAKeyValue><Modulus>..</Modulus>...`). HTML-escaped input
 * (as stored in App.config: `&lt;RSAKeyValue&gt;...`) is accepted too.
 */
export function parseDotNetRsaXml(xmlIn: string): RsaPrivateKey | RsaPublicKey {
  const xml = xmlIn.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
  const n = xmlField(xml, "Modulus");
  const e = xmlField(xml, "Exponent");
  if (n === undefined || e === undefined) throw new RsaError("RSAKeyValue without Modulus/Exponent");
  const d = xmlField(xml, "D");
  if (d === undefined) return { n, e };
  return { n, e, d, p: xmlField(xml, "P"), q: xmlField(xml, "Q"), dp: xmlField(xml, "DP"), dq: xmlField(xml, "DQ"), qi: xmlField(xml, "InverseQ") };
}

/** Serializes to .NET `ToXmlString` format (field order as .NET writes it). */
export function toDotNetRsaXml(key: RsaPublicKey | RsaPrivateKey, includePrivate = true): string {
  const b64 = (x: bigint, len?: number) => bytesToBase64(bigIntToBytes(x, len));
  const k = byteLength(key.n);
  let s = `<RSAKeyValue><Modulus>${b64(key.n)}</Modulus><Exponent>${b64(key.e)}</Exponent>`;
  const pk = key as RsaPrivateKey;
  if (includePrivate && pk.d !== undefined) {
    if (pk.p === undefined || pk.q === undefined || pk.dp === undefined || pk.dq === undefined || pk.qi === undefined) {
      throw new RsaError(".NET XML needs P, Q, DP, DQ, InverseQ");
    }
    const h = k / 2;
    s += `<P>${b64(pk.p, h)}</P><Q>${b64(pk.q, h)}</Q><DP>${b64(pk.dp, h)}</DP><DQ>${b64(pk.dq, h)}</DQ><InverseQ>${b64(pk.qi, h)}</InverseQ><D>${b64(pk.d, k)}</D>`;
  }
  return s + "</RSAKeyValue>";
}

/** The two base64 strings the Flash client embeds (DDT.as: `_loc1_` modulus, `_loc2_` exponent). */
export function clientPublicKeyStrings(key: RsaPublicKey): { modulus: string; exponent: string } {
  return { modulus: bytesToBase64(bigIntToBytes(key.n)), exponent: bytesToBase64(bigIntToBytes(key.e)) };
}

export function publicKeyFromClientStrings(modulus: string, exponent = "AQAB"): RsaPublicKey {
  return { n: bytesToBigInt(base64ToBytes(modulus)), e: bytesToBigInt(base64ToBytes(exponent)) };
}

// ------------------------------------------------------------------------------------------- primitives

function rsaPrivate(key: RsaPrivateKey, c: bigint): bigint {
  if (key.p !== undefined && key.q !== undefined && key.dp !== undefined && key.dq !== undefined && key.qi !== undefined) {
    const m1 = modPow(c % key.p, key.dp, key.p);
    const m2 = modPow(c % key.q, key.dq, key.q);
    let h = ((m1 - m2) * key.qi) % key.p;
    if (h < 0n) h += key.p;
    return m2 + h * key.q;
  }
  return modPow(c, key.d, key.n);
}

/**
 * RSACryptoServiceProvider.Decrypt(data, fOAEP: false): one block, PKCS#1 v1.5 type 2
 * (00 02 PS{>=8 non-zero} 00 M). Throws RsaError on bad padding (the server then kicks the user:
 * "UserLoginHandler.RsaCryptorError"). Inputs shorter than the modulus are left-padded (hurlant quirk).
 */
export function rsaDecryptPkcs1(key: RsaPrivateKey, data: Uint8Array): Uint8Array {
  const k = byteLength(key.n);
  if (data.length === 0 || data.length > k) throw new RsaError(`bad ciphertext length ${data.length} (key ${k})`);
  const c = bytesToBigInt(data);
  if (c >= key.n) throw new RsaError("ciphertext out of range");
  const em = bigIntToBytes(rsaPrivate(key, c), k);
  if (em[0] !== 0 || em[1] !== 2) throw new RsaError("bad PKCS#1 v1.5 header");
  let i = 2;
  while (i < k && em[i] !== 0) i++;
  if (i >= k || i - 2 < 8) throw new RsaError("bad PKCS#1 v1.5 padding");
  return em.slice(i + 1);
}

function randomNonZero(n: number): Uint8Array {
  const out = new Uint8Array(n);
  let filled = 0;
  while (filled < n) {
    const tmp = crypto.getRandomValues(new Uint8Array(n));
    for (const v of tmp) if (v !== 0 && filled < n) out[filled++] = v;
  }
  return out;
}

/**
 * PKCS#1 v1.5 type-2 encryption (what the Flash client does). Messages longer than k-11 bytes are split into
 * several blocks like hurlant does (the C# server only decrypts ONE block, so keep "user,pass" short).
 * `random` may be injected for deterministic tests (must return non-zero bytes).
 */
export function rsaEncryptPkcs1(key: RsaPublicKey, data: Uint8Array, random: (n: number) => Uint8Array = randomNonZero): Uint8Array {
  const k = byteLength(key.n);
  const blockMax = k - 11;
  const blocks: Uint8Array[] = [];
  let pos = 0;
  do {
    const chunk = data.subarray(pos, pos + blockMax);
    pos += chunk.length;
    const em = new Uint8Array(k);
    em[1] = 2;
    const ps = random(k - 3 - chunk.length);
    em.set(ps, 2);
    em[2 + ps.length] = 0;
    em.set(chunk, 3 + ps.length);
    blocks.push(bigIntToBytes(modPow(bytesToBigInt(em), key.e, key.n), k));
  } while (pos < data.length);
  const out = new Uint8Array(blocks.reduce((a, b) => a + b.length, 0));
  let o = 0;
  for (const b of blocks) {
    out.set(b, o);
    o += b.length;
  }
  return out;
}

// ------------------------------------------------------------------------------------------- LOGIN payload

export interface LoginPayload {
  /** 7 bytes: i16 yearUTC, monthUTC+1, dateUTC, hoursUTC, minutesUTC, secondsUTC (client clock, unchecked). */
  date: { year: number; month: number; day: number; hour: number; minute: number; second: number };
  /** New rolling key (src[7..15)) -> BaseClient.setKey. */
  key: Uint8Array;
  /** UTF-8 text after byte 15 ("user,password"). */
  text: string;
  /** text.split(','); the server requires exactly two parts (else "UserLoginHandler.LoginError"). */
  user: string | null;
  password: string | null;
}

/** UserLoginHandler: tempKey = src[7..15), Encoding.UTF8.GetString(src, 15, len - 15).Split(','). */
export function parseLoginPayload(src: Uint8Array): LoginPayload {
  if (src.length < 15) throw new RsaError(`login payload too short (${src.length})`);
  const dv = new DataView(src.buffer, src.byteOffset, src.length);
  const text = new TextDecoder("utf-8").decode(src.subarray(15));
  const parts = text.split(",");
  return {
    date: { year: dv.getInt16(0), month: src[2]!, day: src[3]!, hour: src[4]!, minute: src[5]!, second: src[6]! },
    key: src.slice(7, 15),
    text,
    user: parts.length === 2 ? parts[0]! : null,
    password: parts.length === 2 ? parts[1]! : null,
  };
}

/** GameSocketOut.sendLogin plaintext (before RSA). */
export function buildLoginPayload(user: string, password: string, key: ArrayLike<number>, now = new Date()): Uint8Array {
  const text = new TextEncoder().encode(`${user},${password}`);
  const out = new Uint8Array(15 + text.length);
  const dv = new DataView(out.buffer);
  dv.setInt16(0, now.getUTCFullYear());
  out[2] = now.getUTCMonth() + 1;
  out[3] = now.getUTCDate();
  out[4] = now.getUTCHours();
  out[5] = now.getUTCMinutes();
  out[6] = now.getUTCSeconds();
  for (let i = 0; i < 8; i++) out[7 + i] = key[i]! & 0xff;
  out.set(text, 15);
  return out;
}

/** Client type that makes UserLoginHandler ignore the packet. */
export const LOGIN_CLIENT_TYPE_IGNORED = 69;

export interface LoginPacket {
  version: number;
  clientType: number;
  /** null when clientType == 69 (ignored by the server). */
  payload: LoginPayload | null;
}

/** UserLoginHandler.HandlePacket parsing: ReadInt version, ReadInt clientType, RSA(ReadBytes()). */
export function parseLoginPacket(pkt: GSPacket, key: RsaPrivateKey): LoginPacket {
  const version = pkt.readInt();
  const clientType = pkt.readInt();
  if (clientType === LOGIN_CLIENT_TYPE_IGNORED) return { version, clientType, payload: null };
  const src = rsaDecryptPkcs1(key, pkt.readBytes());
  return { version, clientType, payload: parseLoginPayload(src) };
}

/** Client-side LOGIN packet (code 1), for bots/tests. Caller must then cipher.setKey(key) AFTER encoding it. */
export function buildLoginPacket(opts: {
  publicKey: RsaPublicKey;
  user: string;
  password: string;
  key: ArrayLike<number>;
  version?: number;
  clientType?: number;
  now?: Date;
}): PacketOut {
  const pkt = new PacketOut(1);
  pkt.writeInt(opts.version ?? 0);
  pkt.writeInt(opts.clientType ?? 0);
  pkt.write(rsaEncryptPkcs1(opts.publicKey, buildLoginPayload(opts.user, opts.password, opts.key, opts.now)));
  return pkt;
}

// ------------------------------------------------------------------------------------------- inter-server

/** Center/Fighting ServerClient.SendRSAKey: code 0 (RSAKey), body = modulus (128 bytes) + exponent. */
export function buildInterServerRsaKeyPacket(key: RsaPublicKey): PacketOut {
  const pkt = new PacketOut(0);
  pkt.write(bigIntToBytes(key.n, 128));
  pkt.write(bigIntToBytes(key.e));
  return pkt;
}

/** LoginServerConnector/FightServerConnector.HandleRSAKey: ReadBytes(128) modulus, ReadBytes() exponent. */
export function parseInterServerRsaKeyPacket(pkt: GSPacket): RsaPublicKey {
  return { n: bytesToBigInt(pkt.readBytes(128)), e: bytesToBigInt(pkt.readBytes()) };
}

/** SendRSALogin: code 1, body = RSA(UTF-8 "serverid,name") (Center) or RSA(key) (Fighting). */
export function buildInterServerLoginPacket(key: RsaPublicKey, loginKey: string): PacketOut {
  const pkt = new PacketOut(1);
  pkt.write(rsaEncryptPkcs1(key, new TextEncoder().encode(loginKey)));
  return pkt;
}

export function parseInterServerLoginPacket(pkt: GSPacket, key: RsaPrivateKey): string[] {
  return new TextDecoder("utf-8").decode(rsaDecryptPkcs1(key, pkt.readBytes())).split(",");
}
