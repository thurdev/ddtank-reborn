/**
 * Aba no jogo: sala de sorteio de cartas (tarot da riqueza) / loteria da sorte (tarot da sorte) / cartão
 * platina de novato — telas que o cliente fixo tem prontas (`lottery/**`, `ddt/view/NovicePlatinumCard.as`)
 * mas nenhum dos dois servidores de referência nunca implementou.
 * Pacotes: 239 GOTO_CARD_LOTTERY, 104 CARD_LOTTERY, 105 LUCK_LOTTERY, 11 ACTIVE_PULLDOWN.
 * C#: nenhum — conferido em `vendor/DDTank41/Game.Server` e `vendor/DDT-6600` (grep por `PacketHandler` no
 * projeto inteiro, incl. os nomes do enum `ePackageType`): nenhum dos dois servidores tem handler registrado
 * pra esses 4 códigos — só existem do lado do cliente (`ddt/manager/GameSocketOut.as:649-654,2031-2054`
 * escreve; `ddt/manager/SocketManager.as:637-680` lê a resposta; `lottery/LotteryContorller`,
 * `ddt/view/NovicePlatinumCard` mostram as telas). Busca externa em outros forks (`research/qa/
 * feature-sources.md`) confirmou 0 resultados pros 4 — é lacuna do jogo original, não da migração.
 *
 * Design novo (regra própria, sem fonte C#; detalhe completo em `research/qa/feature-designs.md`):
 * - 239 GOTO_CARD_LOTTERY: exige nível 3 (`tank.lottery.levelNotEnough`); responde `canCardLottery` com o
 *   custo fixo de giro (`LotteryModel.cardLotteryMoney` do cliente = 200 Money, `lottery.cardCost` admin).
 * - 104 CARD_LOTTERY: jogador escolhe 1-24 cartas (nomes `tank.lottery.cradName1..24`) numa aposta; cobra
 *   `lottery.cardCost` Money por giro, até `lottery.cardDailyLimit` (3) giros/dia; sorteia 1 carta vencedora
 *   ponderada (`lottery.cardPool`, admin); se a carta sorteada está entre as escolhidas, premia (mala, como
 *   o texto `cardLottery.wagerSuccess` já pede — "fique atento no aviso") e avisa por mensagem + correio.
 * - 105 LUCK_LOTTERY: 1 giro grátis/dia (`claimOnce` por dia); `lottery.luckChance`% de chance de ganhar um
 *   item pequeno do pool (`lottery.luckPool`), senão mensagem de "sem sorte hoje" (`luckyLottery.btnTip`).
 * - 11 ACTIVE_PULLDOWN: "cartão platina de novato" — resgate único (por personagem) do kit de boas-vindas,
 *   liberado só pra nível ≤ `lottery.noviceMaxLevel` (10); o texto digitado é só confirmação (o cliente nunca
 *   valida o conteúdo — `NovicePlatinumCard.__activeGetBtnClick` manda `_textInput.text` sem checar nada
 *   além de não-vazio), igual ao original.
 * Como testar: `apps/game/test/progression.test.ts`.
 */
import type { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import type { HandlerRegistry } from "../registry.js";
import * as Out from "../../packets/out.js";
import { claimOnce, dayKey, grantRewards, type Reward } from "../../game/events.js";
import { mailItems } from "../bolsa/correio-excedente.js";
import { num, pool, type PoolItem } from "../eventos/agendador.js";

const CARD_NAMES = 24;
const DEFAULT_CARD_POOL: PoolItem[] = [
  { templateId: 11107, count: 1000, weight: 10 }, { templateId: -200, count: 5000, weight: 10 },
  { templateId: 11456, count: 5, weight: 5 }, { templateId: 11408, count: 10, weight: 5 },
];
const DEFAULT_LUCK_POOL: PoolItem[] = [
  { templateId: 11107, count: 200, weight: 10 }, { templateId: 11456, count: 2, weight: 5 }, { templateId: 11408, count: 3, weight: 5 },
];
const DEFAULT_NOVICE_KIT: PoolItem[] = [{ templateId: -200, count: 5000 }, { templateId: -100, count: 50 }, { templateId: 11107, count: 500 }];

function pick<T extends { weight?: number }>(rows: T[], rnd: () => number): T | null {
  if (!rows.length) return null;
  const total = rows.reduce((s, r) => s + (r.weight ?? 1), 0);
  let roll = rnd() * total;
  for (const r of rows) { roll -= r.weight ?? 1; if (roll <= 0) return r; }
  return rows[rows.length - 1]!;
}

function toReward(i: PoolItem): Reward {
  return { templateId: i.templateId, count: i.count, validDate: i.validDate ?? 0, isBind: i.isBind ?? true };
}

async function grantAndMail(ctx: ServerContext, p: GamePlayer, rewards: Reward[], title: string): Promise<string[]> {
  const g = grantRewards(p, rewards, ctx.templates.findItem, ctx.now());
  if (g.overflow.length) await mailItems(ctx, p, g.overflow, title);
  return g.summary;
}

export function registerLoterias(r: HandlerRegistry): void {
  // 239 GOTO_CARD_LOTTERY: nível mínimo + custo do giro (sem gastar nada ainda).
  r.player(239, "GOTO_CARD_LOTTERY", (ctx, p) => {
    const minLevel = num(ctx, "lottery", "cardMinLevel", 3);
    const cost = num(ctx, "lottery", "cardCost", 200);
    if (p.info.Grade < minLevel) { p.send(Out.canCardLottery(p.id, false, cost)); return p.sendMessage(0, ctx.lang.t("tank.lottery.levelNotEnough")); }
    p.send(Out.canCardLottery(p.id, true, cost));
  });

  // 104 CARD_LOTTERY: aposta em 1-24 cartas, até N giros/dia, sorteia 1 carta vencedora ponderada.
  r.player(104, "CARD_LOTTERY", async (ctx, p: GamePlayer, pkt: GSPacket) => {
    const n = pkt.readInt();
    const picks: number[] = [];
    for (let i = 0; i < n; i++) picks.push(pkt.readInt());
    const minLevel = num(ctx, "lottery", "cardMinLevel", 3);
    if (p.info.Grade < minLevel) return p.sendMessage(0, ctx.lang.t("tank.lottery.levelNotEnough"));
    if (!picks.length || picks.some((c) => c < 1 || c > CARD_NAMES)) return p.sendMessage(0, "Escolha pelo menos 1 carta válida.");
    const cost = num(ctx, "lottery", "cardCost", 200);
    const dailyLimit = num(ctx, "lottery", "cardDailyLimit", 3);
    const day = dayKey(ctx.now());
    let slot = -1;
    for (let i = 1; i <= dailyLimit; i++) if (await claimOnce(ctx.db.db, p.id, "lottery-card", `${day}:${i}`)) { slot = i; break; }
    if (slot === -1) return p.sendMessage(0, "Você já usou todos os giros de hoje na loteria de cartas.");
    if (p.info.Money + p.info.MoneyLock < cost) return p.sendMessage(0, "Moedas insuficientes.");
    p.removeMoney(cost);
    const winner = 1 + Math.floor(Math.random() * CARD_NAMES);
    p.sendMessage(0, ctx.lang.t("tank.lottery.cardLottery.wagerSuccess"));
    if (picks.includes(winner)) {
      const rows = pool(ctx, "lottery", DEFAULT_CARD_POOL);
      const won = pick(rows, Math.random);
      if (won) {
        const summary = await grantAndMail(ctx, p, [toReward(won)], "Prêmio da Loteria de Cartas");
        p.sendMessage(0, `O tarot da riqueza sorteou a carta ${winner} — você acertou! Prêmio: ${summary.join(", ")}.`);
      }
    } else {
      p.sendMessage(0, `O tarot da riqueza sorteou a carta ${winner} — não foi dessa vez.`);
    }
  });

  // 105 LUCK_LOTTERY: 1 giro grátis/dia, chance configurável de ganhar um item pequeno.
  r.player(105, "LUCK_LOTTERY", async (ctx, p: GamePlayer) => {
    const day = dayKey(ctx.now());
    if (!(await claimOnce(ctx.db.db, p.id, "lottery-luck", day))) {
      return p.send(Out.luckLotteryAward(p.id, 3, { messageTip: "Você já consultou a sorte hoje. Volte amanhã!" }));
    }
    const chance = num(ctx, "lottery", "luckChance", 30);
    if (Math.random() * 100 < chance) {
      const rows = pool(ctx, "lottery-luck", DEFAULT_LUCK_POOL);
      const won = pick(rows, Math.random);
      if (won) {
        await grantAndMail(ctx, p, [toReward(won)], "Prêmio da Loteria da Sorte");
        return p.send(Out.luckLotteryAward(p.id, 1, { templateId: won.templateId, timeLimit: won.validDate ?? 0 }));
      }
    }
    p.send(Out.luckLotteryAward(p.id, 3, { messageTip: "A bola de cristal não indicou sorte hoje. Volte amanhã!" }));
  });

  // 11 ACTIVE_PULLDOWN: resgate único do "cartão platina de novato" (kit de boas-vindas, nível baixo).
  r.player(11, "ACTIVE_PULLDOWN", async (ctx, p: GamePlayer, pkt: GSPacket) => {
    pkt.readInt(); // ActiveID (sempre o mesmo evento Type 10 no cliente — sem tabela pra validar contra)
    const code = pkt.readString();
    const maxLevel = num(ctx, "lottery", "noviceMaxLevel", 10);
    if (!code || !code.trim()) return p.send(Out.activePullDownResult(p.id, false));
    if (p.info.Grade > maxLevel) { p.sendMessage(0, "O cartão platina de novato só vale pra personagens novos."); return p.send(Out.activePullDownResult(p.id, false)); }
    if (!(await claimOnce(ctx.db.db, p.id, "novice-platinum-card", "1"))) { p.sendMessage(0, "Você já resgatou o cartão platina de novato."); return p.send(Out.activePullDownResult(p.id, false)); }
    const rows = pool(ctx, "lottery-novice", DEFAULT_NOVICE_KIT);
    const summary = await grantAndMail(ctx, p, rows.map(toReward), "Cartão Platina de Novato");
    p.sendMessage(0, `Cartão platina de novato resgatado! Você recebeu: ${summary.join(", ")}.`);
    p.send(Out.activePullDownResult(p.id, true));
  });
}
