/**
 * ch-bus: barramento mínimo (pub/sub) entre processos `apps/game` ("canais") que compartilham o mesmo
 * Postgres. Espelha o que `Center.Crosszone.Server` fazia no C# original (`research/6600/crosszone.md`) —
 * login único entre servidores, relay de chat/amigo entre servidores — mas como uma troca de mensagens leve
 * em vez de um serviço WCF dedicado (decisão registrada em `research/6600/crosszone.md`: Crosszone nunca é
 * portado como está; aqui é só o pedaço que `ch-processo` deixou faltando).
 *
 * Duas implementações reais:
 *  - `createNoopBus()` (padrão, sem `REDIS_URL`): `publish` não faz nada, `subscribe` nunca dispara. Com ela,
 *    um canal sozinho se comporta EXATAMENTE como antes desta tarefa — nada atravessa canal nenhum.
 *  - `createRedisBus()` (`bus/redis.ts`, usada quando `REDIS_URL` está configurado): Redis pub/sub via
 *    `ioredis`, JSON por tópico.
 * Uma 3ª implementação só de teste (`createMemoryBus`, `bus/memory.ts`) liga 2+ `GameServer` em processo sem
 * precisar de Redis de verdade (`apps/game/test/ch-bus.test.ts`).
 *
 * `active` existe pra `bus/cross-channel.ts` saber se vale a pena coordenar (esperar um ack, serializar um
 * pacote…) sem precisar checar `cfg.REDIS_URL` diretamente — só a NoopBus é `active: false`; qualquer bus de
 * teste "ligado" entre instâncias também conta como ativo.
 */
import type { Config } from "../config.js";
import { createRedisBus } from "./redis.js";

export interface Bus {
  /** false só pra NoopBus: sinaliza que não há ningém do outro lado pra coordenar com. */
  readonly active: boolean;
  publish(topic: string, msg: unknown): void;
  /** Devolve uma função de unsubscribe. */
  subscribe(topic: string, fn: (msg: unknown) => void): () => void;
  close(): Promise<void>;
}

export function createNoopBus(): Bus {
  return {
    active: false,
    publish() {
      /* mono-canal: nada a publicar */
    },
    subscribe() {
      return () => {};
    },
    async close() {
      /* nada a fechar */
    },
  };
}

/** Escolhe a implementação real a partir da config (`REDIS_URL` setado -> Redis; senão -> no-op). */
export function createBus(cfg: Pick<Config, "REDIS_URL">, log: (msg: string) => void): Bus {
  if (cfg.REDIS_URL && cfg.REDIS_URL.trim()) return createRedisBus(cfg.REDIS_URL, log);
  return createNoopBus();
}
