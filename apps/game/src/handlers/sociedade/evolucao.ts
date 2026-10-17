/**
 * Aba no jogo: Sociedade › evoluir (sede/nível geral, loja, ferraria, bônus) — gasta Riqueza acumulada.
 * Pacotes: 129 CONSORTIA_CMD sub 21 CONSORTIA_LEVEL_UP.
 * C#: `ConsortiaUpGrade.cs`/`ConsortiaStoreUpGrade.cs`/`ConsortiaShopUpGrade.cs`/`ConsortiaSmithUpGrade.cs`/
 * `ConsortiaBufferUpGrade.cs` (os 5 `kind` 1-5 de `UpgradeKind`, unificados num handler só no original também).
 * Como testar: `apps/game/test/consortia.test.ts`. Manual: Sociedade → Evoluir.
 */
import { PacketOut, type GSPacket } from "@ddt/protocol";
import * as Db from "../../db/consortia.js";
import { upgradeMsg, upgradeNoticeKey, type UpgradeKind } from "../../game/consortia.js";
import { ConsortiaMgr, consortiaMgr } from "../../game/consortia-mgr.js";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import { reply } from "./comum.js";

/**
 * 21 CONSORTIA_LEVEL_UP — kind 1 sede (Riqueza E Ouro do presidente), 2 loja, 3 ferraria, 4 forja, 5 bônus
 * (só Riqueza). `nk`/aviso global replica o `GameSocketOut` mandando `10 {int 2, msg}` pra todo mundo online
 * quando o clã sobe de nível (kind 1) numa faixa com anúncio configurado.
 */
export async function levelUp(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  if (p.info.ConsortiaID === 0) return;
  const m = await consortiaMgr(ctx);
  const kind = pkt.readByte() as UpgradeKind;
  if (kind < 1 || kind > 5) return;
  const cid = p.info.ConsortiaID;
  const h = ({ 1: "ConsortiaUpGradeHandler", 2: "ConsortiaStoreUpGradeHandler", 3: "ConsortiaShopUpGradeHandler", 4: "ConsortiaSmithUpGradeHandler", 5: "ConsortiaBufferUpGradeHandler" } as const)[kind];
  let msg = `${h}.Failed`;
  let level = 0;
  let ok = false;
  const c = await Db.getConsortia(ctx.db.db, cid);
  const next = m.levels.get((c?.Level ?? 0) + 1);
  if (!c) msg = kind === 5 ? "ConsortiaUpGradeHandler.NoConsortia" : `${h}.NoConsortia`;
  else if (kind === 1 && !next) msg = "ConsortiaUpGradeHandler.NoUpGrade";
  else if (kind === 1 && next!.NeedGold > p.info.Gold) msg = "ConsortiaUpGradeHandler.NoGold";
  else {
    const res = await Db.upgradeBuilding(ctx.db.db, kind, cid, p.id, m.levels);
    if (res.code === 0) {
      ok = true;
      level = res.level!;
      msg = `${h}.Success`;
      if (kind === 1) {
        p.removeGold(next!.NeedGold);
        await p.saveIntoDatabase(ctx.db.db);
      }
      const nc = res.consortia!;
      const sub = ({ 1: 6, 2: 12, 3: 10, 4: 11, 5: 13 } as const)[kind];
      const pk = ConsortiaMgr.response(sub);
      pk.writeInt(cid); pk.writeString(nc.ConsortiaName); pk.writeInt(level);
      for (const o of m.online(cid)) {
        m.applyGuild(o, nc);
        o.send(pk);
        o.updateProperties();
      }
      const nk = upgradeNoticeKey(kind, level);
      if (nk) {
        const notice = new PacketOut(10);
        notice.writeInt(2);
        notice.writeString(ctx.lang.t(nk, nc.ConsortiaName, level));
        for (const o of ctx.world.all()) if (o !== p) o.send(notice);
      }
    } else msg = upgradeMsg(kind, res.code) ?? msg;
  }
  const out = reply(21);
  out.writeByte(kind); out.writeByte(level); out.writeBoolean(ok); out.writeString(ctx.lang.t(msg));
  p.send(out);
}
