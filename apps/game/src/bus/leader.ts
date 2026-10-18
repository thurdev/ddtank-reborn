/**
 * ch-eventos: eleição de líder mínima em cima do `Bus` (bus/index.ts) — decide qual canal é a AUTORIDADE pro
 * estado global que não dá (ou não vale a pena) pra replicar via Postgres a cada mudança: hoje só o boss
 * mundial (HP/ranking compartilhado em memória, `handlers/eventos/boss-mundial.ts`/`agendador.ts`). O dono pediu
 * explicitamente a opção mais simples em vez de lock distribuído no Postgres: "o canal com o SERVER_ID mais
 * baixo" entre os canais vistos vivos — sem precisar de maioria/quorum porque `claimOnce` (`game/events.ts`,
 * chave única no Postgres) já garante que recompensa/kill de evento nunca duplica mesmo se por um instante 2
 * canais se considerarem líder ao mesmo tempo (split-brain breve, ver nota de failover abaixo); esta eleição só
 * precisa ser "boa o suficiente" pra evitar isso na prática, não um consenso rígido.
 *
 * Mecanismo: gossip por "hello" em vez de um heartbeat central — cada canal anuncia o próprio `SERVER_ID` ao
 * entrar e a cada `HELLO_MS`; quem recebe um hello de um `serverId` que ainda não conhecia responde com o
 * próprio hello NA HORA (sem esperar o próximo timer), então 2 canais se descobrem em 1-2 saltos do barramento —
 * rápido o suficiente pro bus de memória síncrono-por-microtask dos testes (`test/ch-eventos.test.ts`) e também
 * pro Redis pub/sub real em produção.
 *
 * Sem barramento ativo (`ctx.bus.active === false`, NoopBus = canal único) `isLeader()` é SEMPRE true — não
 * existe "outro canal" pra disputar liderança, comportamento idêntico a antes desta tarefa.
 *
 * Failover: se o líder cair (processo morre, rede cai), os outros só o esquecem depois de `TTL_MS` sem ver um
 * hello dele — até lá ninguém assume (dano no boss mundial de um canal seguidor fica "pendurado", sem resposta,
 * até o timeout da eleição). Documentado também em `docs/GAME-SERVER.md` "Canais" § ch-eventos.
 */
import type { ServerContext } from "../session/context.js";

export interface LeaderElection {
  /** true se ESTE canal é a autoridade agora (recalculado a cada chamada — só olha o Map local, nada de rede). */
  isLeader(): boolean;
  /** SERVER_IDs conhecidos vivos (incluindo o próprio), ordenados — só debug/status. */
  peers(): number[];
  close(): void;
}

const HELLO = "ch:leader:hello";
const HELLO_MS = 5_000;
const TTL_MS = 15_000;

export function wireLeaderElection(ctx: ServerContext): LeaderElection {
  const bus = ctx.bus;
  const serverId = ctx.cfg.SERVER_ID;
  if (!bus.active) return { isLeader: () => true, peers: () => [serverId], close() {} };

  const seen = new Map<number, number>([[serverId, Date.now()]]);
  const announce = () => bus.publish(HELLO, { serverId });
  const unsub = bus.subscribe(HELLO, (raw) => {
    const m = raw as { serverId: number };
    const isNew = !seen.has(m.serverId);
    seen.set(m.serverId, Date.now());
    if (isNew) announce(); // responde na hora pro recém-chegado já me ver também (convergência sem esperar HELLO_MS)
  });
  announce();
  const timer = setInterval(() => {
    seen.set(serverId, Date.now());
    announce();
  }, HELLO_MS);
  timer.unref?.();

  return {
    isLeader() {
      const now = Date.now();
      for (const [id, ts] of [...seen]) if (id !== serverId && now - ts > TTL_MS) seen.delete(id);
      return serverId === Math.min(...seen.keys());
    },
    peers() {
      return [...seen.keys()].sort((a, b) => a - b);
    },
    close() {
      clearInterval(timer);
      unsub();
    },
  };
}
