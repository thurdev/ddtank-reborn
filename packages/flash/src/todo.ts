/**
 * Marca API do Flash ainda não implementada. Avisa UMA vez por nome no
 * console (sempre, não só no modo debug) — é o jeito de achar o que falta.
 */
const warned = new Set<string>();
export function $todo(name: string): any {
  if (!warned.has(name)) {
    warned.add(name);
    console.warn(`[flash] não implementado: ${name}`);
  }
  return undefined;
}
