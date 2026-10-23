/**
 * Lista dos "SWFs" que existem como assets exportados (`assets/index.json`,
 * gerado pelo tools/swf-export). Usada pra decidir se uma URL `.swf`/`.png`
 * pedida pelo jogo é uma biblioteca exportada ou uma imagem comum.
 */
import { libraryKey } from "./SwfLibrary";
import { assetUrl } from "./paths";

let keys: Set<string> | null = null;

/** boot chama uma vez antes de iniciar o jogo */
export async function loadAssetIndex(): Promise<void> {
  try {
    const r = await fetch(assetUrl("index.json"));
    keys = r.ok ? new Set<string>((await r.json()) as string[]) : new Set();
  } catch {
    keys = new Set();
  }
}

export function isExportedSwf(url: string): boolean {
  const k = libraryKey(url);
  if (virtualSwfs.has(k)) return true;
  if (keys) return keys.has(k);
  return /\.swf(\?|$)/i.test(url);
}

/** "SWFs" que não têm arte, só código que já foi convertido (ex.: núcleo `2.png`) */
export const virtualSwfs = new Set<string>();
export function registerVirtualSwf(key: string): void {
  virtualSwfs.add(key.toLowerCase());
}
