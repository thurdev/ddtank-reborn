/**
 * Aba no jogo: Sociedade › missão do clã (liberar, atualizar/reroll, ver progresso/entrega).
 * Pacotes: 129 CONSORTIA_CMD sub 22 CONSORTIA_TASK_RELEASE (int sub interno 0-3).
 * C#: `CConsortiaTask.cs` → `ConsortiaTaskLogicProcessor` (int `ConsortiaTaskType`).
 * Como testar: `apps/game/test/consortia.test.ts`. Manual: Sociedade → Missão do clã.
 */
import type { GSPacket } from "@ddt/protocol";
import * as Db from "../../db/consortia.js";
import { TASK_RESET_MONEY } from "../../game/consortia.js";
import { consortiaMgr } from "../../game/consortia-mgr.js";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import { GM_NOTICE, reply } from "./comum.js";

/**
 * 22 CONSORTIA_TASK_RELEASE — sub interno (int):
 * 0 ReleaseTask (libera uma missão nova, cobrando Riqueza do clã), 1 ResetTask (reroll pagando Cupom),
 * 2 SumbitTask (`{2, bool hasActive}`, pergunta se já tem missão ativa), 3 consulta a missão ativa.
 */
export async function taskRelease(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  if (p.info.ConsortiaID === 0) return;
  const m = await consortiaMgr(ctx);
  const sub = pkt.readInt();
  const now = ctx.now();
  const cid = p.info.ConsortiaID;
  switch (sub) {
    case 0: {
      // ReleaseTask.cs: o cliente 4.1 não manda o nível (o C# lia além do fim do pacote -> 1)
      const level = pkt.dataLeft >= 4 ? pkt.readInt() : 1;
      if (m.activeTask(cid, now)) return p.send(m.taskInfoPacket(m.activeTask(cid, now)));
      const c = await Db.getConsortia(ctx.db.db, cid);
      if (!c) return;
      const cost = m.missionCost(c.Level);
      if (c.Riches < cost || (await Db.spendRiches(ctx.db.db, cid, p.id, cost)) !== 0) return p.sendMessage(GM_NOTICE, m.t("ConsortiaBussiness.Riches.Msg3", "Riqueza do Clã insuficiente."));
      await m.refreshRiches(cid);
      m.tasks.delete(cid); // a antiga (expirada)
      const t = m.createTask(cid, level <= 0 ? 1 : level, now);
      for (const o of m.online(cid)) o.send(m.taskInfoPacket(t));
      return;
    }
    case 1: {
      // ResetTask.cs
      if (p.info.Money < TASK_RESET_MONEY) return p.sendMessage(GM_NOTICE, "Cupons insuficientes para atualizar a missão.");
      p.removeMoney(TASK_RESET_MONEY);
      const t = m.resetTask(cid, now);
      return p.send(m.taskInfoPacket(t));
    }
    case 2: {
      // SumbitTask: SendSumbitTask(true)
      const out = reply(22);
      out.writeByte(2); out.writeBoolean(!!m.activeTask(cid, now));
      return p.send(out);
    }
    case 3:
      return p.send(m.taskInfoPacket(m.activeTask(cid, now)));
  }
}
