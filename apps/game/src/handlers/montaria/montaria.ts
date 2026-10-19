/**
 * Aba no jogo: Montaria (`horse.swf`, 6600 only) — ownership/equip (sub 2/7), level-up/feed (sub 3),
 * skill-up (sub 5), skill equip/unequip (sub 6). Part 1 of `m4-montaria` (`docs/plan/TASKS.md`): the stat
 * bonus itself (level + "cherished" skins -> Magic/HP/Damage/Guard) lives in `game/stats.ts computeStats`,
 * wired in via `game/player.ts recalcStats`. Pure math/serialization: `game/montaria.ts`. Login burst (260/1
 * + 260/8 push, row auto-create): `session/login.ts`.
 *
 * Pacote: 260 HORSE (`HorsePackageType.cs`/`horse/HorseManager.as`). C# original: `Game.Server.Horse.Handle/
 * {ChangeHorse,UpHorse,UpSkill,TakeUpDownSkill,ActiveHorsePicCherish}.cs`, dispatched by
 * `HorseLogicProcessor.OnGameData` (reads the sub-byte, looks up an `[Attribute9(code)]` handler — only
 * 2/3/5/6/7 are registered; sub 1 GET_ALL_DATA and sub 8 HORSE_PICCHERISH_INFO are server->client only, no
 * client sender exists for either).
 *
 * Anti-P2W (`AGENTS.md`/`README.md`): the ONLY in-handler cost here is spending owned ITEMS (11164 "Pílula de
 * Melhoria de Estrela" / 11165 "Esfera de Melhoria de Habilidade") from `PropBag` — never a direct Money (or
 * any currency) charge, same shape the original uses. Both items have `CanDrop=true` in the real item
 * template (earnable via normal drops/missions, not gated behind a purchase) and are NOT re-priced here: the
 * one *live* `game."Shop"` row that sells template 11164 for Money (`ShopID=1`, the general cash shop) is
 * bulk-seeded data from the full original DB dump, owned by the loja/`m3-ashx` feature area, not introduced
 * by this task — re-pricing it would touch a large shared table outside this task's scope. Full analysis in
 * `docs/features/montaria.md` §5. The original's "Deed" (Escritura) free-feed bypass (`Player.Extra.
 * UseDeed(12/13)`, 2/3 free uses while a Deed is active) is a documented pre-existing gap, same category as
 * the per-attribute King's Blessing effects (`handlers/progressao/juramento-do-rei.ts` header) — not ported
 * here either, see `docs/features/montaria.md` §6.
 *
 * Exploit avoided (new, doesn't exist in the original): nothing in `UpHorse.cs`/`UpSkill.cs` stops a client
 * from sending a negative or absurd `count` — `Math.min(requested, owned)` in `game/montaria.ts` already
 * floors any negative request to a non-positive `count` (rejected) and never trusts the client's number as a
 * multiplier beyond what's actually owned.
 *
 * **Fixed vs the original** (see `game/stats.ts getBaseDefence` doc): the decompiled 6600 double-counts the
 * mount's `AddDamage` into the player's Armor (copy-paste bug, `AddGuard` field left completely dead) —
 * fixed to read `AddGuard` there instead.
 *
 * Como testar: `apps/game/test/client-6600-m4-montaria.test.ts`.
 */
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import { GSPacket } from "@ddt/protocol";
import * as Out from "../../packets/out.js";
import { computeFeedResult, computeSkillUpResult, activateMountPicCherish, type MountSkillState } from "../../game/montaria.js";

/** `MountMgr.GetMountTemplate(0)` + `ctx.templates.mountSkillGetTemplates` adapter for `game/montaria.ts`'s
 *  `MountDataTables`. */
function tables(ctx: ServerContext) {
  return {
    mountTemplate: (grade: number) => ctx.templates.mountTemplate(grade),
    mountSkillGetTemplates: (skillId: number) => ctx.templates.mountSkillGetTemplates(skillId),
  };
}

const FEED_ITEM = 11164; // "Star Upgrade Pill" (ChangeHorse.cs templateId constant)
const SKILL_ITEM = 11165; // "Skill Upgrade Bead" (UpSkill.cs templateId constant)

/** 260/2 CHANGE_HORSE (`ChangeHorse.cs:10-30`): int tag — 0 unmounts, any other value equips that visual
 *  (a plain mount tag <=100, or a "cherished" skin id >100 the player already owns). */
function changeHorse(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): void {
  if (!p.mount) return; // defensive: login always creates the row for 6600 clients before this can fire
  const tag = pkt.readInt();
  const wasOn = p.mount.curUseHorse !== 0;
  p.mount.curUseHorse = tag;
  p.mountDirty = true;
  const added = activateMountPicCherish(p.mountPicCherish, tag);
  p.send(Out.horseChange(p.id, tag));
  // ChangeHorse.cs:17-26: unmounting (tag=0) ALWAYS recomputes+messages; mounting only messages on the
  // off->on edge (`!UpdateProperties`, approximated here by `!wasOn` — see game/montaria.ts header on why
  // the original's runtime-only flag resetting every login has no observable effect in this port, since
  // `recalcStats()` already reflects the real `curUseHorse` on every login regardless). `added` (a brand
  // new "cherished" skin) also changes the total, same as `PlayerHorse.ActiveHorsePicCherish`'s own
  // internal `UpdatePlayerProperties` call, but never gets its own chat message here (that's sub 7's job).
  if (tag === 0 || !wasOn) p.sendMessage(0, tag === 0 ? "Montaria recolhida." : "Montaria equipada.");
  if (added || tag === 0 || !wasOn) p.updatePlayerProperties();
}

/** 260/3 UP_HORSE (`UpHorse.cs:14-57`): feed `count` Star Upgrade Pills (templateId 11164) from PropBag for
 *  mount level/exp. No ack at all when nothing is spent (count<=0 or no items owned) — same as the original. */
function upHorse(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): void {
  if (!p.mount) return;
  const requested = pkt.readInt();
  const item = p.propBag.getItemByTemplateID(0, FEED_ITEM);
  const owned = item?.Count ?? 0;
  const expPerItem = ctx.templates.findItem(FEED_ITEM)?.Property2 ?? 0;
  const r = computeFeedResult(tables(ctx), p.mount.curLevel, p.mount.curExp, requested, owned, expPerItem);
  if (!r) return;
  // Charge BEFORE granting (AGENTS.md): remove the pills first — `removeTemplate` is atomic (all-or-nothing
  // across the stack), so a failure here can never leave the player charged without the level/exp applied.
  if (!p.propBag.removeTemplate(FEED_ITEM, r.spendCount)) return;
  if (r.gainedExp <= 0) return; // dead with real data (Property2 always > 0), kept literal — see game/montaria.ts
  p.mount.curExp = r.newExp;
  p.mount.curLevel = r.newLevel;
  p.mountDirty = true;
  if (r.newSkill) {
    p.mountSkills.set(r.newSkill.SKillID, r.newSkill);
    p.send(Out.horseGetSkill(p.id, r.newSkill.SKillID, r.newSkill.Exp));
  }
  p.send(Out.horseUpResult(p.id, r.leveledUp, p.mount.curLevel, p.mount.curExp));
  if (r.leveledUp) p.updatePlayerProperties(); // curLevel feeds Mount_Template's Magic/HP/Damage/Guard bonus
}

/** 260/5 UP_SKILL (`UpSkill.cs:12-71`): feed `count` Skill Upgrade Beads (templateId 11165) into one of the
 *  mount's OWNED skills, possibly evolving it into the next id on `Mount_SKill_Get_Template`'s ladder. */
function upSkill(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): void {
  if (!p.mount) return;
  const skillId = pkt.readInt();
  const requested = pkt.readInt();
  const skill = p.mountSkills.get(skillId);
  if (!skill) return p.sendMessage(1, "Essa habilidade de montaria não foi desbloqueada ainda.");
  const item = p.propBag.getItemByTemplateID(0, SKILL_ITEM);
  const owned = item?.Count ?? 0;
  const expPerItem = ctx.templates.findItem(SKILL_ITEM)?.Property2 ?? 0;
  const r = computeSkillUpResult(tables(ctx), skill, requested, owned, expPerItem);
  if (!r) return;
  if (!p.propBag.removeTemplate(SKILL_ITEM, r.spendCount)) return;
  if (r.gainedExp <= 0) return; // dead with real data, see game/montaria.ts
  const updated: MountSkillState = { SKillID: r.newSkillId, Exp: r.newExp, IsUse: skill.IsUse };
  if (r.newSkillId !== skillId) p.mountSkills.delete(skillId);
  p.mountSkills.set(r.newSkillId, updated);
  p.mountDirty = true;
  p.send(Out.horseUpSkillResult(p.id, skillId, r.newSkillId, r.newExp));
  p.sendMessage(0, `Habilidade da montaria treinada (+${r.gainedExp} exp).`);
  // Skill exp/id never feeds a base-stat bonus (it's a battle ability slot, not a passive stat) -> no
  // updatePlayerProperties() here, same as the original (UpSkill.cs never calls EquipBag.UpdatePlayerProperties).
}

/** 260/6 TAKE_UP_DOWN_SKILL (`TakeUpDownSkill.cs:6-21`): equip/unequip an owned skill into slot `status`
 *  (0 = unequip, 1-3 = slot). Always acks, even when the skill id isn't owned — same as the original
 *  (`PlayerHorse.TakeUpDownSkill` no-ops silently on a missing key, the handler sends the echo regardless). */
function takeUpDownSkill(_ctx: ServerContext, p: GamePlayer, pkt: GSPacket): void {
  const skillId = pkt.readInt();
  const status = pkt.readInt();
  const skill = p.mountSkills.get(skillId);
  if (skill) { skill.IsUse = status; p.mountDirty = true; }
  p.send(Out.horseTakeUpDownSkill(p.id, skillId, status));
}

/** 260/7 ACTIVE_HORSEPICCHERISH (`ActiveHorsePicCherish.cs:10-45`): consume ONE "cherished mount" unlock
 *  item (`Mount_Draw_Template.TemplateId`) from PropBag slot `place` to equip that skin. */
function activeHorsePicCherish(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): void {
  if (!p.mount) return;
  const place = pkt.readInt();
  const item = p.propBag.getItemAt(place);
  if (!item) return p.sendMessage(1, "Item não encontrado.");
  const draw = ctx.templates.mountDrawsByTemplate.get(item.TemplateID);
  if (!draw) return p.sendMessage(1, "Esse item não é uma montaria.");
  const wasOn = p.mount.curUseHorse !== 0;
  p.mount.curUseHorse = draw.ID;
  p.mountDirty = true;
  const added = activateMountPicCherish(p.mountPicCherish, draw.ID);
  p.send(Out.horseActivePicCherish(p.id, draw.ID, true));
  p.send(Out.horseChange(p.id, draw.ID)); // ActiveHorsePicCherish.cs:33 also sends SendchangeHorse
  p.sendMessage(0, `Montaria "${draw.Name}" ativada!`);
  p.propBag.removeTemplate(item.TemplateID, 1);
  // **Fixed vs the original**: ActiveHorsePicCherish.cs never calls EquipBag.UpdatePlayerProperties() for the
  // curUseHorse 0->nonzero edge (only PlayerHorse.ActiveHorsePicCherish's own "brand new draw" branch does) —
  // a player re-equipping an ALREADY-owned skin from unmounted would keep stale (missing) Mount_Template
  // stats until some unrelated recompute happened to run. Not an exploit (it under-counts the player's own
  // bonus), but AGENTS.md/the owner's standing order is to never replicate a bad original behaviour either
  // (same call as `docs/features/passe-classico.md` §5) — always recomputing here is simpler and correct.
  if (added || !wasOn) p.updatePlayerProperties(); // draw.ID is always > 100 (always "on"), see activateMountPicCherish
}

export function registerMontaria(r: import("../registry.js").HandlerRegistry): void {
  r.player(260, "HORSE", (ctx, p, pkt) => {
    const sub = pkt.readByte();
    switch (sub) {
      case 2: return changeHorse(ctx, p, pkt);
      case 3: return upHorse(ctx, p, pkt);
      case 5: return upSkill(ctx, p, pkt);
      case 6: return takeUpDownSkill(ctx, p, pkt);
      case 7: return activeHorsePicCherish(ctx, p, pkt);
      // 1 GET_ALL_DATA / 8 HORSE_PICCHERISH_INFO: server->client only, no client sender exists (see header).
      default: ctx.log.debug(`260 HORSE: sub ${sub} not handled`);
    }
  });
}
