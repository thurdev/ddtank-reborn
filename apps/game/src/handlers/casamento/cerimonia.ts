/**
 * Aba no jogo: Casamento › dentro da sala da capela (andar, posição, cerimônia/aliança, renovar tempo da
 * sala, convidar, presente em dinheiro, fogos de artifício, expulsar, banir, salva de tiros).
 * Pacotes: 249 MARRY_CMD (sub-roteador por byte).
 * C#: `MarryDataHandler.cs` (`SceneMarryRooms/*`).
 * Como testar: `apps/game/test/marriage-farm-auction.test.ts`. Manual: Casamento → dentro da sala → andar
 * / iniciar cerimônia / convidar / dar presente / fogos / expulsar / banir / salva de tiros.
 *
 * NOVO (m2-bolsa): código 249 e os sub-códigos (`ChurchPackageType.as`) são IDÊNTICOS entre 4.1 e 6600
 * (confirmado campo a campo contra `GameSocketOut.as` dos dois). O 6600 só ACRESCENTA campos no FINAL de
 * 3 sub-comandos, sempre depois de tudo que lemos, então são seguros de ignorar (framed-by-length, mesmo
 * padrão de `94/0 isDouble`/`94/2 tempID` em `research/6600/packets-m1.md` M2 salas) — nenhum fix:
 * - sub 2 HYMENEAL: 6600 manda +1 bool `isBind` no fim (`sendStartWedding(isBind=false)`). Achado também:
 *   NENHUMA das duas versões manda um int extra pra "cancelar" — `flag = pkt.readInt()` neste porte lê
 *   lixo/zero-pad de qualquer forma (gap pré-existente da própria 4.1, não é regressão desta tarefa; a UI
 *   de cancelar provavelmente usa o sub 9 HYMENEAL_STOP, nunca registrado aqui — não tocado).
 * - sub 3 CONTINUATION: 6600 manda +1 bool `merryActivity` no fim. m3-partial-sweep (2026-10-19):
 *   reauditado contra `ContinuationCommand.cs` — achados 2 bugs reais (não de layout): o preço era
 *   dividido 50/50 entre os cônjuges (original cobra só de quem PEDE, `player.RemoveMoney` — mesma regra
 *   já usada pela criação da sala, `MarryRoomCreateHandler.cs`, ver comentário em `marryRoomCreate`) e a
 *   resposta usava 242 `roomInfoPacket` pra TODA a sala (layout errado — o original é `SendContinuation`,
 *   249/3 + só o int de horas, mandado pro pedinte e reenviado só pro OUTRO cônjuge, não pros convidados).
 * - sub 6 USEFIRECRACKERS: 6600 manda +1 bool `isBind` no fim.
 * `MARRY_ROOM_CREATE` (241, capela.ts) tem o mesmo padrão: 6600 soma +1 bool `merryActivity` no fim, não
 * lido por nenhum handler.
 */
import { PacketOut } from "@ddt/protocol";
import { eq } from "drizzle-orm";
import { ItemInfo } from "../../game/item.js";
import { SubRouter } from "../registry.js";
import { broadcast, findShop, hymenealPacket, isCouple, limitLevel, mailItem, MARRY_ROOM, PRICE_MARRY_ROOM, PRICE_PROPOSE, roomOf, setMarried, WEDDING_RING_TEMPLATE } from "./infra.js";

/** Roteador do pacote 249 MARRY_CMD: um `.on(subcode, nome, fn)` por ação dentro da sala. */
export function marryCmdRouter(): SubRouter {
  return new SubRouter("byte", "MARRY_CMD")
    .on(1, "MOVE", (ctx, p, pkt) => { // int x, int y
      const x = pkt.readInt(), y = pkt.readInt();
      const r = roomOf(ctx, p);
      if (!r) return;
      const out = new PacketOut(249, p.id); out.writeByte(1); out.writeInt(x); out.writeInt(y);
      broadcast(r, out, p);
    })
    .on(10, "POSITION", (ctx, p, pkt) => {
      const x = pkt.readInt(), y = pkt.readInt();
      const r = roomOf(ctx, p);
      if (!r) return;
      const out = new PacketOut(249, p.id); out.writeByte(10); out.writeInt(x); out.writeInt(y);
      broadcast(r, out, p);
    })
    .on(2, "HYMENEAL", async (ctx, p, pkt) => { // int flag (1 = cancel)
      const flag = pkt.readInt();
      const r = roomOf(ctx, p);
      if (!r || !isCouple(r, p.id) || !(r.groomID && r.brideID)) return;
      const groom = ctx.world.get(r.groomID), bride = ctx.world.get(r.brideID);
      if (flag === 1) { r.isHymeneal = false; broadcast(r, hymenealPacket(r, false)); return; }
      if (!groom || !bride) return;
      const firstTime = !groom.info.IsGotRing && !bride.info.IsGotRing;
      if (!firstTime) {
        const price = PRICE_PROPOSE(ctx);
        if (p.info.Money + p.info.MoneyLock < price) return p.sendMessage(0, ctx.lang.t("Farm.NotEnough"));
        p.removeMoney(price);
      } else {
        const ring = ctx.templates.findItem(WEDDING_RING_TEMPLATE);
        if (ring) {
          await mailItem(ctx, groom.id, groom.info.NickName ?? "", "Anel de casamento", "Anel de casamento", ItemInfo.createFromTemplate(ring, 1, 102));
          await mailItem(ctx, bride.id, bride.info.NickName ?? "", "Anel de casamento", "Anel de casamento", ItemInfo.createFromTemplate(ring, 1, 102));
        }
        await setMarried(ctx, groom.id, { IsMarried: true, SpouseID: groom.info.SpouseID, SpouseName: groom.info.SpouseName ?? "", IsGotRing: true });
        await setMarried(ctx, bride.id, { IsMarried: true, SpouseID: bride.info.SpouseID, SpouseName: bride.info.SpouseName ?? "", IsGotRing: true });
      }
      r.isHymeneal = true;
      broadcast(r, hymenealPacket(r, true));
      setTimeout(() => { r.isHymeneal = false; broadcast(r, hymenealPacket(r, false)); }, 170_000);
    })
    .on(3, "CONTINUATION", async (ctx, p, pkt) => { // int hours (2/3/4)
      // ContinuationCommand.cs:16-66 (m3-partial-sweep fix): quem PEDE paga o preço INTEIRO (não split
      // 50/50 com o cônjuge, deviation não documentada do porte anterior) e o pacote de resposta é
      // `SendContinuation` (249/3, só `int AvailTime` — não 242 `roomInfoPacket`, formato errado e
      // audiência errada), mandado pro próprio pedinte e encaminhado só pro OUTRO cônjuge (não pra sala
      // toda — convidados não recebem isto no original).
      const hours = pkt.readInt();
      const r = roomOf(ctx, p);
      if (!r || !isCouple(r, p.id)) return;
      const price = PRICE_MARRY_ROOM(hours);
      if (p.info.Money + p.info.MoneyLock < price) return p.sendMessage(0, ctx.lang.t("MarryApplyHandler.Msg1"));
      p.removeMoney(price);
      r.availHours = hours; r.breakTime = new Date(r.breakTime.getTime() + hours * 3_600_000);
      await ctx.db.db.update(MARRY_ROOM).set({ AvailTime: hours, BreakTime: r.breakTime }).where(eq(MARRY_ROOM.ID, r.id));
      const out = () => { const o = new PacketOut(249, p.id); o.writeByte(3); o.writeInt(hours); return o; };
      p.send(out());
      const spouseId = p.id === r.groomID ? r.brideID : r.groomID;
      ctx.world.get(spouseId)?.send(out());
    })
    .on(4, "INVITE", (ctx, p, pkt) => { // int targetId
      const targetId = pkt.readInt();
      const r = roomOf(ctx, p);
      if (!r || !(isCouple(r, p.id) || r.guestInvite)) return;
      const target = ctx.world.get(targetId);
      if (!target) return;
      const out = new PacketOut(249, target.id);
      out.writeByte(4); out.writeInt(p.id); out.writeString(p.info.NickName ?? ""); out.writeBoolean(!!p.info.typeVIP); out.writeInt(p.info.VIPLevel ?? 0);
      out.writeInt(r.id); out.writeString(r.name); out.writeString(r.pwd); out.writeInt(0);
      target.send(out);
    })
    .on(5, "LARGESS", async (ctx, p, pkt) => { // int amount
      // LargessCommand.cs: manda por correio (50/50) NA HORA — nunca segura dinheiro de convidado em memória
      // (sala fechando/servidor reiniciando perderia o presente). `r.giftPool` só soma o total recebido nesta
      // sala, pra o diálogo do casal (249/12) mostrar quanto já chegou pelo correio.
      const amount = pkt.readInt();
      const r = roomOf(ctx, p);
      if (!r || amount <= 0) return;
      const limit = limitLevel(ctx, 3);
      if (p.info.Grade < limit) return p.sendMessage(0, ctx.lang.t("Farm.NeedGrade", limit));
      if (p.info.Money + p.info.MoneyLock < amount) return p.sendMessage(0, ctx.lang.t("Farm.NotEnough"));
      p.removeMoney(amount);
      const half = Math.trunc(amount / 2);
      if (r.groomID) await mailItem(ctx, r.groomID, r.groomName, ctx.lang.t("MarryCmd.Largess.Title"), ctx.lang.t("MarryCmd.Largess.Content", p.info.NickName ?? ""), undefined, half);
      if (r.brideID) await mailItem(ctx, r.brideID, r.brideName, ctx.lang.t("MarryCmd.Largess.Title"), ctx.lang.t("MarryCmd.Largess.Content", p.info.NickName ?? ""), undefined, half);
      r.giftPool += amount;
      broadcast(r, (() => { const o = new PacketOut(249, p.id); o.writeByte(5); o.writeInt(amount); return o; })());
    })
    .on(6, "USEFIRECRACKERS", (ctx, p, pkt) => { // int count, int templateId
      const count = pkt.readInt();
      const templateId = pkt.readInt();
      const r = roomOf(ctx, p);
      if (!r) return;
      const shop = findShop(ctx, templateId);
      const price = (shop?.AValue1 ?? 0) * Math.max(1, count);
      if (shop?.AUnit === -2) { if (p.info.Gold < price) return p.sendMessage(0, ctx.lang.t("Farm.NotEnough")); p.removeGold(price); }
      else { if (p.info.Money + p.info.MoneyLock < price) return p.sendMessage(0, ctx.lang.t("Farm.NotEnough")); p.removeMoney(price); }
      broadcast(r, (() => { const o = new PacketOut(249, p.id); o.writeByte(6); o.writeInt(count); o.writeInt(templateId); return o; })());
    })
    .on(7, "KICK", (ctx, p, pkt) => { // int userId
      const userId = pkt.readInt();
      const r = roomOf(ctx, p);
      if (!r || !isCouple(r, p.id)) return;
      const target = [...r.members].find((m) => m.id === userId);
      if (!target) return;
      r.members.delete(target);
      target.send((() => { const o = new PacketOut(244, userId); return o; })());
    })
    .on(8, "FORBID", (ctx, p, pkt) => { // int userId
      const userId = pkt.readInt();
      const r = roomOf(ctx, p);
      if (!r || !isCouple(r, p.id)) return;
      r.forbidden.add(userId);
      const target = [...r.members].find((m) => m.id === userId);
      if (target) { r.members.delete(target); target.send((() => { const o = new PacketOut(244, userId); return o; })()); }
    })
    .on(11, "GUNSALUTE", (ctx, p, pkt) => { // int, int templateId
      pkt.readInt(); const templateId = pkt.readInt();
      const r = roomOf(ctx, p);
      if (!r || r.isGunsaluteUsed) return;
      r.isGunsaluteUsed = true;
      broadcast(r, (() => { const o = new PacketOut(249, p.id); o.writeByte(11); o.writeInt(templateId); return o; })());
    })
    .on(12, "MARRYROOMSENDGIFT", async (ctx, p, pkt) => { // byte action: BEGINSENDGIFT=1 (query) | CLIENTCONFIRM=4 (claim)
      // 41-capela-reembolso: sem case 12 em nenhum vendor (`MarryCmdType` nem declara o valor 12 no 6600;
      // no 4.1 `MarryCommandMgr.LoadCommandHandler` faz `handles[12]` — chave ausente, exceção pega e
      // logada, nada responde). Código de cliente real (`GameSocketOut.as requestRefund/refund`, só pro
      // casal — `WeddingRoomToolView.as GiftToolVisible`), implementado aqui por design próprio: saldo
      // vem só de 249/5 LARGESS (`r.giftPool`, ver infra.ts), nunca excede o que foi de fato dado.
      const action = pkt.readByte();
      const r = roomOf(ctx, p);
      if (!r || !isCouple(r, p.id)) return;
      if (action === 1) { // BEGINSENDGIFT: ChurchManager.as __showGiftView lê [byte, int saldo]
        const out = new PacketOut(249, p.id); out.writeByte(12); out.writeByte(1); out.writeInt(r.giftPool);
        p.send(out);
        return;
      }
      if (action === 4) { // CLIENTCONFIRM: os presentes já foram pelo correio na hora (LARGESS) — nada a pagar
        // aqui (pagar de novo seria duplicar dinheiro); só confirma pro casal.
        p.sendMessage(0, ctx.lang.t("MarryCmd.Refund.Succeed"));
      }
    });
}
