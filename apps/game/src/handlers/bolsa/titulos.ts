/**
 * Aba no jogo: Personagem — títulos (mostrar/trocar o título exibido, e desbloquear título via cartão).
 * Pacotes: 189 USER_CHANGE_RANK (trocar título exibido), 265 NEWTITLE_CARD (desbloquear título por cartão).
 * C#: `ReworkRankHandler.cs`, `NewTitleCardHandler.cs:500`, `PlayerRank.AddNewRank` (GameUtils/PlayerRank.cs:160).
 * Como testar: `apps/game/test/titulos.test.ts`. Manual: ficha do personagem → título.
 *
 * 41-titulo-por-cartao: a tabela de definição (`game."New_Title"`, `NewTitleMgr`) já tinha schema + seed
 * (325 linhas reais) no Postgres — o gap era só `Templates` nunca carregar pra memória (ver
 * `apps/game/src/db/templates.ts` `newTitles`/`findNewTitle`). Sem migração nova.
 */
import { and, eq } from "drizzle-orm";
import { player as P } from "@ddt/db";
import { loadUserRanks } from "../../db/social.js";
import * as Out from "../../packets/out.js";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import type { HandlerRegistry } from "../registry.js";

/**
 * PlayerRank.AddNewRank(id, days) (GameUtils/PlayerRank.cs:160): matches by `NewTitleID` (not Name, unlike
 * `AddAchievementRank` — see `handlers/eventos/completar-conquista.ts` `grantTitle`). Already owning this
 * title just refreshes it (`IsExit=true`, `EndDate`/`Validate` reset to the new `days`) instead of adding a
 * duplicate `Sys_User_Rank` row — this is what makes re-using a card for an already-owned title a no-op
 * worth noting but not a dupe: it never grants twice, it only ever has at most one row per (UserID,
 * NewTitleID). `days<=0` = permanent (same `Validate<=0` convention as `189 USER_CHANGE_RANK` above).
 */
export async function grantNewTitle(ctx: ServerContext, p: GamePlayer, titleId: number, name: string, days: number): Promise<void> {
  const db = ctx.db.db;
  const now = ctx.now();
  const end = new Date(now.getTime() + Math.max(0, days) * 86_400_000);
  const [row] = await db.select().from(P.Sys_User_Rank).where(and(eq(P.Sys_User_Rank.UserID, p.id), eq(P.Sys_User_Rank.NewTitleID, titleId))).limit(1);
  if (row) await db.update(P.Sys_User_Rank).set({ IsExit: true, EndDate: end, Validate: days }).where(eq(P.Sys_User_Rank.ID, row.ID));
  else await db.insert(P.Sys_User_Rank).values({ UserID: p.id, Name: name, NewTitleID: titleId, BeginDate: now, EndDate: end, Validate: days, IsExit: true });
  const ranks = await loadUserRanks(db, p.id);
  p.send(Out.userRanks(p.id, ranks));
}

export function registerTitulos(r: HandlerRegistry): void {
  /** ReworkRankHandler.cs (189 USER_CHANGE_RANK): switch the displayed title to one of the player's own, earned
   * (Sys_User_Rank) titles — or clear it when the name doesn't match any. */
  r.player(189, "USER_CHANGE_RANK", async (ctx, p, pkt) => {
    const honor = pkt.readString();
    if (!honor) return;
    const now = ctx.now();
    const ranks = await loadUserRanks(ctx.db.db, p.id);
    const match = ranks.find((rk) => (rk.Name ?? "").includes(honor) && (rk.Validate <= 0 || rk.BeginDate.getTime() + rk.Validate * 86_400_000 > now.getTime()));
    p.info.Honor = match ? honor : "";
    p.info.honorId = match?.NewTitleID ?? 0; // 41-titulo-por-cartao: NewTitleID agora é real (New_Title carregado), não mais sempre 0
    p.updatePlayerProperties();
  });

  /**
   * NewTitleCardHandler.cs:500 (265 NEWTITLE_CARD): resolve a carta pelo `Property1` do item (chave de
   * `game."New_Title"`), consome 1 unidade da pilha (`RemoveCountFromStack`) e concede o título
   * (`PlayerRank.AddNewRank(title.ID, item.Template.Property2)` — `Property2` = dias de validade, 0 =
   * permanente). Ordem igual ao original: só consome o item DEPOIS de confirmar que o título existe, e só
   * concede o título se o consumo realmente aconteceu (nunca os dois fora de ordem). Aviso global (igual
   * `WorldMgr.SendSysNotice(string)`, packet 10 tipo 3, `SendToAll` — processo único = todo jogador online).
   */
  r.player(265, "NEWTITLE_CARD", async (ctx, p, pkt) => {
    const bagType = pkt.readByte();
    const place = pkt.readInt();
    const inv = p.getInventory(bagType);
    const item = inv?.getItemAt(place);
    if (!item) return p.sendMessage(0, ctx.lang.t("NewTitleCardHandler.ItemNotFound"));
    const title = ctx.templates.findNewTitle(item.template.Property1);
    if (!title) return p.sendMessage(0, ctx.lang.t("NewTitleCardHandler.TitleNotFound"));
    if (!inv!.removeCountFromStack(item, 1)) return p.sendMessage(0, ctx.lang.t("NewTitleCardHandler.RemoveItemError"));
    await grantNewTitle(ctx, p, title.ID, title.Name, item.template.Property2);
    await p.saveIntoDatabase(ctx.db.db); // mesmo padrão de 179/252: não espera o autosave de 10 min pra persistir o consumo + o título novo
    // NewTitleCardHandler.cs:500 monta essa frase direto (não via LanguageMgr) — sem chave de tradução
    // correspondente, replicado como literal (mesmo padrão de "Erro do sistema..." em comprar.ts).
    const notice = Out.sysNoticeToAll(`[${p.zoneName}] Parabéns, o jogador [${p.info.NickName ?? ""}] acabou de receber o título ~${title.Name}~`);
    for (const o of ctx.world.all()) o.send(notice);
  });
}
