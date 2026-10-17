/**
 * Aba no jogo: Amigos › convidar amigos (tela "Convite de Amigos": abrir, registrar convite por nick,
 * reivindicar recompensa por tier, "fbclick" morto). Também expõe `inviteLoginPacket`, chamado no burst
 * de login (`session/login.ts`) pra mandar o estado do convite assim que o jogador entra.
 * Pacotes: 107 INVITE_FRIEND (sub-roteador por int).
 * C#: sem lógica no C# 4.1 original (só o enum do pacote); formato espelha `InviteFriendsManager.as`.
 * Regra de negócio (tiers/ouro) é toda Reborn.
 * Como testar: `apps/game/test/handlers.test.ts`. Manual: Amigos → aba Convidar amigos → digitar nick →
 * reivindicar recompensa quando a barra de tier acender.
 */
import { GSPacket } from "@ddt/protocol";
import { addInvite, claimedInviteTiers, countInvites } from "../../db/social.js";
import { claimOnce, grantRewards } from "../../game/events.js";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import { SubRouter } from "../registry.js";

/**
 * Regras do "convite de amigos" (regra Reborn — o C# 4.1 original nunca definiu valores de servidor pra
 * isso, só os pacotes).
 * - INVITE_TIERS[i]: quantos convites (amigos que entraram pelo seu link/nick) são necessários pra
 *   desbloquear a recompensa do tier `i+1` (tier vai de 1 a 4).
 * - INVITE_GOLD[i]: quanto ouro aquele tier paga quando reivindicado. Índices casam: tier 1 = 1 convite =
 *   1000 ouro, tier 4 = 10 convites = 15000 ouro.
 */
const INVITE_TIERS = [1, 3, 5, 10];
const INVITE_GOLD = [1000, 3000, 6000, 15000];

/**
 * Converte o Set de tiers já reivindicados num array fixo de 4 flags (0 ou 1), na ordem que o cliente
 * Flash espera ler (tier 1, 2, 3, 4 nessa ordem).
 * @param claimed tiers (1-4) que esse jogador já reivindicou (vem do banco).
 * @returns 4 números (0 = não reivindicado, 1 = já reivindicado), um por tier.
 */
function inviteFlags(claimed: Set<number>): number[] {
  return [1, 2, 3, 4].map((t) => (claimed.has(t) ? 1 : 0));
}

/**
 * Roteador do pacote 107 INVITE_FRIEND: abrir a tela, registrar convite, reivindicar recompensa de um
 * tier, e o "fbclick" (resquício de Facebook, sem uso real no Reborn — só ecoa a hora atual pro cliente
 * não travar esperando).
 */
export function inviteRouter(): SubRouter {
  return new SubRouter("int", "INVITE_FRIEND")
    .on(2, "INVITE_FRIEND_OPENVIEW", async (ctx, p) => {
      // InviteFriendsManager.showInviteMainView: readInt, readInt, nowInviteNum.
      const out = new GSPacket(107, p.id);
      out.writeInt(2);
      out.writeInt(0);
      out.writeInt(0);
      out.writeInt(await countInvites(ctx.db.db, p.id));
      p.send(out);
    })
    .on(1, "INVITE_FRIEND_FRIENDREWARD", async (ctx, p, pkt) => {
      // inviteFriendOkClick(nick): client reads nothing back (case FRIENDREWARD: break).
      const nick = pkt.readString().trim();
      if (!nick || nick.length > 64) return;
      if (await addInvite(ctx.db.db, p.id, nick)) {
        // New invite: push the new count so the view lights the reward button.
        const out = new GSPacket(107, p.id);
        out.writeInt(3);
        out.writeInt(await countInvites(ctx.db.db, p.id));
        p.send(out);
      }
    })
    .on(4, "INVITE_FRIEND_GETREWARD", async (ctx, p, pkt) => {
      // gerRewrd: readInt(tier echo), readBoolean(granted), 4 claimed flags.
      const tier = pkt.readInt();
      const out = new GSPacket(107, p.id);
      out.writeInt(4);
      out.writeInt(tier);
      let granted = false;
      if (tier >= 1 && tier <= 4 && (await countInvites(ctx.db.db, p.id)) >= INVITE_TIERS[tier - 1]!) {
        if (await claimOnce(ctx.db.db, p.id, "invite", `tier:${tier}`)) {
          grantRewards(p, [{ templateId: -100, count: INVITE_GOLD[tier - 1]! }], ctx.templates.findItem, ctx.now());
          granted = true;
        }
      }
      out.writeBoolean(granted);
      for (const f of inviteFlags(await claimedInviteTiers(ctx.db.db, p.id))) out.writeInt(f);
      p.send(out);
    })
    .on(6, "INVITE_FRIEND_FBCLICK", (ctx, p) => {
      // fbclick: readDate (last FB share time) — Reborn has no Facebook: echo now.
      const out = new GSPacket(107, p.id);
      out.writeInt(6);
      out.writeDateTime(ctx.now(), true);
      p.send(out);
    });
}

/** 107/5 INVITE_FRIEND_LOGIN for the login burst (InviteFriendsManager.login reads).
 * Nunca derruba o login: qualquer erro de invite vira pacote zerado. */
export async function inviteLoginPacket(ctx: ServerContext, p: GamePlayer): Promise<GSPacket> {
  const out = new GSPacket(107, p.id);
  out.writeInt(5);
  out.writeString(String(p.id));
  try {
    out.writeInt(await countInvites(ctx.db.db, p.id));
    out.writeDateTime(ctx.now(), true);
    for (const f of inviteFlags(await claimedInviteTiers(ctx.db.db, p.id))) out.writeInt(f);
  } catch (e) {
    ctx.log.debug(`invite state fallback: ${e instanceof Error ? e.message : e}`);
    out.writeInt(0);
    out.writeDateTime(ctx.now(), true);
    for (const f of [0, 0, 0, 0]) out.writeInt(f);
  }
  out.writeInt(1); // serverID (OverSeasCommunController display only)
  return out;
}
