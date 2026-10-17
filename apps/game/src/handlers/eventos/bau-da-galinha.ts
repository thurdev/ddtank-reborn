/**
 * Aba no jogo: ícone do hall "Baú do Rei Galo" (newChickenBox) — board de 18 cartas, abre carta por Cupons
 * (TAKEOVERCARD) ou revela com Olho de Águia (USEEAGLEEYE), atualiza o board (FLUSHCHICKENVIEW, grátis
 * dentro da janela de 120min). Também é quem despacha pro arquivo-irmão `estrela-da-sorte.ts` (mesmo pacote
 * 87, cmds diferentes) porque o cliente manda os dois sub-sistemas no mesmo `ePackageType.NEWCHICKENBOX_SYS`.
 * Pool de recompensa não migrada do .bak (Items_Box's EventAwardItem nunca foi populada) — configurável via
 * `app."ScheduledEvents"` kind "chickenbox" (admin Events page), com default embutido.
 * Pacotes: 87 NEWCHICKENBOX_SYS (cmds 10 ENTERCHICKENVIEW, 11 USEEAGLEEYE, 12 AllITEMSHOW, 13 TAKEOVERCARD,
 *   14 FLUSHCHICKENVIEW, 15 CLICKSTARTBNT).
 * C#: `ChickenBoxHandler.cs`.
 * Como testar: `apps/game/test/activities.test.ts` (`drawDistinct`). Manual: `docs/features/eventos.md`.
 */
import { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import { grantRewards } from "../../game/events.js";
import * as Out from "../../packets/out.js";
import { mailItems } from "../bolsa/correio-excedente.js";
import { arr, isOpen, num, pool, type PoolItem } from "./agendador.js";
import { luckyStarCmd } from "./estrela-da-sorte.js";

// ------------------------------------------------------------------ modelo de carta (compartilhado com a Estrela da Sorte)
export interface Card { templateId: number; count: number; strengthenLevel: number; validDate: number; atk: number; def: number; agi: number; luck: number; position: number; isSelected: boolean; isSeeded: boolean; isBind: boolean; weight: number }

function card(it: PoolItem, position: number): Card {
  return { templateId: it.templateId, count: it.count, strengthenLevel: 0, validDate: it.validDate ?? 0, atk: 0, def: 0, agi: 0, luck: 0, position, isSelected: false, isSeeded: false, isBind: it.isBind ?? true, weight: it.weight ?? 1000 };
}

/** Sorteia `count` cartas distintas (por templateId) do pool, sem reposição enquanto houver templates não usados. */
export function drawDistinct(rows: PoolItem[], count: number): Card[] {
  const out: Card[] = [];
  const used = new Set<number>();
  let guard = 0;
  while (out.length < count && guard++ < count * 50) {
    const r = rows[Math.floor(Math.random() * rows.length)];
    if (!r || used.has(r.templateId)) { if (used.size >= rows.length) break; continue; }
    used.add(r.templateId);
    out.push(card(r, out.length));
  }
  return out;
}

// ------------------------------------------------------------------ board (18 cartas)
const DEFAULT_CHICKENBOX_POOL: PoolItem[] = [
  { templateId: 11107, count: 500 }, { templateId: 11107, count: 1000 }, { templateId: 11456, count: 5 },
  { templateId: 11408, count: 10 }, { templateId: 112059, count: 1 }, { templateId: 11023, count: 3 },
  { templateId: 11020, count: 3 }, { templateId: 11018, count: 2 }, { templateId: 11444, count: 3 },
];

interface ChickenState { rewards: Card[]; lastFlushTime: Date; isShowAll: boolean; canOpenCounts: number; canEagleEyeCounts: number }
const chickenOf = new WeakMap<GamePlayer, ChickenState>();

function flushChickenBox(ctx: ServerContext, p: GamePlayer): ChickenState {
  const rows = pool(ctx, "chickenbox", DEFAULT_CHICKENBOX_POOL);
  const s: ChickenState = { rewards: drawDistinct(rows, 18), lastFlushTime: ctx.now(), isShowAll: true, canOpenCounts: 5, canEagleEyeCounts: 5 };
  chickenOf.set(p, s);
  return s;
}
function chickenState(ctx: ServerContext, p: GamePlayer): ChickenState {
  return chickenOf.get(p) ?? flushChickenBox(ctx, p);
}
const FREE_FLUSH_MIN = 120;
function isFreeFlushTime(s: ChickenState, now: Date): boolean {
  return now.getTime() - s.lastFlushTime.getTime() < FREE_FLUSH_MIN * 60_000;
}

function chickenListPkt(ctx: ServerContext, s: ChickenState): GSPacket {
  const p = new GSPacket(87);
  p.writeInt(3); Out.wd(p, s.lastFlushTime); p.writeInt(FREE_FLUSH_MIN); p.writeInt(0); p.writeInt(0); p.writeInt(0);
  p.writeBoolean(s.isShowAll); p.writeInt(s.rewards.length);
  for (const c of s.rewards) { p.writeInt(c.templateId); p.writeInt(c.strengthenLevel); p.writeInt(c.count); p.writeInt(c.validDate); p.writeInt(c.atk); p.writeInt(c.def); p.writeInt(c.agi); p.writeInt(c.luck); p.writeInt(c.position); p.writeBoolean(c.isSelected); p.writeBoolean(c.isSeeded); p.writeBoolean(c.isBind); }
  return p;
}

function chickenBoxCmd(ctx: ServerContext, p: GamePlayer, pkt: GSPacket, cmd: number): void {
  const openPrice = arr(ctx, "chickenbox", "openCardPrice", [100, 200, 300, 500, 800]);
  const eyePrice = arr(ctx, "chickenbox", "eagleEyePrice", [50, 100, 150, 250, 400]);
  switch (cmd) {
    case 13: { // TAKEOVERCARD
      const pos = pkt.readInt();
      const s = chickenState(ctx, p);
      if (s.canOpenCounts <= 0) return p.sendMessage(0, "Você usou todas as aberturas de cartas.");
      const c = s.rewards.find((x) => x.position === pos && !x.isSelected);
      if (!c) return p.sendMessage(0, "Carta não encontrada.");
      const price = openPrice[Math.min(s.canOpenCounts, openPrice.length) - 1] ?? openPrice[openPrice.length - 1]!;
      if (p.info.Money < price) return p.sendMessage(0, "Cupons insuficientes.");
      p.removeMoney(price);
      c.isSelected = true; c.isBind = true;
      const out = new GSPacket(87);
      out.writeInt(13); out.writeInt(c.templateId); out.writeInt(c.strengthenLevel); out.writeInt(c.count); out.writeInt(c.validDate);
      out.writeInt(c.atk); out.writeInt(c.def); out.writeInt(c.agi); out.writeInt(c.luck); out.writeInt(c.position);
      out.writeBoolean(c.isSelected); out.writeBoolean(c.isSeeded); out.writeBoolean(c.isBind); out.writeInt(0);
      p.send(out);
      const tpl = ctx.templates.findItem(c.templateId);
      if (tpl) { const g = grantRewards(p, [{ templateId: c.templateId, count: c.count, isBind: true }], ctx.templates.findItem, ctx.now()); if (g.overflow.length) void mailItems(ctx, p, g.overflow, "Carta", 8); p.sendMessage(0, `Você recebeu ${tpl.Name ?? c.templateId} x${c.count}.`); }
      s.canOpenCounts--;
      if (s.canOpenCounts === 0) { const sp = new GSPacket(87); sp.writeInt(12); p.send(sp); }
      return;
    }
    case 11: { // USEEAGLEEYE
      const pos = pkt.readInt();
      const s = chickenState(ctx, p);
      if (s.canEagleEyeCounts <= 0) return p.sendMessage(0, "Você usou todas as revelações de cartas.");
      const c = s.rewards.find((x) => x.position === pos && !x.isSeeded);
      if (!c) return p.sendMessage(0, "Carta não encontrada.");
      const price = eyePrice[Math.min(s.canEagleEyeCounts, eyePrice.length) - 1] ?? eyePrice[eyePrice.length - 1]!;
      if (p.info.Money < price) return p.sendMessage(0, "Cupons insuficientes.");
      p.removeMoney(price);
      c.isSeeded = true;
      const out = new GSPacket(87);
      out.writeInt(11); out.writeInt(c.templateId); out.writeInt(c.strengthenLevel); out.writeInt(c.count); out.writeInt(c.validDate);
      out.writeInt(c.atk); out.writeInt(c.def); out.writeInt(c.agi); out.writeInt(c.luck); out.writeInt(c.position);
      out.writeBoolean(c.isSelected); out.writeBoolean(c.isSeeded); out.writeBoolean(c.isBind); out.writeInt(0);
      p.send(out);
      s.canEagleEyeCounts--;
      return;
    }
    case 14: { // FLUSHCHICKENVIEW
      const s = chickenState(ctx, p);
      const free = isFreeFlushTime(s, ctx.now());
      const price = num(ctx, "chickenbox", "flushPrice", 500);
      if (!free) { if (p.info.Money < price) return p.sendMessage(0, "Cupons insuficientes."); p.removeMoney(price); }
      flushChickenBox(ctx, p);
      p.send(chickenListPkt(ctx, chickenOf.get(p)!));
      return p.sendMessage(0, free ? "Atualização grátis." : "Atualizado com sucesso.");
    }
    case 12: // AllITEMSHOW
      return p.send(chickenListPkt(ctx, chickenState(ctx, p)));
    case 15: { // CLICKSTARTBNT
      const s = chickenState(ctx, p);
      s.isShowAll = false;
      for (let i = s.rewards.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const a = s.rewards[i]!.position; s.rewards[i]!.position = s.rewards[j]!.position; s.rewards[j]!.position = a; }
      const out = new GSPacket(87);
      out.writeInt(5); out.writeBoolean(true);
      return p.send(out);
    }
    case 10: // ENTERCHICKENVIEW
      return p.send(chickenListPkt(ctx, chickenState(ctx, p)));
  }
}

/** Ponto de entrada do pacote 87: lê o cmd uma vez e despacha pro baú da galinha (10-15) ou pra estrela da
 *  sorte (31-34), cada um com seu próprio portão `isOpen` — exatamente como o `ChickenBoxHandler.cs` original. */
export function newChickenBoxDispatch(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): void {
  const cmd = pkt.readInt();
  if ([10, 11, 12, 13, 14, 15].includes(cmd)) {
    if (!isOpen(ctx, "chickenbox")) return p.sendMessage(0, "O Baú do Rei Galo está fechado.");
    return chickenBoxCmd(ctx, p, pkt, cmd);
  }
  if ([31, 32, 33, 34].includes(cmd)) {
    if (!isOpen(ctx, "luckystar")) return p.sendMessage(0, "A Estrela da Sorte está fechada.");
    return luckyStarCmd(ctx, p, pkt, cmd);
  }
}
