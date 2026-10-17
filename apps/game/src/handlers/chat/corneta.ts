/**
 * Aba no jogo: cornetas (pequena, grande e mundial) — item consumível que grita uma mensagem pra todo
 * mundo online.
 * Pacotes: 71 S_BUGLE (pequena), 72 B_BUGLE (grande), 73 C_BUGLE (mundial).
 * C#: `SmallBugleHandler.cs`, `BigBugleHandler.cs` (fix: sem broadcast de graça quando falta corneta — bug
 * original), `CBugleHandler.cs`.
 * Como testar: `apps/game/test/chat-bots.test.ts`. Manual: Bolsa → usar corneta.
 */
import { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";

/** 71 S_BUGLE (SmallBugleHandler.cs:12) — precisa de um item categoria 11 / Property1 4 (consumido antes do check de 2s). */
export function smallBugle(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): void {
  const item = p.propBag.getItemByCategoryID(0, 11, 4);
  if (!item) return;
  p.propBag.removeCountFromStack(item, 1);
  pkt.readInt();
  pkt.readString();
  const msg = pkt.readString();
  if (p.lastChatTime + 2000 > Date.now()) return p.sendMessage(3, ctx.lang.t("SmallBugleHandler.Msg"));
  p.lastChatTime = Date.now();
  for (const o of ctx.world.all()) {
    const out = new GSPacket(71, o.id);
    out.writeInt(p.id);
    out.writeString(p.info.NickName ?? "");
    out.writeString(msg);
    o.send(out);
  }
}

/** 72 B_BUGLE (BigBugleHandler.cs:12) — fix: sem broadcast de graça quando não tem corneta (bug do original). */
export function bigBugle(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): void {
  const tpl = pkt.readInt();
  const byTpl = p.propBag.getItemByTemplateID(0, tpl);
  if (p.lastChatTime + 2000 > Date.now()) return p.sendMessage(3, ctx.lang.t("BigBugleHandler.Msg"));
  let build: (id: number) => GSPacket;
  if (byTpl) {
    pkt.readInt();
    pkt.readString();
    const msg = pkt.readString();
    p.propBag.removeCountFromStack(byTpl, 1);
    build = (id) => {
      const o = new GSPacket(72, id);
      o.writeInt(byTpl.template.Property2); o.writeInt(p.id); o.writeString(p.info.NickName ?? ""); o.writeString(msg);
      return o;
    };
  } else {
    pkt.readString();
    const msg = pkt.readString();
    const any = p.propBag.getItemByCategoryID(0, 11, 4);
    if (!any) return;
    p.propBag.removeCountFromStack(any, 1);
    build = (id) => {
      const o = new GSPacket(72, id);
      o.writeInt(p.zoneId); o.writeInt(p.id); o.writeString(p.info.NickName ?? ""); o.writeString(msg); o.writeString(p.zoneName);
      return o;
    };
  }
  p.lastChatTime = Date.now();
  for (const o of ctx.world.all()) o.send(build(o.id));
}

/** 73 C_BUGLE (CBugleHandler.cs:12) — corneta mundial ("world"), item 11100; processo único = todo jogador online. */
export function worldBugle(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): void {
  pkt.readInt();
  const item = p.propBag.getItemByTemplateID(0, 11100);
  if (p.lastChatTime + 2000 > Date.now()) return p.sendMessage(3, ctx.lang.t("GoSlow"));
  if (!item) return;
  pkt.readString();
  const msg = pkt.readString();
  p.propBag.removeCountFromStack(item, 1);
  p.lastChatTime = Date.now();
  for (const o of ctx.world.all()) {
    const out = new GSPacket(73, o.id);
    out.writeInt(p.zoneId); out.writeInt(p.id); out.writeString(p.info.NickName ?? ""); out.writeString(msg); out.writeString(p.zoneName);
    o.send(out);
  }
}
