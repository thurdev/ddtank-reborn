/**
 * Onde ficam os assets exportados (PNG + library.json). Padrão: `/assets/`
 * no mesmo servidor do cliente; o boot pode mudar com `setAssetBase`.
 */
let base = "/assets/";

export function setAssetBase(url: string): void {
  base = url.endsWith("/") ? url : url + "/";
}

export function assetUrl(key: string): string {
  return base + key.replace(/^\/+/, "");
}
