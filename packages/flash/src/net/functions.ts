/** Funções de pacote de `flash.net`. */
import { dlog } from "../debug";
import { rewriteUrl } from "./http";
import type { URLRequest } from "./URLRequest";

/** abre página (recarga, fórum, site...) */
export function navigateToURL(request: URLRequest, window_: string | null = null): void {
  let url = rewriteUrl(request.url);
  if (request.data) url += (url.includes("?") ? "&" : "?") + String(request.data);
  dlog("http", `navigateToURL ${url} (${window_ ?? "_blank"})`);
  if (window_ === "_self" || window_ === "_top" || window_ === "_parent") location.href = url;
  else globalThis.open(url, window_ ?? "_blank");
}

/** envia sem esperar resposta (estatísticas) */
export function sendToURL(request: URLRequest): void {
  void fetch(rewriteUrl(request.url), { method: request.method, mode: "no-cors" }).catch(() => {});
}

export function registerClassAlias(_alias: string, _cls: any): void {}
export function getClassByAlias(_alias: string): any { return null; }
