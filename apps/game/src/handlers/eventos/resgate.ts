/**
 * Aba no jogo: "Resgate" (`rescue.swf`, `src/rescue/`) — 6 cenas fixas (sceneId 1-6), cada uma uma missão PvE
 * real; vencer ganha estrelas (0-3) que destravam 3 níveis de recompensa reclamáveis. m4-resgate
 * (`docs/plan/TASKS.md`, `docs/plan/MIGRACAO-6600.md §4`): nome bate exato com a referência DDClássico.
 *
 * Pacote: 277 RESCUE, sub-ações (`RescueType.as`/`RescueEvent.as`): 1 IS_OPEN (srv→clt), 2 ITEM_INFO, 3
 * CHALLENGE, 4 BUY_ITEM, 5 CLEAN_CD, 6 FIGHT_RESULT (srv→clt), 7 FRAME_INFO, 8 GET_PRIZE. **Sem nenhuma
 * implementação C# em qualquer vendor** — confirmado por grep completo (nenhum `PacketHandler(277`, nenhum
 * hit de `RESCUE`/`Rescue` fora do enum `ePackageType.RESCUE = 277`). Desenhado 100% a partir do contrato
 * AS3 (`rescue/RescueManager.as`, `rescue/views/RescueMainFrame.as`), mesma categoria do `m3-trusteeship`.
 *
 * Alcançável no cliente: sim — `RescueManager.show()` abre a tela (`Grade>=20` mínimo, `rescue.gradeLimit`),
 * mas o ÍCONE do hall (`HallIconType.RESCUE`) só aparece com `IS_OPEN=true`
 * (`RescueManager.createRescueBtn`) — no original esse flag NUNCA é enviado (sem sender nenhum no C#), então
 * o ícone nunca aparece em produção. `isOpen(ctx,"rescue")` (`agendador.ts`) é o substituto admin-configurável
 * pedido pela tarefa (toda janela M4 nova deve ser ligável via `app."ScheduledEvents"`).
 *
 * Server-authoritative progress / claim-once / charge-before-grant (pedido explícito da tarefa):
 * - CHALLENGE nunca aceita um resultado do cliente — inicia uma sala/luta PvE real (`RoomMgr.createRescueRoom`
 *   → `FightEngine.startPve`, mesmo motor de todo dungeon) e o score/estrela vêm do kill count real da luta
 *   (`onRescueGameOver`, ganchado em `onPlayerGameOver` no `server.ts`), nunca de um pacote do cliente.
 * - GET_PRIZE: cobra NADA (reclamar), só libera o item se `rewardStatus` daquele tier já estiver "unlocked"
 *   (1) — nunca "claimed" (2) de novo (claim-once, estado persistido na própria linha, sem pacote do
 *   cliente poder re-disparar). CLEAN_CD/BUY_ITEM cobram (`payPrice`) ANTES de aplicar qualquer efeito —
 *   se a cobrança falha (saldo insuficiente), nada muda.
 *
 * Migração: `packages/db/drizzle/0021_messy_warlock.sql` (`player."Sys_Users_Rescue"`, hand-added, sem
 * equivalente em nenhum vendor — ver `packages/db/src/schema/player.ts` e `game/rescue.ts`).
 */
import type { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import * as Out from "../../packets/out.js";
import { mailItems } from "../bolsa/correio-excedente.js";
import { grantRewards } from "../../game/events.js";
import { isOpen } from "./agendador.js";
import {
  SCENE_COUNT, buyPrice, cleanCdPrice, cooldownSec, getOrCreate, missionIdFor, payPrice, persist,
  rewardTiersFor, scoreAndStar, tierStatus, tierUnlocked, withTierStatus, type RescueSceneState,
} from "../../game/rescue.js";

/** sceneId de uma CHALLENGE em andamento, consumido por `onRescueGameOver` quando a luta termina. Não há
 *  limpeza explícita em `flee`/disconnect — uma entrada esquecida é sempre sobrescrita pela próxima
 *  CHALLENGE real antes de qualquer leitura, sem janela de uso incorreto (WeakMap libera por GC sozinho). */
const pendingScene = new WeakMap<GamePlayer, number>();

function remainSecondsOf(scene: RescueSceneState, now: number): number {
  return Math.max(0, Math.ceil((scene.nextChallengeAt - now) / 1000));
}

async function sendFrameInfo(ctx: ServerContext, p: GamePlayer): Promise<void> {
  const { scenes } = await getOrCreate(ctx, p);
  const now = Date.now();
  const views = [...scenes.values()].map((s) => ({ sceneId: s.sceneId, starCount: s.starCount, rewardStatus: s.rewardStatus, freeCount: s.freeCount, remainSecond: remainSecondsOf(s, now), cleanCDcount: s.cleanCDcount }));
  p.send(Out.rescueFrameInfo(views));
}

export async function resgate(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  const sub = pkt.readByte();

  if (sub === 7) return sendFrameInfo(ctx, p); // FRAME_INFO — sceneId no pacote é ignorado (o original manda o requestado, mas FRAME_INFO sempre volta com TODAS as cenas, `__updateView` lê um `len` e itera)
  if (sub === 2) { // ITEM_INFO
    const { row } = await getOrCreate(ctx, p);
    return p.send(Out.rescueItemInfo(row.Arrow, row.BloodPack, row.KingBless));
  }

  if (sub === 3) { // CHALLENGE
    if (p.info.Grade < 20) return p.sendMessage(0, "Nível mínimo 20 para o Resgate.");
    if (!isOpen(ctx, "rescue")) return p.sendMessage(0, "O Resgate está fechado.");
    const sceneId = pkt.readInt();
    if (sceneId < 1 || sceneId > SCENE_COUNT) return;
    const { row, scenes } = await getOrCreate(ctx, p);
    const scene = scenes.get(sceneId)!;
    const now = Date.now();
    if (scene.freeCount > 0) {
      scene.freeCount--;
    } else if (remainSecondsOf(scene, now) <= 0) {
      scene.nextChallengeAt = now + cooldownSec(ctx) * 1000;
    } else {
      return p.sendMessage(0, "Essa cena ainda está em cooldown.");
    }
    await persist(ctx, p, row, scenes);
    pendingScene.set(p, sceneId);
    ctx.rooms.createRescueRoom(p, missionIdFor(ctx, sceneId), () => pendingScene.delete(p));
    return;
  }

  if (sub === 5) { // CLEAN_CD
    const isBind = pkt.readBoolean();
    const sceneId = pkt.readInt();
    if (sceneId < 1 || sceneId > SCENE_COUNT) return;
    const { row, scenes } = await getOrCreate(ctx, p);
    const scene = scenes.get(sceneId)!;
    const price = cleanCdPrice(ctx, scene);
    if (!payPrice(p, price, isBind)) return p.sendMessage(0, "Xu insuficiente para limpar o tempo de espera.");
    scene.nextChallengeAt = 0;
    scene.cleanCDcount++;
    await persist(ctx, p, row, scenes);
    return p.send(Out.rescueCleanCdAck());
  }

  if (sub === 4) { // BUY_ITEM — type 0 arrow / 1 bloodPack / 2 kingBless
    const type = pkt.readInt();
    const count = pkt.readInt();
    const isBind = pkt.readBoolean();
    if (count <= 0 || type < 0 || type > 2) return;
    const price = buyPrice(ctx, type) * count;
    if (!payPrice(p, price, isBind)) return p.sendMessage(0, "Xu insuficiente.");
    const { row, scenes } = await getOrCreate(ctx, p);
    const updated = type === 0 ? { ...row, Arrow: row.Arrow + count } : type === 1 ? { ...row, BloodPack: row.BloodPack + count } : { ...row, KingBless: row.KingBless + count };
    await persist(ctx, p, updated, scenes);
    return p.send(Out.rescueBuyItemAck());
  }

  if (sub === 8) { // GET_PRIZE
    const sceneId = pkt.readInt();
    const index = pkt.readInt();
    if (sceneId < 1 || sceneId > SCENE_COUNT || index < 0 || index > 2) return p.send(Out.rescueGetPrizeResult(sceneId, index, false));
    const { row, scenes } = await getOrCreate(ctx, p);
    const scene = scenes.get(sceneId)!;
    if (!tierUnlocked(scene.starCount, index) || tierStatus(scene.rewardStatus, index) !== 1) return p.send(Out.rescueGetPrizeResult(sceneId, index, false));
    if (p.equipBag.findFirstEmptySlot() < 0 && p.propBag.findFirstEmptySlot() < 0) return p.sendMessage(0, "Bolsa cheia.");
    const reward = rewardTiersFor(ctx, sceneId)[index]!;
    scene.rewardStatus = withTierStatus(scene.rewardStatus, index, 2); // claim-once: marca ANTES de dar, nunca dá 2x mesmo se a persistência falhar depois numa corrida
    await persist(ctx, p, row, scenes);
    const g = grantRewards(p, [{ templateId: reward.templateId, count: reward.count, validDate: reward.validDate, isBind: reward.isBind }], ctx.templates.findItem, ctx.now());
    if (g.overflow.length) await mailItems(ctx, p, g.overflow, "Resgate", 8);
    return p.send(Out.rescueGetPrizeResult(sceneId, index, true));
  }
}

/**
 * `onPlayerGameOver` hook (server.ts, `g.roomType === RoomType.Rescue`): a luta real terminou — nunca um
 * resultado do cliente. Vitória bate `starCount` pro máximo já alcançado (nunca regride) e desbloqueia
 * (status 0→1) qualquer tier cujo limiar o novo `starCount` alcance; derrota não muda `starCount` (score
 * ainda é mandado pro FIGHT_RESULT, só não vale estrela — ver `scoreAndStar`).
 */
export async function onRescueGameOver(ctx: ServerContext, p: GamePlayer, g: { isWin: boolean; kills: number }): Promise<void> {
  const sceneId = pendingScene.get(p);
  if (sceneId === undefined) return;
  pendingScene.delete(p);
  const { row, scenes } = await getOrCreate(ctx, p);
  const scene = scenes.get(sceneId)!;
  const { score, star } = scoreAndStar(g.isWin, g.kills);
  if (g.isWin && star > scene.starCount) {
    scene.starCount = star;
    for (let tier = 0; tier < 3; tier++) if (tierUnlocked(scene.starCount, tier) && tierStatus(scene.rewardStatus, tier) === 0) scene.rewardStatus = withTierStatus(scene.rewardStatus, tier, 1);
  }
  await persist(ctx, p, row, scenes);
  p.send(Out.rescueFightResult(score, star, sceneId, g.isWin));
}
