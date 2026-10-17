/**
 * Aba no jogo: "Recompensa diária" do calendário (daily) — 13 DAILY_AWARD junta 4 coisas na mesma tela:
 * buff de login (sub 0), ovo diário (sub 2), caixa VIP (sub 3, só pra VIP) e marcar presença (sub 5, ver
 * `presenca.ts`). A caixa de tempo (53 GET_TIME_BOX) é outra tela do mesmo calendário: caixa "online"
 * (minutos logado) ou caixa "de nível" (Grade). 219/103 são utilidades pequenas do mesmo calendário.
 * Pacotes: 13 DAILY_AWARD, 53 GET_TIME_BOX, 219 WEEKLY_CLICK_CNT, 103 DAILYRECORD.
 * C#: `DailyAwardHandler.cs`, `UserGetBoxHandler.cs`, `UserWeeklyClickHandler.cs`, `DailyRecordHandler.cs`.
 * Como testar: sem teste automatizado dedicado ainda. Manual: `docs/features/eventos.md`, `docs/features/vip.md`.
 */
import { eq } from "drizzle-orm";
import { GSPacket } from "@ddt/protocol";
import { player as P } from "@ddt/db";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import { claimOnce, dayKey, type Reward } from "../../game/events.js";
import { createItemBox } from "../bolsa/abrir-caixa.js";
import * as Out from "../../packets/out.js";
import { boxBegin, eventsRuntime, give, throttled } from "./agendador.js";
import { pushRecords } from "./completar-conquista.js";
import { signIn } from "./presenca.js";

async function openBoxRewards(ctx: ServerContext, p: GamePlayer, boxTemplate: number, title: string): Promise<string> {
  const r = createItemBox(ctx.templates.itemBoxes.get(boxTemplate));
  if (!r) {
    // the box id is an item itself (box template with no Shop_Goods_Box rows): give the box
    return give(ctx, p, [{ templateId: boxTemplate, count: 1 }], title);
  }
  const rewards: Reward[] = [
    { templateId: -100, count: r.gold }, { templateId: -200, count: r.money }, { templateId: -1100, count: r.giftToken },
    { templateId: -300, count: r.medal }, { templateId: 11107, count: r.exp }, { templateId: -800, count: r.honor },
    ...r.items.map((x) => ({ templateId: x.row.TemplateId, count: x.count, validDate: x.row.ItemValid, isBind: x.row.IsBind, strengthenLevel: x.row.StrengthenLevel })),
  ];
  return give(ctx, p, rewards, title);
}

// ------------------------------------------------------------------ 13 DAILY_AWARD
export async function dailyAward(ctx: ServerContext, p: GamePlayer, type: number): Promise<void> {
  const rt = eventsRuntime(ctx);
  const db = ctx.db.db;
  const now = ctx.now();
  const day = dayKey(now);
  const t = (k: string, fb: string) => { const v = ctx.lang.t(k); return v === k ? fb : v; };
  switch (type) {
    case 0: {
      // AwardMgr.AddDailyAward: first Daily_Award Type 0 row -> buff (CreateBufferMinutes(template, ValidDate))
      if (!(await claimOnce(db, p.id, "daily", day))) return p.sendMessage(0, t("GameUserDailyAward.Fail1", "Você já recebeu o prêmio de hoje."));
      p.info.DayLoginCount = (p.info.DayLoginCount ?? 0) + 1;
      p.info.LastAward = now;
      const row = rt.data.dailyAward.find((d) => d.Type === 0);
      const tpl = row && ctx.templates.findItem(row.TemplateID);
      if (tpl) {
        const ex = p.buffs.find((b) => b.Type === tpl.Property1 && b.IsExist && b.BeginDate.getTime() + b.ValidDate * 60_000 > now.getTime());
        if (ex) ex.ValidDate += row.ValidDate;
        else {
          p.buffs = p.buffs.filter((b) => b.Type !== tpl.Property1);
          p.buffs.push({ UserID: p.id, Type: tpl.Property1, Value: tpl.Property2, BeginDate: now, ValidDate: row.ValidDate, TemplateID: tpl.TemplateID, ValidCount: tpl.Property3, Data: null, IsExist: true });
        }
        p.send(Out.bufferList(p.id, p.buffs));
      }
      p.send(Out.dailyAward(now, now));
      pushRecords(p);
      return p.sendMessage(0, `${t("GameUserDailyAward.Success", "Prêmio diário recebido!")}${tpl ? ` ${tpl.Name}` : ""}`);
    }
    case 2: {
      if (!(await claimOnce(db, p.id, "egg", day))) return p.sendMessage(0, "Você já recebeu 1 vez hoje!");
      p.info.LastGetEgg = now;
      const s = await give(ctx, p, [{ templateId: 112059, count: 1 }], "Ovo diário");
      return p.sendMessage(0, `${t("GameServer.DailyEggReceive.Success", "Ovo diário recebido:")} ${s}`);
    }
    case 3: {
      // VIP daily box: ItemMgr.FindItemBoxTypeAndLv(2, VIPLevel) = LoadUserBox Type 2, Level = VIP level
      const box = rt.data.userBox.find((b) => b.Type === 2 && b.Level === p.info.VIPLevel);
      if (!p.info.VIPLevel || !box) return p.sendMessage(0, "Apenas para VIP.");
      if (!(await claimOnce(db, p.id, "vip", day))) {
        p.info.CanTakeVipReward = false;
        p.send(Out.openVip(p.info));
        return p.sendMessage(0, "Você já recebeu a recompensa de hoje!");
      }
      const s = await openBoxRewards(ctx, p, box.TemplateID, "Caixa VIP");
      // the client pops the VIP gift frame while CanTakeVipReward is set (ChecVipkExpireDay re-opens it the next day)
      p.info.CanTakeVipReward = false;
      p.info.LastVIPPackTime = ctx.now();
      p.send(Out.openVip(p.info));
      return p.sendMessage(0, `Caixa VIP: ${s}`);
    }
    case 5:
      return void (await signIn(ctx, p));
  }
}

/** Registro: lê o sub-tipo, aplica o debounce compartilhado (`throttled`) e despacha pro `dailyAward` acima. */
export function dailyAwardHandler(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): void | Promise<void> {
  const type = pkt.readInt();
  if (throttled(p, 500)) return;
  return dailyAward(ctx, p, type);
}

// ------------------------------------------------------------------ 53 GET_TIME_BOX
/** 53 GET_TIME_BOX (UserGetBoxHandler.cs): mode 0 = client minute report (ignored for rewards), else boxType 0 time / 1 level. */
export async function timeBox(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  const rt = eventsRuntime(ctx);
  const mode = pkt.readInt();
  const c = p.info;
  const now = ctx.now();
  if (mode === 0) {
    pkt.readInt();
    return;
  }
  const boxType = pkt.readInt();
  let ok = false;
  let box;
  if (boxType === 0) {
    box = rt.data.findBox(0, c.Grade, c.BoxProgression ?? 0);
    const minutes = Math.floor((now.getTime() - (boxBegin.get(p) ?? now.getTime())) / 60_000);
    // server-side elapsed time since login / last box (the original also accepted the client's report)
    if (box && minutes >= box.Condition && (await claimOnce(ctx.db.db, p.id, "timebox", `${dayKey(now)}:${box.Condition}`))) {
      c.BoxProgression = box.Condition; c.BoxGetDate = now; c.AlreadyGetBox = 0; ok = true;
    }
  } else {
    box = rt.data.findBox(1, c.GetBoxLevel ?? 0, c.Sex ? 1 : 0);
    if (box && c.Grade >= box.Level && (await claimOnce(ctx.db.db, p.id, "levelbox", String(box.Level)))) { c.GetBoxLevel = box.Level; ok = true; }
  }
  if (ok && box) {
    const s = await openBoxRewards(ctx, p, box.TemplateID, "Caixa de tempo");
    if (boxType === 0) {
      boxBegin.set(p, now.getTime());
      const next = rt.data.findBox(0, c.Grade, c.BoxProgression ?? 0);
      p.sendMessage(0, next ? `Presente do baú do tempo recebido. ${s}` : `Você já recebeu tudo de hoje. ${s}`);
    } else p.sendMessage(0, `${ctx.lang.t("UserGetTimeBoxHandler.level")} ${s}`);
  } else p.sendMessage(0, ctx.lang.t("UserGetTimeBoxHandler.fail"));
  if (boxType === 0) {
    const out = new GSPacket(53, p.id);
    out.writeInt(mode); out.writeInt(boxType);
    out.writeBoolean(ok);
    out.writeInt(c.BoxProgression ?? 0);
    p.send(out);
  }
}

// ------------------------------------------------------------------ 219/103 utilidades do calendário
/** UserWeeklyClickHandler: compares DateTime.Now with LastGetEgg.Date (always true in practice). */
export function weeklyClickCnt(ctx: ServerContext, p: GamePlayer): void {
  const out = new GSPacket(219, p.id);
  out.writeBoolean(!p.info.LastGetEgg || dayKey(p.info.LastGetEgg) !== dayKey(ctx.now()));
  p.send(out);
}

/** DailyRecordHandler: returns and deletes the DailyRecord rows. */
export async function dailyRecordHandler(ctx: ServerContext, p: GamePlayer): Promise<void> {
  const rows = await ctx.db.db.delete(P.DailyRecordInfo).where(eq(P.DailyRecordInfo.UserID, p.id)).returning();
  const out = new GSPacket(103, p.id);
  out.writeInt(rows.length);
  for (const x of rows) { out.writeInt(x.Type); out.writeString(x.Value); }
  p.send(out);
}
