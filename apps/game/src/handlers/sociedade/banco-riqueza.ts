/**
 * Aba no jogo: Sociedade › banco (doar Riqueza / doar Medalha pra missão do clã, configurar quem pode
 * sacar equipamento do banco).
 * Pacotes: 129 CONSORTIA_CMD sub 6 CONSORTIA_RICHES_OFFER, sub 23 DONATE (design próprio — ver cabeçalho
 * de `donate` abaixo), sub 24 CONSORTIA_EQUIP_CONTROL.
 * C#: `ConsortiaRichesOffer.cs`, `Donate.cs` (sem lógica real no original), `ConsortiaEquipControl.cs`.
 * Como testar: `apps/game/test/consortia.test.ts`. Manual: Sociedade → Banco → Doar / Configurar saque.
 */
import type { GSPacket } from "@ddt/protocol";
import * as Db from "../../db/consortia.js";
import { donationRiches } from "../../game/consortia.js";
import { ConsortiaMgr, consortiaMgr } from "../../game/consortia-mgr.js";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import { reply } from "./comum.js";

/** 6 CONSORTIA_RICHES_OFFER (ConsortiaRichesOffer.cs) — doar Cupom (Money) em troca de Riqueza pro clã. */
export async function richesOffer(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  if (p.info.ConsortiaID === 0) return;
  const m = await consortiaMgr(ctx);
  const money = pkt.readInt();
  if (p.info.HasBagPassword && p.info.IsLocked) return p.sendMessage(0, ctx.lang.t("Bag.Locked"));
  const d = donationRiches(money, p.info.Money);
  if (!d.ok) return p.sendMessage(0, d.err === "NoMoney" ? ctx.lang.t("ConsortiaRichesOfferHandler.NoMoney") : ctx.lang.t("ConsortiaRichesOfferHandler.RichIsNotFound", 2));
  const cid = p.info.ConsortiaID;
  const res = await Db.addRiches(ctx.db.db, cid, d.riches, 5, p.info.NickName ?? "", (n, v) => m.t("SP_Consortia_Riches_Add.Msg1", " O membro {0} doou {1} pontos de riqueza!", n, v));
  if (res.ok) {
    p.beginChanges();
    p.info.RichesOffer += d.riches;
    p.info.RichesRob += d.riches;
    p.removeMoney(money);
    p.commitChanges();
    await p.saveIntoDatabase(ctx.db.db); // a riqueza do clã já foi commitada: persiste o pagamento agora (sem duplicar em crash)
    await m.refreshRiches(cid);
    m.onDonate(p, d.riches);
    const pk = ConsortiaMgr.response(9);
    pk.writeInt(cid); pk.writeInt(p.id); pk.writeString(p.info.NickName ?? ""); pk.writeInt(d.riches);
    // + 128.16 (cliente: recarrega a ConsortiaList do próprio clã) pra tela dos outros membros mostrar a riqueza
    // nova; o original só atualizava o contador do doador e o presidente via "riqueza insuficiente" até reentrar
    const refresh = ConsortiaMgr.response(16);
    for (const o of m.online(cid)) {
      o.send(pk);
      if (o !== p) o.send(refresh);
    }
  }
  const out = reply(6);
  out.writeInt(money); out.writeBoolean(res.ok); out.writeString(ctx.lang.t(res.ok ? "ConsortiaRichesOfferHandler.Successed" : "ConsortiaRichesOfferHandler.Failed"));
  p.send(out);
}

/**
 * 23 DONATE (Donate.cs) — nunca teve lógica real no original (só `Console.WriteLine`; o branch comentado de
 * item 11408/medalha nunca rodava). Design novo (completa a intenção original, sem fonte C#; detalhe em
 * `research/qa/feature-designs.md`): o cliente só manda esse pacote via `DonateFrame.as` (`EquipType.MEDAL`
 * = 11408 fixo, `amount` = quantia digitada) — e mesmo esse botão está comentado no build atual
 * (`ConsortiaMyTaskFinishItem.__donateClick` redireciona pra `alertTaxFrame`/richesOffer em vez de abrir o
 * `DonateFrame`). A missão do clã já tem uma condição tipo 5 "DonateRichesCondition" (`consortia-mgr.ts`
 * `progress(p, 5, amount)`) alimentada hoje só pelo doar Riqueza (sub 6); este handler alimenta a MESMA
 * condição doando Medalha (`item 11408`) direto da bolsa — um segundo caminho pra mesma meta de clã, do
 * jeito que o `DonateFrame` original parecia pretender antes de ser cortado. Tipo de item diferente de
 * Medalha é lido (pra não desalinhar o stream) mas ignorado, igual ao `Console.WriteLine` original.
 */
export async function donate(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  const itemType = pkt.readInt();
  const amount = pkt.readInt();
  if (p.info.ConsortiaID === 0 || itemType !== 11408 || amount <= 0) return;
  if (p.info.HasBagPassword && p.info.IsLocked) return p.sendMessage(0, ctx.lang.t("Bag.Locked"));
  const have = p.getTemplateCount(11408, ctx.templates.findItem);
  if (have < amount) return p.sendMessage(0, "Medalhas insuficientes para doar.");
  const m = await consortiaMgr(ctx);
  p.removeMedal(amount);
  m.onDonate(p, amount); // mesma condição "doar" (tipo 5) da missão do clã, alimentada hoje só pelo sub 6
  p.sendMessage(0, ctx.lang.t("consortia.task.donateOK"));
}

/** 24 CONSORTIA_EQUIP_CONTROL (ConsortiaEquipControl.cs) — custo em Riqueza pra sacar equipamento do banco
 *  por nível de patente (5 valores) + categoria "qualquer um"/"só quem tem direito" (2 valores). Fix: a ordem
 *  da resposta bate com o cliente (7 ints, bool, msg); o C# escrevia o bool primeiro e sem mensagem. */
export async function equipControl(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  if (p.info.ConsortiaID === 0) return;
  const cid = p.info.ConsortiaID;
  const vals: [number, number, number][] = [];
  for (let i = 0; i < 5; i++) vals.push([i + 1, 1, pkt.readInt()]);
  vals.push([0, 2, pkt.readInt()]);
  vals.push([0, 3, pkt.readInt()]);
  let ok = true;
  for (const [level, type, riches] of vals) if ((await Db.setEquipControl(ctx.db.db, cid, p.id, level, type, riches)) !== 0) ok = false;
  const out = reply(24);
  for (const [, , riches] of vals) out.writeInt(riches);
  out.writeBoolean(ok);
  out.writeString(ctx.lang.t(ok ? "ConsortiaEquipControlHandler.Success" : "ConsortiaBussiness.AddAndUpdateConsortiaEuqipControl.Msg2"));
  p.send(out);
}
