/**
 * ch-bus: coordenação entre canais construída em cima do `Bus` (bus/index.ts). 1 instância por `GameServer`
 * (`wireCrossChannel(ctx)`, chamada em `server.ts GameServer.start()` depois que `ctx` existe), guarda o
 * estado de "quem está esperando um ack" (kick/whisper) fechado nela mesma — importante porque os testes
 * (`apps/game/test/ch-bus.test.ts`) rodam 2+ `GameServer` no MESMO processo Node, então esse estado não pode
 * ser de módulo (duas instâncias colidiriam).
 *
 * Sem bus real (`ctx.bus.active === false`, ou seja NoopBus / sem `REDIS_URL`) todo método aqui resolve na
 * hora sem esperar nada — um canal sozinho continua idêntico a antes desta tarefa (login não trava 5 s
 * esperando um ack que nunca vai chegar).
 *
 * 3 coisas coordenadas (docs/GAME-SERVER.md "Canais" / docs/plan/TASKS.md ch-bus):
 *  1. `kick` — login único entre canais: publica pedido de kick, os outros canais derrubam a sessão local se
 *     tiverem o jogador, e respondem um ack; espelha o kick local (`session/login.ts handleLogin`) só que
 *     via rede. Sem ack dentro do timeout, segue andando do mesmo jeito que o kick local faz (não pode travar
 *     login pra sempre por um canal fora do ar).
 *  2. `whisper` — sussurro (160/51 ONE_ON_ONE_TALK) pro alvo que não está neste canal: pergunta pros outros
 *     canais, true = algum deles entregou (não manda "jogador offline" pro remetente).
 *  3. `world` — chat mundial/alto-falante (SceneChatHandler, lobby sem sala): repassa o MESMO pacote (bytes
 *     crus, via `GSPacket.encode()`/`GSPacket.parse()`) pra cada canal reenviar aos seus jogadores locais que
 *     não estão em sala — layout do pacote não depende de clientKind (SceneChatHandler.cs não usa
 *     `AbstractPacketLib`/Out builders), então não precisa reconstruir por cliente.
 *  4. `friendState` — notificação em tempo real de amigo/sociedade online-offline pra quem está em outro
 *     canal (a lista em si, `IMListLoad.ashx`/`ConsortiaUsersList.ashx` em `apps/api`, já lê o `State` direto
 *     do Postgres — que já é por-conta, não por-canal — então já está correta sem isto; isto é só o "ping"
 *     imediato pra quem já tem a tela de amigos aberta).
 */
import { GSPacket } from "@ddt/protocol";
import * as Out from "../packets/out.js";
import type { ServerContext } from "../session/context.js";
import { quitPlayer } from "../session/login.js";

export interface CrossChannel {
  /** Derruba a sessão de `userId` em QUALQUER outro canal (login único). */
  kick(userId: number, timeoutMs?: number): Promise<void>;
  /** Tenta entregar um sussurro pra quem não está neste canal; true = entregue em outro canal. */
  whisper(senderId: number, senderNick: string, targetId: number, text: string, timeoutMs?: number): Promise<boolean>;
  /** Propaga uma mensagem de chat mundial (pacote 19 já montado) pros outros canais. */
  world(pkt: GSPacket): void;
  /** Avisa os outros canais que `userId` mudou de estado online (pra quem tem ele como amigo/da mesma sociedade). */
  friendState(userId: number, state: number, typeVIP: number, vipLevel: number, consortiaId: number): void;
  /** Desliga as subscriptions deste canal (GameServer.stop). */
  close(): void;
}

let seq = 0;
const nextCorrelationId = () => `${process.pid}.${Date.now()}.${++seq}`;

export function wireCrossChannel(ctx: ServerContext): CrossChannel {
  const bus = ctx.bus;
  const serverId = ctx.cfg.SERVER_ID;
  const enabled = bus.active;
  const pendingKick = new Map<number, () => void>();
  const pendingWhisper = new Map<string, () => void>();

  const unsubs = enabled
    ? [
        bus.subscribe("ch:kick", (raw) => {
          const m = raw as { userId: number; fromServerId: number };
          if (m.fromServerId === serverId) return;
          void (async () => {
            const p = ctx.world.get(m.userId);
            if (p) {
              p.sink.send(Out.kitoff(ctx.lang.t("Game.Server.LoginNext")));
              p.sink.disconnect("logged in on another channel");
              await quitPlayer(ctx, p).catch((e) => ctx.log.error("ch-bus: kick remoto falhou ao salvar", e));
            }
            bus.publish("ch:kick:ack", { userId: m.userId, serverId });
          })();
        }),
        bus.subscribe("ch:kick:ack", (raw) => {
          const m = raw as { userId: number };
          pendingKick.get(m.userId)?.();
        }),
        bus.subscribe("ch:whisper", (raw) => {
          const m = raw as { corr: string; senderId: number; senderNick: string; targetId: number; text: string; fromServerId: number };
          if (m.fromServerId === serverId) return;
          const o = ctx.world.get(m.targetId);
          if (!o) return;
          o.send(Out.oneOnOneTalk(m.senderId, m.senderNick, m.text, m.targetId, ctx.now()));
          bus.publish("ch:whisper:ack", { corr: m.corr });
        }),
        bus.subscribe("ch:whisper:ack", (raw) => {
          const m = raw as { corr: string };
          pendingWhisper.get(m.corr)?.();
        }),
        bus.subscribe("ch:chat:world", (raw) => {
          const m = raw as { bytes: string; fromServerId: number };
          if (m.fromServerId === serverId) return;
          const pkt = GSPacket.parse(Buffer.from(m.bytes, "base64"));
          // pkt.clientId = remetente (GSPacket(19, p.id) no scene-chat.ts original) -- mesmo filtro de bloqueio
          // que a entrega local aplica (SceneChatHandler: quem bloqueia o remetente não recebe).
          for (const o of ctx.world.all()) if (!o.currentRoom && !o.isBlackFriend(pkt.clientId)) o.send(pkt);
        }),
        bus.subscribe("ch:friend-state", (raw) => {
          const m = raw as { userId: number; state: number; typeVIP: number; vipLevel: number; consortiaId: number; fromServerId: number };
          if (m.fromServerId === serverId) return;
          for (const o of ctx.world.all())
            if (o.id !== m.userId && (o.friends.has(m.userId) || (m.consortiaId !== 0 && o.info.ConsortiaID === m.consortiaId)))
              o.send(Out.friendState(m.userId, m.state, m.typeVIP, m.vipLevel));
        }),
      ]
    : [];

  return {
    async kick(userId, timeoutMs = 5000) {
      if (!enabled) return; // mono-canal: não existe "outro canal" pra derrubar
      const done = new Promise<void>((res) => pendingKick.set(userId, res));
      bus.publish("ch:kick", { userId, fromServerId: serverId });
      await Promise.race([done, new Promise((r) => setTimeout(r, timeoutMs))]);
      pendingKick.delete(userId);
    },
    async whisper(senderId, senderNick, targetId, text, timeoutMs = 1500) {
      if (!enabled) return false;
      const corr = nextCorrelationId();
      let delivered = false;
      const done = new Promise<void>((res) =>
        pendingWhisper.set(corr, () => {
          delivered = true;
          res();
        }),
      );
      bus.publish("ch:whisper", { corr, senderId, senderNick, targetId, text, fromServerId: serverId });
      await Promise.race([done, new Promise((r) => setTimeout(r, timeoutMs))]);
      pendingWhisper.delete(corr);
      return delivered;
    },
    world(pkt) {
      if (!enabled) return;
      bus.publish("ch:chat:world", { bytes: Buffer.from(pkt.encode()).toString("base64"), fromServerId: serverId });
    },
    friendState(userId, state, typeVIP, vipLevel, consortiaId) {
      if (!enabled) return;
      bus.publish("ch:friend-state", { userId, state, typeVIP, vipLevel, consortiaId, fromServerId: serverId });
    },
    close() {
      for (const u of unsubs) u();
    },
  };
}
