/**
 * Sem tela própria — hook de login (chamado por `session/login.ts`), não um pacote 129 CONSORTIA_CMD.
 * Carrega os buffs do clã (BufferList.LoadFromDatabase: `Consortia_Buffer` pros buffs de clã todo) e
 * manda `129/26` com o estado atual pro jogador que acabou de entrar.
 * C#: `BufferList.LoadFromDatabase` + `SendUpdateConsotiaBuffer`.
 * Como testar: `apps/game/test/consortia.test.ts`.
 */
import * as Db from "../../db/consortia.js";
import { consortiaMgr } from "../../game/consortia-mgr.js";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";

export async function consortiaOnLogin(ctx: ServerContext, p: GamePlayer): Promise<void> {
  const m = await consortiaMgr(ctx);
  const now = ctx.now();
  if (p.info.ConsortiaID) {
    for (const b of await Db.loadGuildBuffers(ctx.db.db, p.info.ConsortiaID)) {
      if (!b.IsOpen || !b.BeginDate || !b.Type || b.BeginDate.getTime() + (b.ValidDate ?? 0) * 60_000 <= now.getTime()) continue;
      if (p.buffs.some((x) => x.Type === b.Type && x.IsExist)) continue;
      p.buffs.push({ UserID: p.id, Type: b.Type, Value: b.Value ?? 0, BeginDate: b.BeginDate, ValidDate: b.ValidDate ?? 0, TemplateID: 0, ValidCount: 1, Data: String(b.BufferID), IsExist: true });
    }
    const t = m.tasks.get(p.info.ConsortiaID);
    if (t && !t.rank.has(p.id)) t.rank.set(p.id, 0);
    p.send(m.buffPacket(p, now)); // BufferList.UpdateChangedBuffers -> SendUpdateConsotiaBuffer (só pros membros)
  } else {
    p.buffs = p.buffs.filter((b) => !(b.Type > 100 && b.Type < 115));
    await m.returnBankItems(p); // expulso/dissolvido enquanto offline (GamePlayer.ClearConsortia(false))
  }
}
