/** Node-only RSA key helpers (key generation / PEM import). Decryption itself is pure BigInt (rsa.ts). */
import { createPrivateKey, generateKeyPairSync, type KeyObject } from "node:crypto";
import { base64ToBytes, bytesToBigInt, type RsaPrivateKey } from "./rsa.js";

function b64u(s: string | undefined): bigint {
  if (!s) throw new Error("missing JWK field");
  return bytesToBigInt(base64ToBytes(s));
}

export function rsaKeyFromKeyObject(k: KeyObject): RsaPrivateKey {
  const j = k.export({ format: "jwk" });
  return { n: b64u(j.n), e: b64u(j.e), d: b64u(j.d), p: b64u(j.p), q: b64u(j.q), dp: b64u(j.dp), dq: b64u(j.dq), qi: b64u(j.qi) };
}

/** Import a PKCS#1/PKCS#8 PEM private key. */
export function rsaKeyFromPem(pem: string): RsaPrivateKey {
  return rsaKeyFromKeyObject(createPrivateKey(pem));
}

/**
 * Generates a new key pair. Use 1024 bits for the Flash client (DDT.as embeds a 128-byte modulus; a same-size
 * modulus keeps the base64 string at 172 chars, which makes patching the SWF straightforward).
 */
export function generateRsaKey(bits = 1024): RsaPrivateKey {
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: bits, publicExponent: 65537 });
  return rsaKeyFromKeyObject(privateKey);
}
