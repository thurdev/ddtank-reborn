/**
 * Infra compartilhada por quase todo arquivo de `sociedade/` — sem tela própria. Todo sub-comando de
 * 129 CONSORTIA_CMD responde com um pacote `{byte sub, ...}`; `reply()`/`GM_NOTICE`/`pick()` são só
 * atalhos pra montar essa resposta e escolher a mensagem de erro certa (cada família de mensagens
 * `ConsortiaBussiness.*.MsgN` do C# virou um `Record<number,string>` pequeno, declarado no arquivo da
 * própria ação). `onJoined`/`userPassPacket` é o único pedaço de lógica de fato compartilhada: tanto
 * aceitar um pedido de entrada (`entrar-pedir.ts`) quanto aceitar um convite (`convite.ts`) terminam
 * no mesmo "HandleConsortiaUserPass" do C# (novo membro atualizado + broadcast 128.1 pro clã todo).
 * C#: `Game.Server/Consortia/Handle/*.cs` (ver cabeçalho de cada arquivo que usa isso).
 */
import { PacketOut } from "@ddt/protocol";
import * as Db from "../../db/consortia.js";
import { ConsortiaMgr } from "../../game/consortia-mgr.js";
import * as Out from "../../packets/out.js";
import type { ServerContext } from "../../session/context.js";

/** eMessageType.GM_NOTICE / Normal = 0, ChatNormal = 2 — a maioria das mensagens de erro usa o canal 0. */
export const GM_NOTICE = 0;

/** Monta a resposta padrão `129 {byte sub, ...}` de um sub-comando de CONSORTIA_CMD. */
export function reply(sub: number, playerId = 0): PacketOut {
  const p = new PacketOut(129, playerId);
  p.writeByte(sub);
  return p;
}

/** Escolhe a mensagem certa pro código de erro devolvido pela procedure SQL (`Db.*`), com um default. */
export function pick(map: Record<number, string>, code: number, dflt: string): string {
  return map[code] ?? dflt;
}

/** 128.1 (SendConsortiaUserPass) — o ConsortiaUserInfo do membro que acabou de entrar. */
function userPassPacket(j: Db.JoinedMember, isInvite: boolean, otherId: number, otherName: string): PacketOut {
  const p = ConsortiaMgr.response(1);
  p.writeInt(j.memberRowId); p.writeBoolean(isInvite); p.writeInt(j.consortiaId); p.writeString(j.consortiaName);
  p.writeInt(j.userId); p.writeString(j.userName); p.writeInt(otherId); p.writeString(otherName);
  p.writeInt(j.duty.DutyID); p.writeString(j.duty.DutyName); p.writeInt(j.detail.Offer); p.writeInt(j.detail.RichesOffer); p.writeInt(j.detail.RichesRob);
  Out.wd(p, j.detail.LastDate); p.writeInt(j.detail.Grade); p.writeInt(j.duty.Level); p.writeInt(j.detail.State); p.writeBoolean(j.detail.Sex);
  p.writeInt(j.duty.Right); p.writeInt(j.detail.Win); p.writeInt(j.detail.Total); p.writeInt(j.detail.Escape); p.writeInt(j.repute);
  p.writeString(j.detail.UserName); p.writeInt(j.detail.FightPower); p.writeInt(j.detail.AchievementPoint); p.writeString(j.detail.Honor);
  p.writeInt(j.detail.UseOffer);
  return p;
}

/**
 * HandleConsortiaUserPass: o `PlayerInfo` do novo membro é atualizado (cargo, direitos, chat liberado),
 * e todo membro online do clã recebe o 128.1 — usado tanto ao aceitar um pedido de entrada quanto um
 * convite (só muda `isInvite`/quem convidou pra mensagem ficar certa).
 */
export async function onJoined(ctx: ServerContext, m: ConsortiaMgr, j: Db.JoinedMember, isInvite: boolean, otherId: number, otherName: string): Promise<void> {
  const c = await Db.getConsortia(ctx.db.db, j.consortiaId);
  const joined = ctx.world.get(j.userId);
  if (joined && c) {
    joined.beginChanges();
    m.applyGuild(joined, c);
    Object.assign(joined.info, { DutyName: j.duty.DutyName, DutyLevel: j.duty.Level, Right: j.duty.Right, IsBanChat: false });
    joined.commitChanges();
    joined.send(m.buffPacket(joined, ctx.now()));
  }
  if (c) for (const o of m.online(c.ConsortiaID)) if (o !== joined) o.info.ConsortiaRiches = c.Riches;
  const pkt = userPassPacket(j, isInvite, otherId, otherName);
  for (const o of m.online(j.consortiaId)) o.send(pkt);
}
