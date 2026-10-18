/**
 * Bus de teste: várias instâncias que compartilham o mesmo `MemoryHub` ficam "ligadas" — publish de uma
 * chega nas outras (inclusive nela mesma, igual Redis pub/sub real), sem precisar de Redis de verdade.
 * Usado por `apps/game/test/ch-bus.test.ts` pra simular 2 canais/processos `apps/game` reais coordenados,
 * do mesmo jeito que `ch-processo.test.ts` simula 2 processos no mesmo Postgres.
 */
import type { Bus } from "./index.js";

export interface MemoryHub {
  subs: Map<string, Set<(msg: unknown) => void>>;
}

export function createMemoryHub(): MemoryHub {
  return { subs: new Map() };
}

export function createMemoryBus(hub: MemoryHub): Bus {
  let closed = false;
  return {
    active: true,
    publish(topic, msg) {
      if (closed) return;
      const set = hub.subs.get(topic);
      if (!set || set.size === 0) return;
      // microtask (não síncrono): mais parecido com Redis de verdade, e evita reentrância na mesma call stack.
      for (const fn of [...set]) queueMicrotask(() => fn(msg));
    },
    subscribe(topic, fn) {
      let set = hub.subs.get(topic);
      if (!set) {
        set = new Set();
        hub.subs.set(topic, set);
      }
      set.add(fn);
      return () => set!.delete(fn);
    },
    async close() {
      closed = true;
    },
  };
}
