/**
 * Aba no jogo: Casamento › mural de pedidos (matchmaking board) — publicar, ver detalhe, editar e apagar
 * seu próprio pedido.
 * Pacotes: 236 MARRYINFO_ADD (publicar), 235 MARRYINFO_GET (ver detalhe), 237 MARRYINFO_UPDATE (editar o
 * seu), 234 MARRYPROP_GET (apagar o seu — nome do pacote é reaproveitado do `MarryInfoDeleteHandler`).
 * C#: `MarryInfoAddHandler.cs`/`MarryInfoUpdateHandler.cs`/`MarryInfoDeleteHandler.cs`.
 * Atenção (ver `casamento/index.ts`): o cliente usa 237 pra editar o MURAL e 253 pra editar a SALA da
 * capela — formatos diferentes. O C# original registrava os dois no mesmo handler por engano; este port
 * separa: 237 = mural (aqui), 253 = sala (`capela.ts`).
 * Como testar: `apps/game/test/marriage-farm-auction.test.ts`. Manual: Casamento → mural → publicar
 * pedido / editar / apagar.
 */
import { GSPacket } from "@ddt/protocol";
import { and, eq } from "drizzle-orm";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import { DETAIL, MARRY_INFO, marryInfoRefreshPacket } from "./infra.js";

/** 236 MARRYINFO_ADD: publica seu pedido no mural (10000 ouro). */
export async function marryInfoAdd(ctx: ServerContext, p: GamePlayer): Promise<void> {
  if (p.info.MarryInfoID) return;
  if (p.info.Gold < 10000) return p.sendMessage(0, ctx.lang.t("MarryInfoAddHandler.Msg1"));
  const [row] = await ctx.db.db.insert(MARRY_INFO).values({ UserID: p.id, IsPublishEquip: false, Introduction: "", RegistTime: ctx.now() }).returning();
  p.removeGold(10000);
  p.info.MarryInfoID = row!.ID;
  await ctx.db.db.update(DETAIL).set({ MarryInfoID: row!.ID }).where(eq(DETAIL.UserID, p.id));
  p.send(marryInfoRefreshPacket(row!, row!.ID, true));
  p.sendMessage(0, ctx.lang.t("MarryInfoAddHandler.Msg2"));
}

/** 235 MARRYINFO_GET: int infoId — ver o detalhe de um pedido do mural. */
export async function marryInfoGet(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  const infoId = pkt.readInt();
  if (!p.info.MarryInfoID) return;
  const [row] = await ctx.db.db.select().from(MARRY_INFO).where(and(eq(MARRY_INFO.ID, infoId), eq(MARRY_INFO.IsExist, true))).limit(1);
  p.send(marryInfoRefreshPacket(row ?? null, infoId, !!row));
}

/** 237 MARRYINFO_UPDATE: bool isPublishEquip, str introduction — edita seu próprio pedido do mural. */
export async function marryInfoUpdate(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  const isPublishEquip = pkt.readBoolean();
  const introduction = pkt.readString();
  if (!p.info.MarryInfoID) return;
  const [row] = await ctx.db.db.select().from(MARRY_INFO).where(eq(MARRY_INFO.ID, p.info.MarryInfoID)).limit(1);
  if (!row) return p.sendMessage(0, ctx.lang.t("MarryInfoUpdateHandler.Msg1"));
  await ctx.db.db.update(MARRY_INFO).set({ IsPublishEquip: isPublishEquip, Introduction: introduction, RegistTime: ctx.now() }).where(eq(MARRY_INFO.ID, row.ID));
  p.send(marryInfoRefreshPacket({ ...row, IsPublishEquip: isPublishEquip, Introduction: introduction }, row.ID, true));
  p.sendMessage(0, ctx.lang.t("MarryInfoUpdateHandler.Succeed"));
}

/** 234 MARRYPROP_GET: int infoId — apaga seu próprio pedido do mural (MarryInfoDeleteHandler). */
export async function marryInfoDelete(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  const infoId = pkt.readInt();
  const upd = await ctx.db.db.update(MARRY_INFO).set({ IsExist: false }).where(and(eq(MARRY_INFO.ID, infoId), eq(MARRY_INFO.UserID, p.id), eq(MARRY_INFO.IsExist, true))).returning();
  if (upd.length) { p.info.MarryInfoID = 0; await ctx.db.db.update(DETAIL).set({ MarryInfoID: 0 }).where(eq(DETAIL.UserID, p.id)); }
  p.send(marryInfoRefreshPacket(null, infoId, false));
  p.sendMessage(0, ctx.lang.t(upd.length ? "MarryInfoDeleteHandler.Succeed" : "MarryInfoDeleteHandler.Fail"));
}
