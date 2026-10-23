/**
 * Ligação classe → símbolo de SWF. Quando uma classe de linkage
 * (`asset.hall.xxx`) é criada, `SwfLibrary` grava nela `$symbol`; os
 * construtores de Sprite/MovieClip/SimpleButton/BitmapData leem daqui pra
 * montar o conteúdo (filhos do frame 1, timeline, imagem).
 */
import type { CharT } from "./library-types";

export interface SymbolBinding {
  /** biblioteca que cria os caracteres filhos */
  lib: { create(id: number): any; key: string; texture(id: number): any; image(id: number): any };
  id: number;
  char: CharT;
  linkage?: string;
}

/** símbolo da classe mais próxima na hierarquia */
export function symbolOf(ctor: any): SymbolBinding | undefined {
  for (let c = ctor; c && c !== Object; c = Object.getPrototypeOf(c)) {
    if (Object.hasOwn(c, "$symbol")) return c.$symbol;
  }
  return undefined;
}

/** objeto sendo criado pela própria biblioteca (caractere sem classe) */
let pending: SymbolBinding | undefined;
export function withSymbol<T>(b: SymbolBinding, f: () => T): T {
  const prev = pending;
  pending = b;
  try { return f(); } finally { pending = prev; }
}
/** consome o símbolo pendente (só o 1º construtor da cadeia pega) */
export function takePendingSymbol(): SymbolBinding | undefined {
  const p = pending;
  pending = undefined;
  return p;
}
