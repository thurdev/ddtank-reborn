/**
 * Aba no jogo: ícone do hall "Passe Clássico" (GrowthPackage / battle pass). Desbloqueia um trilho de 9
 * marcos por NÍVEL (Grade >= 10/20/30/40/45/50/55/60/65, mesmos 9 números do `GrowthPackageModel.gradeList`
 * no AS3 e do `int_0`/`m_gradeList` no C#); cada marco entrega um pacote de itens REAL por CORREIO
 * (`game."Activity_System_Item"` `ActivityType=20`, 58 linhas reais na origem — 6-8 por tier, Quality 0-8 —
 * já servidas ao cliente por `/activitysystemitems.ashx`, nenhum trabalho novo precisou aqui), sempre em
 * ordem (nunca pula tier), 1x cada.
 *
 * `ActivityPackageHandler.cs` (packet 84, sub-cmd 1 = `GrowthPackageType.GROWTHPACKAGE`, dentro do MESMO
 * pacote 84 que `ChickActivationType.CHICKACTIVATION`=2 usa — despachado em `eventos/index.ts` pelo
 * primeiro int, ANTES de chegar em `ativacao-pintinho.ts`):
 *   - 4.1 (`vendor/DDTank41/.../ActivityPackageHandler.cs:31-134`): case GROWTHPACKAGE é `#region` 100%
 *     COMENTADO — código morto no original, nunca executou em produção 4.1.
 *   - 6600 (`vendor/DDT-6600/Source/Game.Server/Game.Server.Packets.Client/ActivityPackageHandler.cs:23-117`):
 *     o MESMO case está DESCOMENTADO, com lógica real. `num7==1` (OPEN, botão "comprar" — cliente só manda
 *     isso enquanto `model.isBuy<1`) cobra `GameProperties.PromotePackagePrice` + confere nível; `num7==2`
 *     (UPDATEDATA, usado pelo cliente como "pegar item" de QUALQUER marco já visível) NÃO cobra nada no
 *     original — só o 1º marco paga, os 8 seguintes são de graça contanto que o nível bata. Estado é
 *     `ActiveSystemInfo.AvailTime` (0-9, nº de marcos já resgatados — incrementa 1 por claim; o cliente
 *     marca `i<AvailTime` como "completo", ver `GrowthPackageModel.isCompleteList`).
 *
 * DECISÃO DE DESIGN (pedido do dono — servidor oficial sem pay-to-win, README.md): no original
 * `MoneyDirect` debita MONEY (cupom/dinheiro real: `GrowthPackageManager.as:173-192` compara
 * `Self.Money`). Aqui debita GOLD (moeda comum, ganhável jogando — drop/missão/venda), NUNCA Money.
 * Justificativa da moeda escolhida: Honra (`myHonor`) é só de PvP/ranqueado e excluiria quem joga só PvE
 * do trilho inteiro; Gold é universal — todo jogador ganha jogando de qualquer jeito — e já é o sumidouro
 * comum de outras compras configuráveis do jogo (`Server_Config` + `p.removeGold`: ajudante da fazenda,
 * buff do juramento do rei, etc.). Preço default = 0 (marco 0 sai de graça por padrão, só por nível —
 * "free-by-level", o mais seguro possível), configurável via `Server_Config` `PromotePackagePrice` (MESMA
 * chave do original, agora interpretada em Gold) — `IsPromotePackageOpen` (também a mesma chave do
 * original) liga/desliga o ícone, default FECHADO (igual ao C#: `GameProperties.cs:240`, default `false`).
 *
 * BUG CORRIGIDO (dano ao jogador, não exploit que beneficia ele — mesma regra "nunca replicar" do
 * AGENTS.md): no `case 1` original, `MoneyDirect` debita a moeda ANTES de checar o nível; se o nível não
 * bate, a moeda já foi debitada e nada é entregue (`return 0` sem reembolso). Aqui a ordem é invertida:
 * checa nível (e saldo) primeiro, só debita se vai mesmo entregar o item.
 *
 * ALCANÇÁVEL: NÃO no cliente 4.1 — dispatch comentado em `SocketManager.as:1032-1035`
 * (`/*if(_loc2_==GrowthPackageType.GROWTHPACKAGE)...*\/`), sem pasta `growthPackage` nem `growthpackage.swf`
 * em `vendor/DDTank41` ou em `apps/api/assets/flash` (dead code também do lado do cliente). SIM no cliente
 * 6600 (`?client=6600` no site, `apps/web/src/pages/Play.tsx`): `GrowthPackageManager.instance.setup()`
 * roda no boot (`ddt/DDT.as:354`) e o clique no ícone despacha pra valer
 * (`hallIcon/view/HallRightIconView.as:593-594`); `growthpackage.swf`/`growthPackage.xml` são servidos
 * automaticamente pelo fallback genérico `/flash6600/*` → `vendor/DDT-6600/.../ui/turkey/`
 * (`apps/api/src/routes/static.ts`, sem overlay próprio ainda — texto turco original; remaster/PT-BR fica
 * pro `m5-growthpackage` listado em `docs/plan/TASKS.md`). O ícone só aparece quando `IsPromotePackageOpen`
 * está ligado — `sendGrowthPackageLoginState` abaixo, chamado do login (`GamePlayer.cs:3635-3639`).
 *
 * LIMITAÇÃO CONHECIDA (cliente não pode ser alterado nesta tarefa — só servidor): o cliente 6600
 * (`GrowthPackageManager.as:173-192`) mostra o alerta de preço comparando `Self.Money` (cupom) contra
 * `ServerConfigManager.growthPackagePrice` ANTES de mandar o pacote de compra; como aqui o preço vale em
 * Gold, se o admin configurar `PromotePackagePrice`>0 um jogador com 0 de Money (todo mundo, server sem
 * pay-to-win) cai na tela de recarga sem nunca mandar o pacote, mesmo tendo Gold de sobra. Com o default
 * (preço 0) isso nunca acontece (`0 < 0` é falso, sempre manda o pacote). Corrigir de verdade exige
 * remendar o AS3 do `growthpackage.swf` (fora do escopo deste agente — cliente/arte); listado como
 * `m5-growthpackage` em `docs/plan/TASKS.md`. Documentado também em `docs/features/passe-classico.md`.
 *
 * Pacotes: 84 ACTIVITY_PACKAGE sub-cmd 1 (`eventos/index.ts` lê o 1º int e despacha pra aqui), sub-sub-cmd
 *   1 OPEN / 2 UPDATEDATA (client→server — mesmos 2 ints nos dois; UPDATEDATA ainda manda um `$index` que
 *   o servidor ignora, sempre usa o `AvailTime` dele mesmo, nunca o índice do cliente).
 * C#: `ActivityPackageHandler.cs` case 1 (6600), `ActiveMgr.GetGrowthPackage`,
 *   `GameProperties.PromotePackagePrice`/`IsPromotePackageOpen`, `AbstractPacketLib.cs:2353-2403` (senders).
 * Como testar: `apps/game/test/client-6600-m4-passe-classico.test.ts`. Manual: `docs/features/passe-classico.md`.
 */
import { eq } from "drizzle-orm";
import type { GSPacket } from "@ddt/protocol";
import { player as P } from "@ddt/db";
import { ItemInfo } from "../../game/item.js";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import { mailItems } from "../bolsa/correio-excedente.js";
import { bagLocked } from "../forja/bancada.js";
import * as Out from "../../packets/out.js";

/** `ActivityPackageHandler()` ctor `int_0` (6600) / `m_gradeList` (4.1, comentado) — Grade necessário por
 *  tier, índice 0-8 (9 marcos). Mesmos 9 números do `GrowthPackageModel._gradeList` no AS3. */
export const GROWTH_LEVEL_NEED = [10, 20, 30, 40, 45, 50, 55, 60, 65] as const;
export const GROWTH_TIER_COUNT = GROWTH_LEVEL_NEED.length;

/** `ActivityPackageHandler.method_0(grade, availTime)` (6600): `int_0[availTime] <= grade`. */
function meetsLevel(grade: number, tier: number): boolean {
  const need = GROWTH_LEVEL_NEED[tier];
  return need !== undefined && grade >= need;
}

async function loadAvailTime(ctx: ServerContext, p: GamePlayer): Promise<{ id: number | null; availTime: number }> {
  const [row] = await ctx.db.db
    .select({ ID: P.Sys_Active_System_Data.ID, AvailTime: P.Sys_Active_System_Data.AvailTime })
    .from(P.Sys_Active_System_Data)
    .where(eq(P.Sys_Active_System_Data.UserID, p.id))
    .limit(1);
  if (!row) return { id: null, availTime: 0 };
  return { id: row.ID, availTime: row.AvailTime };
}
async function saveAvailTime(ctx: ServerContext, p: GamePlayer, id: number | null, availTime: number): Promise<void> {
  if (id != null) await ctx.db.db.update(P.Sys_Active_System_Data).set({ AvailTime: availTime }).where(eq(P.Sys_Active_System_Data.ID, id));
  else await ctx.db.db.insert(P.Sys_Active_System_Data).values({ UserID: p.id, AvailTime: availTime });
}

/** `GameProperties.IsPromotePackageOpen` (`GameProperties.cs:240`, default `false`) — admin gate, same
 *  `Server_Config` key as the original. */
export function growthPackageIsOpen(ctx: ServerContext): boolean {
  return ctx.templates.cfgInt("IsPromotePackageOpen", 0) !== 0;
}

/** `GameProperties.PromotePackagePrice` (`GameProperties.cs:238`), now in GOLD — default 0 (free-by-level,
 *  never real money by default; see header "DECISÃO DE DESIGN"). Negative config values are clamped to 0. */
function growthPackagePrice(ctx: ServerContext): number {
  return Math.max(0, ctx.templates.cfgInt("PromotePackagePrice", 0));
}

/** `GamePlayer.Login` (`GamePlayer.cs:3635-3639`): pushed once at login, only when the feature is open —
 *  gates the hall icon client-side. Called from `session/login.ts`. */
export async function sendGrowthPackageLoginState(ctx: ServerContext, p: GamePlayer): Promise<void> {
  if (!growthPackageIsOpen(ctx)) return;
  const { availTime } = await loadAvailTime(ctx, p);
  p.send(Out.growthPackageIsOpen(true));
  p.send(Out.growthPackageState("open", availTime));
}

/** Builds and mails the reward for one tier (sex-filtered like `ItemMgr.FindItemTemplate`/`NeedSex` in the
 *  original — `game/player.ts:239` has the same `NeedSex` check pattern). Returns false when nothing could
 *  be sent (empty/unseeded tier, or every row filtered out by sex) — mirrors the original's `Msg2`. */
async function mailGrowthTier(ctx: ServerContext, p: GamePlayer, tier: number): Promise<boolean> {
  const rows = ctx.templates.growthPackage(tier);
  const now = ctx.now();
  const items: ItemInfo[] = [];
  for (const row of rows) {
    const t = ctx.templates.findItem(row.TemplateID);
    if (!t) continue;
    if (t.NeedSex !== 0 && t.NeedSex !== (p.info.Sex ? 1 : 2)) continue;
    const it = ItemInfo.createFromTemplate(t, row.Count, 102, now);
    it.IsBinds = row.IsBind;
    it.ValidDate = row.ValidDate;
    it.StrengthenLevel = row.StrengthLevel;
    it.AttackCompose = row.AttackCompose;
    it.DefendCompose = row.DefendCompose;
    it.AgilityCompose = row.AgilityCompose;
    it.LuckCompose = row.LuckCompose;
    items.push(it);
  }
  if (!items.length) return false;
  const level = GROWTH_LEVEL_NEED[tier] ?? 0;
  const fallbackTitle = `Presente de crescimento (nível ${level})`;
  const title = ctx.lang.t("ActivityPackageHandler.GrowthPackage.Title", level);
  await mailItems(ctx, p, items, title === "ActivityPackageHandler.GrowthPackage.Title" ? fallbackTitle : title);
  return true;
}

/**
 * Packet 84 sub-cmd 1 (`GrowthPackageType.GROWTHPACKAGE`) — caller (`eventos/index.ts`) already consumed
 * the family-selector int. Mirrors `ActivityPackageHandler.cs` case 1 (6600) order of checks: bag lock,
 * then the 500ms throttle (both BEFORE reading the sub-sub-cmd, exactly like the original), then the
 * sub-sub-cmd itself.
 */
export async function growthPackageHandler(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  if (!growthPackageIsOpen(ctx)) return;
  if (bagLocked(ctx, p)) return;

  const now = ctx.now();
  if (now.getTime() - p.lastGrowthPackageClaim < 500) {
    const { availTime } = await loadAvailTime(ctx, p);
    p.send(Out.growthPackageState("update", availTime));
    return;
  }

  const kind = pkt.readInt(); // GROWTHPACKAGE_OPEN=1 (pays) / GROWTHPACKAGE_UPDATEDATA=2 (free claim)
  if (kind === 2) pkt.readInt(); // client's own tier `$index` (`sendGrowthPackageGetItems`) — ignored
  if (kind !== 1 && kind !== 2) return;
  p.lastGrowthPackageClaim = now.getTime();

  const t = (k: string, fb: string, ...args: unknown[]) => { const v = ctx.lang.t(k, ...args); return v === k ? fb : v; };
  const { id, availTime: tier } = await loadAvailTime(ctx, p);

  if (tier >= GROWTH_TIER_COUNT || !meetsLevel(p.info.Grade, tier)) {
    p.sendMessage(0, t("ActivityPackageHandler.Msg1", "Nenhuma recompensa disponível no seu nível ainda."));
    p.send(Out.growthPackageState("update", tier));
    return;
  }

  if (kind === 1) { // only ever the first claim from a real client (model.isBuy<1 gate on the AS3 side)
    const price = growthPackagePrice(ctx);
    if (price > 0) {
      if (p.info.Gold < price) { // original: MoneyDirect fails -> falls to the shared bottom (Msg2 + resend state)
        p.sendMessage(0, t("ActivityPackageHandler.Msg2", "Nenhuma recompensa disponível."));
        p.send(Out.growthPackageState("update", tier));
        return;
      }
      p.removeGold(price);
    }
  }

  const sent = await mailGrowthTier(ctx, p, tier);
  const nextTier = sent ? tier + 1 : tier;
  if (sent) await saveAvailTime(ctx, p, id, nextTier);
  p.send(Out.growthPackageState("update", nextTier));
  p.sendMessage(0, sent
    ? t("ActivityPackageHandler.Success", "Recompensa enviada! Confira seu correio.")
    : t("ActivityPackageHandler.Msg2", "Nenhuma recompensa disponível."));
}
