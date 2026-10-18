/**
 * Implementação real do `Bus` (bus/index.ts) com Redis pub/sub (`ioredis`). Só é carregada quando
 * `REDIS_URL` está configurado (createBus, bus/index.ts) — sem isso o processo nunca abre conexão com Redis.
 * 2 conexões (PUB/SUB): a `ioredis` exige uma conexão dedicada em modo subscriber, que não pode mais rodar
 * comandos normais (inclusive PUBLISH) — por isso uma conexão só publica e a outra só assina.
 */
import { Redis } from "ioredis";
import type { Bus } from "./index.js";

export function createRedisBus(url: string, log: (msg: string) => void): Bus {
  const pub = new Redis(url, { lazyConnect: false });
  const sub = new Redis(url, { lazyConnect: false });
  pub.on("error", (e: Error) => log(`bus redis (pub): ${e.message}`));
  sub.on("error", (e: Error) => log(`bus redis (sub): ${e.message}`));

  const handlers = new Map<string, Set<(msg: unknown) => void>>();
  sub.on("message", (channel: string, raw: string) => {
    const set = handlers.get(channel);
    if (!set || set.size === 0) return;
    let msg: unknown;
    try {
      msg = JSON.parse(raw);
    } catch (e) {
      log(`bus redis: payload inválido em "${channel}": ${(e as Error).message}`);
      return;
    }
    for (const fn of [...set]) fn(msg);
  });

  return {
    active: true,
    publish(topic, msg) {
      pub.publish(topic, JSON.stringify(msg)).catch((e: Error) => log(`bus redis publish "${topic}": ${e.message}`));
    },
    subscribe(topic, fn) {
      let set = handlers.get(topic);
      if (!set) {
        set = new Set();
        handlers.set(topic, set);
        sub.subscribe(topic).catch((e: Error) => log(`bus redis subscribe "${topic}": ${e.message}`));
      }
      set.add(fn);
      return () => {
        set!.delete(fn);
        if (set!.size === 0) {
          handlers.delete(topic);
          sub.unsubscribe(topic).catch(() => {});
        }
      };
    },
    async close() {
      await Promise.all([pub.quit().catch(() => {}), sub.quit().catch(() => {})]);
    },
  };
}
