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
 *  5. `systemNotice` (ch-eventos) — aviso de admin (POST /broadcast, server.ts adminApi) pros OUTROS canais;
 *     este canal já manda pros seus próprios jogadores ANTES de chamar isto (broadcast local nunca depende do
 *     barramento).
 *  6. `bossOpen`/`bossClose`/`bossDamage`/`bossSync` (ch-eventos) — boss mundial: o HP/ranking é autoridade do
 *     canal LÍDER (`ctx.leader`, `bus/leader.ts`); um seguidor nunca abre/fecha/decrementa sozinho, só repassa
 *     (`bossDamage`) e espelha o que o líder replica (`bossOpen`/`bossSync`/`bossClose`) — ver
 *     `handlers/eventos/boss-mundial.ts` e `handlers/eventos/agendador.ts` (onStart/onEnd "worldboss").
 *  7. `deliverReward` (ch-eventos) — o líder tenta entregar a recompensa de ranking do boss mundial pra um
 *     ganhador que não está neste canal; funciona igual `whisper` (pergunta pros outros, espera um ack curto).
 *  8. `hotUpdate` (41-hot-update) — "Aplicar agora" de admin (POST /hot-update, server.ts adminApi) pros
 *     OUTROS canais; este canal já reloadou + empurrou pros seus próprios jogadores ANTES de chamar isto
 *     (admin/hot-update.ts applyHotUpdate), igual systemNotice faz pro broadcast local.
 */
import { GSPacket } from "@ddt/protocol";
import * as Out from "../packets/out.js";
import type { ServerContext } from "../session/context.js";
import { quitPlayer } from "../session/login.js";
import { give } from "../handlers/eventos/agendador.js";
import { applyBossDamage, mirrorBossClose, mirrorBossOpen, mirrorBossSync, type BossOpenSnapshot, type BossSyncSnapshot } from "../handlers/eventos/boss-mundial.js";
import type { Reward } from "../game/events.js";
import { applyHotUpdate } from "../admin/hot-update.js";

export interface CrossChannel {
  /** Derruba a sessão de `userId` em QUALQUER outro canal (login único). */
  kick(userId: number, timeoutMs?: number): Promise<void>;
  /** Tenta entregar um sussurro pra quem não está neste canal; true = entregue em outro canal. */
  whisper(senderId: number, senderNick: string, targetId: number, text: string, timeoutMs?: number): Promise<boolean>;
  /** Propaga uma mensagem de chat mundial (pacote 19 já montado) pros outros canais. */
  world(pkt: GSPacket): void;
  /** Avisa os outros canais que `userId` mudou de estado online (pra quem tem ele como amigo/da mesma sociedade). */
  friendState(userId: number, state: number, typeVIP: number, vipLevel: number, consortiaId: number): void;
  /** ch-eventos: aviso de admin pros OUTROS canais (este já mandou pros seus próprios jogadores). */
  systemNotice(msg: string, type: number): void;
  /** ch-eventos: líder abriu a janela do boss mundial de verdade; replica pros seguidores espelharem. */
  bossOpen(snap: BossOpenSnapshot): void;
  /** ch-eventos: líder fechou (já pagou o prêmio, uma vez só); seguidores só limpam o espelho local. */
  bossClose(rankTop: { id: number; nick: string; damage: number }[]): void;
  /** ch-eventos: ESTE canal recebeu dano local mas não é o líder — repassa pro líder aplicar de verdade. */
  bossDamage(userId: number, nick: string, damage: number): void;
  /** ch-eventos: líder replica o HP/ranking novo pra todo mundo espelhar, depois de aplicar um dano (seu ou repassado). */
  bossSync(snap: BossSyncSnapshot): void;
  /** ch-eventos: líder tenta entregar uma recompensa de boss mundial pra um ganhador que não está neste canal;
   *  true = algum outro canal tinha o jogador online e entregou (itens completos, não só moeda). */
  deliverReward(userId: number, rewards: Reward[], title: string, timeoutMs?: number): Promise<boolean>;
  /** 41-hot-update: avisa os OUTROS canais que o admin aplicou um "Aplicar agora" — cada um reloada os
   *  próprios templates e empurra os mesmos pacotes de refresh (+ notice, se houver) pros SEUS jogadores. */
  hotUpdate(kinds: string[], notice?: string): void;
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
  const pendingReward = new Map<string, () => void>();

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
        bus.subscribe("ch:system-notice", (raw) => {
          const m = raw as { msg: string; type: number; fromServerId: number };
          if (m.fromServerId === serverId) return;
          const pkt = Out.message(m.type, m.msg);
          for (const p of ctx.world.all()) p.send(pkt);
        }),
        bus.subscribe("ch:boss:open", (raw) => {
          const m = raw as BossOpenSnapshot & { fromServerId: number };
          if (m.fromServerId === serverId) return;
          mirrorBossOpen(ctx, m);
        }),
        bus.subscribe("ch:boss:close", (raw) => {
          const m = raw as { rankTop: { id: number; nick: string; damage: number }[]; fromServerId: number };
          if (m.fromServerId === serverId) return;
          mirrorBossClose(ctx, m.rankTop);
        }),
        bus.subscribe("ch:boss:damage", (raw) => {
          const m = raw as { userId: number; nick: string; damage: number; fromServerId: number };
          if (m.fromServerId === serverId) return;
          if (!ctx.leader.isLeader()) return; // não sou (mais) o líder — quem pediu nota que o estado não mudou e tenta de novo
          applyBossDamage(ctx, m.userId, m.nick, m.damage);
        }),
        bus.subscribe("ch:boss:sync", (raw) => {
          const m = raw as BossSyncSnapshot & { fromServerId: number };
          if (m.fromServerId === serverId) return;
          mirrorBossSync(ctx, m);
        }),
        bus.subscribe("ch:deliver-reward", (raw) => {
          const m = raw as { corr: string; userId: number; rewards: Reward[]; title: string; fromServerId: number };
          if (m.fromServerId === serverId) return;
          const p = ctx.world.get(m.userId);
          if (!p) return; // não está aqui — quem pediu trata o timeout como "não achei em canal nenhum"
          void (async () => {
            const summary = await give(ctx, p, m.rewards, m.title);
            p.sendMessage(0, `${m.title}. Prêmio: ${summary}.`);
            bus.publish("ch:deliver-reward:ack", { corr: m.corr });
          })();
        }),
        bus.subscribe("ch:deliver-reward:ack", (raw) => {
          const m = raw as { corr: string };
          pendingReward.get(m.corr)?.();
        }),
        bus.subscribe("ch:hot-update", (raw) => {
          const m = raw as { kinds: string[]; notice?: string; fromServerId: number };
          if (m.fromServerId === serverId) return;
          void applyHotUpdate(ctx, m.kinds, m.notice).catch((e) => ctx.log.error("ch-bus: hot-update remoto falhou", e));
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
    systemNotice(msg, type) {
      if (!enabled) return;
      bus.publish("ch:system-notice", { msg, type, fromServerId: serverId });
    },
    bossOpen(snap) {
      if (!enabled) return;
      bus.publish("ch:boss:open", { ...snap, fromServerId: serverId });
    },
    bossClose(rankTop) {
      if (!enabled) return;
      bus.publish("ch:boss:close", { rankTop, fromServerId: serverId });
    },
    bossDamage(userId, nick, damage) {
      if (!enabled) return;
      bus.publish("ch:boss:damage", { userId, nick, damage, fromServerId: serverId });
    },
    bossSync(snap) {
      if (!enabled) return;
      bus.publish("ch:boss:sync", { ...snap, fromServerId: serverId });
    },
    async deliverReward(userId, rewards, title, timeoutMs = 2000) {
      if (!enabled) return false;
      const corr = nextCorrelationId();
      let delivered = false;
      const done = new Promise<void>((res) =>
        pendingReward.set(corr, () => {
          delivered = true;
          res();
        }),
      );
      bus.publish("ch:deliver-reward", { corr, userId, rewards, title, fromServerId: serverId });
      await Promise.race([done, new Promise((r) => setTimeout(r, timeoutMs))]);
      pendingReward.delete(corr);
      return delivered;
    },
    hotUpdate(kinds, notice) {
      if (!enabled) return;
      bus.publish("ch:hot-update", { kinds, notice, fromServerId: serverId });
    },
    close() {
      for (const u of unsubs) u();
    },
  };
}
