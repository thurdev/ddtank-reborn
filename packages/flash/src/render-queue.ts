/**
 * Coisas que mudam muitas vezes por frame (comandos de Graphics, pixels de
 * BitmapData) só são enviadas pra GPU uma vez, logo antes de desenhar.
 * O Player chama `flushRenderQueue()` antes de cada render.
 */
export interface Flushable {
  $flush(): void;
}

const queue = new Set<Flushable>();

export function queueFlush(o: Flushable): void {
  queue.add(o);
}

export function flushRenderQueue(): void {
  if (!queue.size) return;
  const items = [...queue];
  queue.clear();
  for (const o of items) o.$flush();
}
