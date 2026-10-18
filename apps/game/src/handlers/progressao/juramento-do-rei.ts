/**
 * Aba no jogo: ícone "Juramento do Rei" (`kingbless.swf`, `src/kingBless/`) + a "escritura"/Deed
 * (`ddt/view/common/DeedIcon.as`, `src/ddtDeed/`) — presenteia (ou renova pra si mesmo) um buff temporário
 * de "Bênção do Rei" (3 níveis, 30/90/180 dias) ou abre/renova a Escritura (7 dias, nível fixo).
 * M3 `m3-king-bless-deed` (docs/plan/TASKS.md). Hoje só existia o stub fechado (`Out.kingBlessClosed()`, M1
 * Round 2) — esta é a feature de verdade.
 *
 * Pacotes (`ddt/manager/GameSocketOut.as`, 6600 only):
 *   142 KING_BLESS_MAIN — `sendOpenKingBless(type, playerId, msg, isBand)` (type 1-3, `KingBlessMainFrame.as:
 *     257/268`, `playerId` = o próprio ID quando sem amigo selecionado, ou o ID de um amigo escolhido no
 *     "presentear") E `sendOpenDeed(10, playerId, msg, false)` (type FIXO 10, `DeedIcon.as:101` — sempre o
 *     próprio ID, a Escritura não tem presente-pra-amigo na UI real). `msg`/`isBand` são lidos e descartados
 *     pelo `.cs` original (`KingBlessHandler.cs:16-17`) — mantido igual aqui.
 *   143 KING_BLESS_USE_ITEM — `sendUseItemKingBless(place, bagType)` (`BagView.as:2669`, item CategoryID==11
 *     Property1==39 usado direto da bolsa). `sendUseItemDeed(place, bagType)` (`BagView.as:2673`) está num
 *     `else if` cuja condição (`Property1==39 && Property2==10`) é um SUBCONJUNTO do `else if` anterior
 *     (`Property1==39`) no MESMO encadeamento — morto por construção no cliente real (confirmado,
 *     `BagView.as:2667-2674`): o ramo 1 sempre captura primeiro, o ramo 2 nunca executa. Então 143 só
 *     implementa o caminho King Bless; Deed via item nunca é alcançável, não implementado.
 *
 * C#: `KingBlessHandler.cs` (142, cobre OS DOIS — `type===10` é a Escritura, resto é Bênção do Rei, mesmo
 * código de pacote). Preço: `GameProperties.DanDanBuffPrice` (Escritura) / `GameProperties.KingBuffPrice`
 * "475,1425,2500" (Bênção, por nível) — ambos lidos de `Server_Config` (`cfgInt`/raw get, fallback = default
 * decompilado). 143 KING_BLESS_USE_ITEM não tem `[PacketHandler]` nenhum em NENHUM vendor (confirmado por
 * grep) — stub no original também; implementado aqui a partir do contrato do cliente (item consumido = o
 * próprio pagamento, sem cobrança extra), design Reborn (mesma categoria de "110 ITEM_REFINERY").
 *
 * Simplificações assumidas (documentadas):
 * - `AddExpVip`/`CreateSaveLifeBuff` do `.cs` (bônus de XP VIP e buff "não morre uma vez" ao ativar) não
 *   portados — bônus colateral, não o efeito principal da feature.
 * - O dicionário de efeitos por-atributo (`PlayerExtra.SetupKingBless`/`SetupDeed`: STRENGTH_ENCHANCE/
 *   PET_STAR/HORSE_LIGHT/...) nunca é consumido por `game/stats.ts` deste port (sem gancho de FightPower pra
 *   isso) — sempre 0 entradas nos pushes (`Out.kingBlessOrDeedMain`), mesma categoria de lacuna que outros
 *   efeitos de combate não portados (HANDLERS.md linha 91). O ícone do buff + contagem regressiva (o que a
 *   UI de verdade desenha) funcionam normalmente.
 * - Downgrade (presentear um nível MENOR que o já ativo) é recusado SEM cobrar (o `.cs` original cobra
 *   primeiro e reembolsa depois com `AddMoney` — mesmo resultado líquido, ordem mais simples e sem a janela
 *   onde um crash entre a cobrança e o reembolso perderia o dinheiro do jogador).
 *
 * Como testar: `apps/game/test/client-6600-m3-king-bless-deed.test.ts`.
 */
import { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import * as Out from "../../packets/out.js";
import { loadPlayerInfo } from "../../db/characters.js";
import { loadExtra, upsertExtra, type ExtraRow } from "../../db/juramento-do-rei.js";

const DAYS_BY_TIER = [30, 90, 180]; // KingBlessHandler.cs:41-51 (type 1/2/3)

function kingBlessPrices(ctx: ServerContext): number[] {
  const raw = ctx.templates.serverConfig.get("KingBuffPrice") ?? "475,1425,2500";
  const parts = raw.split(",").map((s) => Number(s.trim()));
  return parts.length === 3 && parts.every(Number.isFinite) ? parts : [475, 1425, 2500];
}

/** Money + MoneyLock >= v (GamePlayer.MoneyDirect's check — `removeMoney` already spends lock-first). */
function canAfford(p: GamePlayer, v: number): boolean {
  return p.info.Money + p.info.MoneyLock >= v;
}

interface Target { userId: number; nick: string; online: GamePlayer | null; extra: ExtraRow | null }

async function resolveTarget(ctx: ServerContext, p: GamePlayer, targetId: number): Promise<Target | null> {
  if (targetId === p.id) return { userId: p.id, nick: p.info.NickName ?? "", online: p, extra: p.extra ?? null };
  const online = ctx.world.get(targetId);
  if (online) return { userId: targetId, nick: online.info.NickName ?? "", online, extra: online.extra ?? null };
  const info = await loadPlayerInfo(ctx.db.db, targetId);
  if (!info) return null;
  const extra = await loadExtra(ctx.db.db, targetId);
  return { userId: targetId, nick: info.NickName ?? "", online: null, extra };
}

/** Grants/renews King's Blessing tier `type` (1-3) on `target`. `price` already charged by the caller (0 for
 *  the 143 item-use path). Returns the message to show the ACTOR (`p`). */
async function applyKingBless(ctx: ServerContext, p: GamePlayer, target: Target, type: number): Promise<string> {
  const now = ctx.now();
  const curIndex = target.extra?.KingBlessIndex ?? 0;
  const curEnd = target.extra?.KingBlessEnddate ?? now;
  const active = curIndex > 0 && curEnd > now;
  const days = DAYS_BY_TIER[type - 1] ?? 30;
  const newEnd = new Date((active ? curEnd : now).getTime() + days * 86_400_000);
  const newIndex = Math.max(curIndex, type);
  const newInfo = target.extra?.KingBlessInfo || "1";
  await upsertExtra(ctx.db.db, target.userId, { KingBlessIndex: newIndex, KingBlessEnddate: newEnd, KingBlessInfo: newInfo });
  if (target.online) {
    target.online.extra = { ...(target.online.extra as ExtraRow ?? ({} as ExtraRow)), UserID: target.userId, KingBlessIndex: newIndex, KingBlessEnddate: newEnd, KingBlessInfo: newInfo };
    target.online.send(Out.kingBlessOrDeedMain(142, target.online.id, newIndex, newEnd));
    if (target.online !== p) target.online.sendMessage(0, `${p.info.NickName} te enviou uma Bênção do Rei (nível ${type})!`);
  }
  return target.userId === p.id
    ? (active ? "Bênção do Rei renovada!" : "Bênção do Rei ativada!")
    : `Bênção do Rei enviada para ${target.nick}!`;
}

/** 142 type 10 (Escritura/Deed): KingBlessHandler.cs:18-36 — sempre o próprio jogador. */
async function applyDeed(ctx: ServerContext, p: GamePlayer): Promise<void> {
  const price = ctx.templates.cfgInt("DanDanBuffPrice", 3000);
  if (!canAfford(p, price)) return p.sendMessage(0, "Xu insuficiente para abrir a Escritura.");
  p.removeMoney(price);
  const now = ctx.now();
  const curEnd = p.extra?.DeedEnddate ?? now;
  const hadInfo = !!p.extra?.DeedInfo;
  const newEnd = new Date((curEnd > now ? curEnd : now).getTime() + 7 * 86_400_000);
  await upsertExtra(ctx.db.db, p.id, { DeedIndex: 10, DeedEnddate: newEnd, DeedInfo: "1" });
  p.extra = { ...(p.extra as ExtraRow ?? ({} as ExtraRow)), UserID: p.id, DeedIndex: 10, DeedEnddate: newEnd, DeedInfo: "1" };
  p.sendMessage(0, hadInfo ? "Escritura renovada!" : "Escritura aberta!");
  p.send(Out.kingBlessOrDeedMain(2272, p.id, 10, newEnd));
}

/** 142 KING_BLESS_MAIN: byte type, int playerId, String msg (lido e descartado), bool (lido e descartado). */
export async function kingBlessMain(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  const type = pkt.readByte();
  const playerId = pkt.readInt();
  pkt.readString(); // msg — lido e descartado, igual ao .cs original (KingBlessHandler.cs:16)
  pkt.readBoolean(); // isBand — lido e descartado, igual ao .cs original (KingBlessHandler.cs:17)

  if (type === 10) return applyDeed(ctx, p);
  if (type < 1 || type > 3) return;

  const target = await resolveTarget(ctx, p, playerId);
  if (!target) return p.sendMessage(0, "Jogador não encontrado.");
  const price = kingBlessPrices(ctx)[type - 1] ?? 475;
  const curIndex = target.extra?.KingBlessIndex ?? 0;
  const curEnd = target.extra?.KingBlessEnddate ?? ctx.now();
  if (curIndex > 0 && curEnd > ctx.now() && type < curIndex) return p.sendMessage(0, "Esse jogador já tem uma Bênção do Rei de nível maior ativa.");
  if (!canAfford(p, price)) return p.sendMessage(0, "Xu insuficiente para a Bênção do Rei.");
  p.removeMoney(price);
  const msg = await applyKingBless(ctx, p, target, type);
  p.sendMessage(0, msg);
  p.send(Out.kingBlessOrDeedMain(142, p.id, p.extra?.KingBlessIndex ?? 0, p.extra?.KingBlessEnddate ?? ctx.now()));
}

/**
 * 143 KING_BLESS_USE_ITEM: int place, int bagType — item CategoryID==11 Property1==39 usado direto da bolsa
 * (`BagView.as:2667-2669`). Sem handler C# em nenhum vendor (stub no original); design Reborn: o item É o
 * pagamento (sem cobrança de Xu), `Property2` escolhe o nível (1-3, padrão 1 se fora da faixa).
 */
export async function kingBlessUseItem(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  const place = pkt.readInt();
  const bagType = pkt.readInt();
  const inv = p.getInventory(bagType);
  const it = inv?.getItemAt(place);
  if (!it || it.template.CategoryID !== 11 || it.template.Property1 !== 39) return;
  const type = Math.min(3, Math.max(1, it.template.Property2 || 1));
  const target: Target = { userId: p.id, nick: p.info.NickName ?? "", online: p, extra: p.extra ?? null };
  inv!.removeCountFromStack(it, 1);
  const msg = await applyKingBless(ctx, p, target, type);
  p.sendMessage(0, msg);
}
