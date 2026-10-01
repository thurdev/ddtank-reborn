/** Minimal HS256 JWT (node:crypto). */
import { createHmac, timingSafeEqual } from "node:crypto";

export interface Claims {
  sub: number;
  name: string;
  role: string;
  iat: number;
  exp: number;
}

const b64u = (b: Buffer | string) => Buffer.from(b).toString("base64url");

export function signJwt(payload: Omit<Claims, "iat" | "exp">, secret: string, ttlSec: number): string {
  const now = Math.floor(Date.now() / 1000);
  const head = b64u(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64u(JSON.stringify({ ...payload, iat: now, exp: now + ttlSec }));
  const sig = createHmac("sha256", secret).update(`${head}.${body}`).digest("base64url");
  return `${head}.${body}.${sig}`;
}

export function verifyJwt(token: string, secret: string): Claims | null {
  const [h, b, s] = token.split(".");
  if (!h || !b || !s) return null;
  const want = createHmac("sha256", secret).update(`${h}.${b}`).digest();
  const got = Buffer.from(s, "base64url");
  if (got.length !== want.length || !timingSafeEqual(got, want)) return null;
  try {
    const c = JSON.parse(Buffer.from(b, "base64url").toString("utf8")) as Claims;
    return c.exp > Date.now() / 1000 ? c : null;
  } catch {
    return null;
  }
}
