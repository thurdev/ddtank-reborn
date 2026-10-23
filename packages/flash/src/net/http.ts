/**
 * Requisição HTTP comum pra URLLoader/Loader/URLStream: monta URL + corpo
 * como o Flash (GET com URLVariables na query, POST com form), loga no modo
 * debug e permite redirecionar URLs (`setUrlRewriter`) — o boot usa pra
 * apontar `/flash/...` e `/resource/...` pros assets exportados.
 */
import { dlog } from "../debug";
import { ByteArray } from "../utils/ByteArray";

let rewriter: ((url: string) => string) | null = null;
/** troca/normaliza URLs antes de buscar (ex.: base do servidor) */
export function setUrlRewriter(f: ((url: string) => string) | null): void { rewriter = f; }
export function rewriteUrl(url: string): string { return rewriter ? rewriter(url) : url; }

let responseFilter: ((url: string, bytes: Uint8Array) => Uint8Array) | null = null;
/** permite ajustar respostas (o boot usa pra desligar USE_MD5 no config.xml: não existe mais SWF pra conferir) */
export function setResponseFilter(f: ((url: string, bytes: Uint8Array) => Uint8Array) | null): void { responseFilter = f; }

export interface HttpResult {
  status: number;
  bytes: Uint8Array;
  url: string;
}

export async function httpRequest(req: { url: string; method?: string; data?: any; contentType?: string | null }): Promise<HttpResult> {
  let url = rewriteUrl(req.url);
  const method = (req.method ?? "GET").toUpperCase();
  let body: BodyInit | undefined;
  const headers: Record<string, string> = {};
  const data = req.data;
  if (data !== null && data !== undefined) {
    if (method === "GET") {
      const q = data instanceof ByteArray ? data.toString() : String(data);
      if (q) url += (url.includes("?") ? "&" : "?") + q;
    } else if (data instanceof ByteArray) {
      body = data.$bytes().slice();
      headers["Content-Type"] = req.contentType ?? "application/octet-stream";
    } else {
      body = String(data);
      headers["Content-Type"] = req.contentType ?? "application/x-www-form-urlencoded";
    }
  }
  const t0 = performance.now();
  const r = await fetch(url, { method, body, headers });
  let bytes: Uint8Array = new Uint8Array(await r.arrayBuffer());
  if (responseFilter) bytes = responseFilter(url, bytes);
  dlog("http", `${method} ${url} → ${r.status} (${bytes.length} bytes, ${Math.round(performance.now() - t0)}ms)`);
  return { status: r.status, bytes, url };
}
