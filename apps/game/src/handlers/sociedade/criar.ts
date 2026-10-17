/**
 * Aba no jogo: Sociedade › criar sociedade / dissolver sociedade.
 * Pacotes: 129 CONSORTIA_CMD sub 1 CONSORTIA_CREATE, sub 2 CONSORTIA_DISBAND.
 * C#: `ConsortiaCreate.cs`, `ConsortiaDisband.cs` (`Game.Server/Consortia/Handle/`). O check de captcha do
 * C# não foi portado (não existe sistema de CHECK_CODE); fix: a resposta de falha do disband não tinha bool,
 * então o cliente lia o id do jogador como se fosse o resultado — corrigido aqui.
 * Como testar: `apps/game/test/consortia.test.ts`. Manual: Sociedade (fora de clã) → Criar / Sociedade → Dissolver.
 */
import type { GSPacket } from "@ddt/protocol";
import * as Db from "../../db/consortia.js";
import { CREATE_MONEY, checkCreate } from "../../game/consortia.js";
import { ConsortiaMgr, consortiaMgr } from "../../game/consortia-mgr.js";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import { GM_NOTICE, pick, reply } from "./comum.js";

const MSG_DISBAND = { 2: "ConsortiaBussiness.DeleteConsortia.Msg2", 3: "ConsortiaBussiness.DeleteConsortia.Msg3" };

/**
 * 1 CONSORTIA_CREATE (ConsortiaCreate.cs) — nome + custo (NeedGold do nível 1 em Riqueza, mais CREATE_MONEY
 * em Cupom). Como lê esse código: `chk` vem de `checkCreate()` (nome grande demais / já está num clã / ok).
 */
export async function createConsortia(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  const m = await consortiaMgr(ctx);
  const name = pkt.readString();
  const lv1 = m.levels.get(1);
  if (!lv1) return;
  const chk = checkCreate(p.info, name, lv1.NeedGold);
  if (chk === "inGuild") return;
  if (chk === "name") return p.sendMessage(GM_NOTICE, ctx.lang.t("ConsortiaCreateHandler.Long"));
  let ok = false;
  let cid = 0;
  let msg = "ConsortiaCreateHandler.Failed";
  let duty = { Level: 0, DutyName: "", Right: 0 };
  if (chk === "ok") {
    const res = await Db.createConsortia(ctx.db.db, { userId: p.id, nick: p.info.NickName ?? "", name, level: lv1, dutyName: (k, f) => m.t(k, f), now: ctx.now() });
    if (res.code === 0) {
      cid = res.consortiaId!;
      duty = res.duty!;
      p.beginChanges();
      const c = await Db.getConsortia(ctx.db.db, cid);
      if (c) m.applyGuild(p, c);
      Object.assign(p.info, { DutyLevel: duty.Level, DutyName: duty.DutyName, Right: duty.Right, IsBanChat: false });
      p.removeGold(lv1.NeedGold);
      p.removeMoney(CREATE_MONEY);
      p.commitChanges();
      await p.saveIntoDatabase(ctx.db.db);
      ok = true;
      msg = "ConsortiaCreateHandler.Success";
    } else if (res.code === 2) msg = "ConsortiaBussiness.AddConsortia.Msg2";
  }
  const out = reply(1);
  out.writeString(name); out.writeBoolean(ok); out.writeInt(cid); out.writeString(name); out.writeString(ctx.lang.t(msg));
  out.writeInt(duty.Level); out.writeString(duty.DutyName ?? ""); out.writeInt(duty.Right);
  p.send(out);
}

/**
 * 2 CONSORTIA_DISBAND (ConsortiaDisband.cs) — só o presidente pode dissolver (checado em `Db.disbandConsortia`).
 * Avisa todo membro online (zera o clã dele, igual ao `GamePlayer.ClearConsortia`) antes de responder ao presidente.
 */
export async function disbandConsortia(ctx: ServerContext, p: GamePlayer): Promise<void> {
  if (p.info.ConsortiaID === 0) return;
  const m = await consortiaMgr(ctx);
  const cid = p.info.ConsortiaID;
  const name = p.info.ConsortiaName;
  const code = await Db.disbandConsortia(ctx.db.db, cid, p.id);
  let text = ctx.lang.t(pick(MSG_DISBAND, code, "ConsortiaDisbandHandler.Failed"));
  if (code === 0) {
    text = ctx.lang.t("ConsortiaDisbandHandler.Success1") + name + ctx.lang.t("ConsortiaDisbandHandler.Success2");
    // HandleConsortiaDelete: todo membro online é limpo (AddRobRiches(-RichesRob)), depois recebe 128.2
    const pk = ConsortiaMgr.response(2);
    pk.writeInt(cid);
    for (const o of m.online(cid)) {
      await m.clearConsortia(o);
      if (o !== p) o.send(pk);
    }
    m.tasks.delete(cid);
    void m.saveTask(null, cid);
  }
  const out = reply(2);
  out.writeBoolean(code === 0); out.writeInt(p.id); out.writeString(text);
  p.send(out);
}
