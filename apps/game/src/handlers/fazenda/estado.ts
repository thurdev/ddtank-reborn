/**
 * Aba no jogo: sem tela própria — infraestrutura compartilhada da Fazenda: estado por jogador (terrenos +
 * dados da fazenda), persistência, pacotes de saída, regras de maturação/aluguel. Usado por todos os
 * arquivos de `fazenda/`.
 * C#: `Game.Server/Farm/*` (FarmHandler → FarmLogicProcessor → Farm/Handle/*), `GameUtils/PlayerFarm.cs` +
 * `PlayerFarmInventory.cs` (máquina de estado do terreno base), `SqlDataProvider` UserFarmInfo /
 * UserFieldInfo, procs `SP_Users_Farm_Add`/`_Update` (`player.Sys_User_Farm` / `Sys_User_Field`).
 *
 * Seed template: Property2 = quantidade colhida (GainCount), Property3 = minutos até maturar
 * (FieldValidDate), Property4 = item colhido. Fertilizante (EquipType.MANURE, CategoryID 33):
 * Property1 = minutos adicionados.
 */
import { and, eq } from "drizzle-orm";
import { PacketOut } from "@ddt/protocol";
import { player } from "@ddt/db";
import { saveItem } from "../../db/items.js";
import { sendMail } from "../../db/social.js";
import { ItemInfo, type ItemTemplate } from "../../game/item.js";
import type { GamePlayer } from "../../game/player.js";
import * as Out from "../../packets/out.js";
import type { ServerContext } from "../../session/context.js";

const FARM = player.Sys_User_Farm;
const FIELD = player.Sys_User_Field;
export const FIELD_CAPACITY = 24;
export const STARTER_FIELDS = 8;
/** PlayerFarmInventory.GropFastforward: GameProperties.FastGrowSubTime. */
export const FAST_GROW_SUB_MIN = 30;
export const MIN_GRADE = 25;

export type FarmRow = typeof FARM.$inferSelect;
export type FieldRow = typeof FIELD.$inferSelect;

export interface FarmState { farm: FarmRow; fields: Map<number, FieldRow>; viewing: number | null }
const stateByPlayer = new WeakMap<GamePlayer, FarmState>();

export function isWarrior(p: GamePlayer): boolean { return (p.extra as { coupleBossBoxNum?: number } | null)?.coupleBossBoxNum === 9; }

/** UserFieldInfo.isDig: ripe (seeded and elapsed minutes, minus fast-forward, reached FieldValidDate). */
export function isRipe(f: FieldRow, now: Date): boolean {
  if (f.SeedID === 0) return false;
  const elapsedMin = (now.getTime() - f.PlantTime.getTime()) / 60_000 + f.AccelerateTime;
  return elapsedMin >= f.FieldValidDate;
}
/** UserFieldInfo field slot still rented/owned (PayTime in the future, or the 8 starter fields). */
export function isUnlocked(f: FieldRow, now: Date): boolean { return f.FieldID < STARTER_FIELDS || f.PayTime.getTime() > now.getTime(); }

export async function loadFarm(ctx: ServerContext, userId: number, farmerName: string): Promise<{ farm: FarmRow; fields: Map<number, FieldRow> }> {
  const db = ctx.db.db;
  let [farm] = await db.select().from(FARM).where(eq(FARM.FarmID, userId)).limit(1);
  if (!farm) {
    const now = ctx.now();
    [farm] = await db.insert(FARM).values({ FarmID: userId, FarmerName: farmerName, AutoPayTime: now, CountDownTime: now, PayFieldMoney: "", PayAutoMoney: "" }).returning();
    const rows = Array.from({ length: STARTER_FIELDS }, (_, i) => ({
      FarmID: userId, FieldID: i, SeedID: 0, PlantTime: now, FieldValidDate: 1, PayTime: new Date(now.getTime() + 100 * 365 * 86_400_000),
      payFieldTime: 876_000, GainCount: 0, AccelerateTime: 0, AutomaticTime: now, IsExit: true,
    }));
    await db.insert(FIELD).values(rows);
  }
  const fieldRows = await db.select().from(FIELD).where(and(eq(FIELD.FarmID, userId), eq(FIELD.IsExit, true)));
  return { farm, fields: new Map(fieldRows.map((f) => [f.FieldID, f])) };
}

export async function saveField(ctx: ServerContext, userId: number, f: FieldRow): Promise<void> {
  const { ID, FarmID: _fid, ...rest } = f;
  if (ID > 0) await ctx.db.db.update(FIELD).set(rest).where(eq(FIELD.ID, ID));
  else { const [row] = await ctx.db.db.insert(FIELD).values({ ...rest, FarmID: userId }).returning(); f.ID = row!.ID; }
}
export async function saveFarm(ctx: ServerContext, f: FarmRow): Promise<void> {
  const { ID, ...rest } = f;
  await ctx.db.db.update(FARM).set(rest).where(eq(FARM.ID, ID));
}

export function st(ctx: ServerContext, p: GamePlayer): Promise<FarmState> {
  const cur = stateByPlayer.get(p);
  if (cur) return Promise.resolve(cur);
  return loadFarm(ctx, p.id, p.info.NickName ?? "").then(({ farm, fields }) => {
    const s: FarmState = { farm, fields, viewing: null };
    stateByPlayer.set(p, s);
    return s;
  });
}
/** Estado de fazenda de outro jogador (visita/roubo), sem ligar ao WeakMap do visitante. */
export function stateOf(other: GamePlayer): FarmState | undefined { return stateByPlayer.get(other); }

export function fieldPacket(f: FieldRow): PacketOut {
  const p = new PacketOut(81);
  p.writeByte(17); // FARM_LAND_INFO: single-field echo
  p.writeInt(f.FieldID); p.writeInt(f.SeedID); Out.wd(p, f.PlantTime); p.writeInt(f.FieldValidDate);
  p.writeInt(f.AccelerateTime); p.writeInt(f.GainCount); Out.wd(p, f.PayTime);
  return p;
}
export function farmSnapshot(sub: number, ownerId: number, ownerName: string, isHelper: boolean, fields: FieldRow[]): PacketOut {
  const p = new PacketOut(81);
  p.writeByte(sub); p.writeInt(ownerId); p.writeString(ownerName); p.writeBoolean(isHelper); p.writeInt(fields.length);
  for (const f of fields) {
    p.writeInt(f.FieldID); p.writeInt(f.SeedID); Out.wd(p, f.PlantTime); p.writeInt(f.FieldValidDate);
    p.writeInt(f.AccelerateTime); p.writeInt(f.GainCount); Out.wd(p, f.PayTime);
  }
  return p;
}
export function helperPacket(farm: FarmRow): PacketOut {
  const p = new PacketOut(81);
  p.writeByte(9); p.writeBoolean(farm.isFarmHelper); p.writeInt(farm.isAutoId); p.writeInt(farm.AutoValidDate); p.writeInt(farm.KillCropId);
  return p;
}

export async function giveOrMail(ctx: ServerContext, p: GamePlayer, tpl: ItemTemplate, count: number): Promise<void> {
  const item = ItemInfo.createFromTemplate(tpl, count, 102);
  const inv = p.getItemInventory(tpl) ?? p.propBag;
  if (inv.addTemplate(item, count)) return;
  item.UserID = 0; item.BagType = -1; item.Place = -1;
  await saveItem(ctx.db.db, item);
  await sendMail(ctx.db.db, { Content: "Mochila cheia", Title: "Mochila cheia", Annex1: String(item.ItemID), Annex1Name: tpl.Name ?? "", Gold: 0, Money: 0, Type: 9, Receiver: p.info.NickName ?? "", ReceiverID: p.id, Sender: "Fazenda", SenderID: 0 } as never);
  p.send(Out.mailResponse(p.id, 1));
}
