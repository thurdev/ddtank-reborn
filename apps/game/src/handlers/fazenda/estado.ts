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

/**
 * Bloco de campo compartilhado por `SendEnterFarm` (C#: AbstractPacketLib.cs:2309-2317) e
 * `SendPayFields` (C#: AbstractPacketLib.cs:2411-2417) — mesma ordem nos dois: FieldID, SeedID,
 * PayTime, PlantTime, GainCount, FieldValidDate, AccelerateTime. Lido por
 * `FarmModelController.__onEnterFarm`/`__payField` nessa mesma ordem.
 */
function writeFieldBlock(p: PacketOut, f: FieldRow): void {
  p.writeInt(f.FieldID); p.writeInt(f.SeedID); Out.wd(p, f.PayTime); Out.wd(p, f.PlantTime);
  p.writeInt(f.GainCount); p.writeInt(f.FieldValidDate); p.writeInt(f.AccelerateTime);
}

/**
 * sub 1 ENTER_FARM. C#: `AbstractPacketLib.SendEnterFarm` (~2299-2331). Lido por
 * `FarmModelController.__onEnterFarm`. `viewerId`/`viewerVipLevel` são sempre o jogador que pediu pra
 * entrar (não necessariamente o dono do terreno) — o bloco extra (preço/VIP/buyExpRemainNum) só sai
 * quando `farm.FarmID === viewerId` (própria fazenda); senão só o bool `isArrange`.
 */
export function enterFarmPacket(ctx: ServerContext, farm: FarmRow, fields: FieldRow[], viewerId: number, viewerVipLevel: number): PacketOut {
  const p = new PacketOut(81);
  p.writeByte(1);
  p.writeInt(farm.FarmID);
  p.writeBoolean(farm.isFarmHelper);
  p.writeInt(farm.isAutoId);
  Out.wd(p, farm.AutoPayTime);
  p.writeInt(farm.AutoValidDate);
  p.writeInt(farm.GainFieldId);
  p.writeInt(farm.KillCropId);
  p.writeInt(fields.length);
  for (const f of fields) writeFieldBlock(p, f);
  if (farm.FarmID === viewerId) {
    p.writeInt(ctx.templates.cfgInt("FastGrowNeedMoney", 10));
    p.writeString(farm.PayFieldMoney ?? "");
    p.writeString(farm.PayAutoMoney ?? "");
    Out.wd(p, farm.AutoPayTime);
    p.writeInt(farm.AutoValidDate);
    p.writeInt(viewerVipLevel);
    p.writeInt(farm.buyExpRemainNum);
  } else {
    p.writeBoolean(farm.isArrange);
  }
  return p;
}

/** sub 6 PAY_FIELD reply. C#: `AbstractPacketLib.SendPayFields` (~2391-2409). Lido por `__payField`. Só
 * os terrenos que acabaram de ser pagos (não a fazenda inteira). */
export function payFieldsPacket(playerId: number, fields: FieldRow[]): PacketOut {
  const p = new PacketOut(81);
  p.writeByte(6);
  p.writeInt(playerId);
  p.writeInt(fields.length);
  for (const f of fields) writeFieldBlock(p, f);
  return p;
}

/** sub 2 GROW_FIELD reply ("seeding"). C#: `AbstractPacketLib.SendSeeding` (~2339-2349). Lido por
 * `__onSeeding` (que ignora PayTime/FieldValidDate, mas eles têm que estar no pacote do mesmo jeito). */
export function seedingPacket(f: FieldRow): PacketOut {
  const p = new PacketOut(81);
  p.writeByte(2);
  p.writeInt(f.FieldID); p.writeInt(f.SeedID); Out.wd(p, f.PlantTime); Out.wd(p, f.PayTime);
  p.writeInt(f.GainCount); p.writeInt(f.FieldValidDate);
  return p;
}

/** sub 4 GAIN_FIELD reply ("toGather"). C#: `AbstractPacketLib.SendtoGather` (~2379-2389). Lido por
 * `__gainFieldHandler`. Mesmo pacote serve colheita própria e roubo de amigo (ambos chamam SendtoGather
 * com o mesmo `UserFieldInfo`). */
export function gatherPacket(f: FieldRow): PacketOut {
  const p = new PacketOut(81);
  p.writeByte(4);
  p.writeBoolean(true);
  p.writeInt(f.FieldID); p.writeInt(f.SeedID); Out.wd(p, f.PlantTime);
  p.writeInt(f.GainCount); p.writeInt(f.AccelerateTime);
  return p;
}

/** sub 7 KILLCROP_FIELD reply. C#: `AbstractPacketLib.SendKillCropField` (~2420-2430). Lido por
 * `__onKillCrop`. Só 2 campos depois do bool (sem data, sem GainCount). */
export function killCropPacket(f: FieldRow): PacketOut {
  const p = new PacketOut(81);
  p.writeByte(7);
  p.writeBoolean(true);
  p.writeInt(f.FieldID); p.writeInt(f.SeedID); p.writeInt(f.AccelerateTime);
  return p;
}

/**
 * sub 3 reply ("doMature"). C#: `AbstractPacketLib.SenddoMature` (~2353-2369). Lido por `__onDoMature`:
 * int count, por entrada bool ok (+ se ok: FieldID, GainCount, AccelerateTime). Usado em dois lugares:
 * - sub 18 FRAM_GROP_FASTFORWARD ("regar tudo"): `PlayerFarm.GropFastforward` chama `SenddoMature`, NÃO
 *   um echo do sub 18 — `slots` aqui tem que ser o array de capacidade fixa inteiro (null nos slots sem
 *   terreno alugado/plantado), não só os campos que mudaram.
 * - sub 3 ACCELERATE_FIELD (adubo manual, feature nova do Reborn — ver `fertilizar.ts`): `slots` é
 *   `[f]` (sucesso, count 1) ou `[]` (falha, count 0).
 */
export function doMaturePacket(slots: (FieldRow | null)[]): PacketOut {
  const p = new PacketOut(81);
  p.writeByte(3);
  p.writeInt(slots.length);
  for (const f of slots) {
    if (f) { p.writeBoolean(true); p.writeInt(f.FieldID); p.writeInt(f.GainCount); p.writeInt(f.AccelerateTime); }
    else p.writeBoolean(false);
  }
  return p;
}

/** sub 9 HELPER_SWITCH_FIELD reply. C#: `AbstractPacketLib.SendHelperSwitchField` (~2420-2432). Lido por
 * `__onHelperSwitch`. Também reaproveitado (com valores em branco) pela resposta do sub 8
 * HELPER_PAY_FIELD — ver comentário em `ajudante.ts:helperPayField`. */
export function helperSwitchPacket(farm: Pick<FarmRow, "isFarmHelper" | "isAutoId" | "AutoPayTime" | "AutoValidDate" | "GainFieldId" | "KillCropId">): PacketOut {
  const p = new PacketOut(81);
  p.writeByte(9);
  p.writeBoolean(farm.isFarmHelper);
  p.writeInt(farm.isAutoId);
  Out.wd(p, farm.AutoPayTime);
  p.writeInt(farm.AutoValidDate);
  p.writeInt(farm.GainFieldId);
  p.writeInt(farm.KillCropId);
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
