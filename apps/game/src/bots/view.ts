/**
 * Builds a bot's real `PlayerInfo` attributes (Attack/Defence/Agility/Luck/hp/Style/Colors/Skin) from its
 * app."Bots" row (`BotSpec`), through the EXACT same `game/stats.ts computeStats()` path real players go
 * through in `GamePlayer.recalcStats()` (player.ts). Fixes the m1-bot-pvp bug: the bot used to show up with
 * `Attack/Defence/Agility/Luck=0`, `hp=1000` hardcoded and an empty look, no matter what the admin equipped it
 * with — `BotSpec.equips`/`weaponTemplateId` were loaded from the DB but never read into anything observable.
 *
 * `BotSpec.equips` is a flat list of template ids (admin picks freely, any category — `apps/admin/src/
 * resources/players.ts` "equips" `item-picker-multi`, no slot chosen). Since bots have no client to tell the
 * server which `EquipBag` place each item goes in (real players do, `handlers/bolsa/mover.ts`), each item's
 * own `CategoryID` decides its place via `placeForCategory` (game/item.ts, ported from the AS3
 * `EquipType.CategeryIdToPlace`). A category whose place is already taken is skipped (first match wins, last
 * one in the list for a repeated category silently lost — fine for a bot's small, admin-curated wardrobe).
 *
 * Not ported: `ItemInfo.Skin` is a per-INSTANCE customization (`player."Sys_Users_Goods".Skin`), not a
 * template field — `ItemInfo.createFromTemplate` never sets it (same as any freshly-dropped real item), so a
 * bot's `Skin` string is always "" regardless of its Face-slot item. Cosmetic only (no stat uses it).
 *
 * Known gap: a category-17 (second weapon) or category-19 (healstone) pick ends up in the equip array (place
 * 15/18) for `computeStats` and the Style string, but has no COMBAT effect for a bot — `fight/ddt.ts specOf()`
 * reads the deputy weapon/healstone straight off a real player's `equipBag` (`m.equipBag?.getItemAt(15/18)`),
 * and `VirtualPlayer` has no bags at all. Matches the original anyway (docs/spec/combat/02-bots.md §1.3: "the
 * bot never uses STUNT, pet skills or healing" — ours DOES use STUNT, just not a healstone/second weapon).
 */
import { ItemInfo, placeForCategory, type ItemTemplate } from "../game/item.js";
import { computeStats, styleFromEquip, type StatTables, type TexpExp } from "../game/stats.js";
import type { BotSpec } from "./bot.js";

/** Duck-typed subset of `db/templates.ts` `Templates` — avoids a hard import from the DB template loader. */
export interface BotStatSource {
  findItem(id: number): ItemTemplate | undefined;
  stats: StatTables;
  /** LevelInfo.Blood per grade (GamePlayer.levelBlood / `ctx.templates.levels`). */
  levels: Map<number, number>;
}

const ZERO_TEXP: TexpExp = { attTexpExp: 0, defTexpExp: 0, spdTexpExp: 0, lukTexpExp: 0, hpTexpExp: 0 };

export interface BotView {
  attack: number; defence: number; agility: number; luck: number; hp: number;
  baseAttack: number; baseDefence: number; magicAttack: number; magicDefence: number;
  style: string; colors: string; skin: string;
}

/**
 * Places `spec.weaponTemplateId` (place 6) + every `spec.equips` id (auto-placed by category) into an
 * EquipBag-shaped array. `ItemInfo.createFromTemplate` never sets `.Color` (it's a per-instance dye picked at
 * drop time, `player."Sys_Users_Goods".Color` — see `game/item.ts` `fromRow`, not a template field at all), so
 * a freshly-synthesized bot item would always style as colorless; picking the template's first declared
 * `Colors` option (CSV, `Shop_Goods.Colors`) is a bot-only simplification (real drops roll one at random) so
 * a bot's look isn't flatly grey/default.
 */
export function buildBotEquip(spec: BotSpec, findItem: (id: number) => ItemTemplate | undefined): (ItemInfo | null)[] {
  const equip: (ItemInfo | null)[] = new Array(31).fill(null);
  const place = (id: number): void => {
    const t = findItem(id);
    if (!t) return;
    for (const p of placeForCategory(t.CategoryID)) {
      if (equip[p]) continue;
      const it = ItemInfo.createFromTemplate(t, 1, 101);
      it.Color = t.Colors?.split(",")[0]?.trim() ?? "";
      equip[p] = it;
      return;
    }
  };
  if (spec.weaponTemplateId) place(spec.weaponTemplateId);
  for (const id of spec.equips ?? []) place(id);
  return equip;
}

/**
 * "Sensible default scaled to level" fallback (task m1-bot-pvp): when the admin leaves `equips` empty (or
 * without a hat/clothes piece), `computeStats` legitimately returns 0 defence/agility/luck — a human with no
 * gear at that level would be just as weak, so this isn't a bug in `computeStats` itself. A bot can't farm
 * gear, though, so a bare bot would always be a free kill; this floor (not in `docs/spec/combat/02-bots.md`,
 * chosen here) keeps it roughly as capable as a starter-geared human of the same level instead of a punching
 * bag, without inventing a fake equipped item. Never lowers a value `computeStats` already gave a real one.
 */
function withLevelFloor(level: number, r: { attack: number; defence: number; agility: number; luck: number; baseAttack: number; baseDefence: number }): void {
  const lvl = Math.max(1, level);
  if (r.attack <= 0) r.attack = Math.round(10 + lvl * 1.5);
  if (r.defence <= 0) r.defence = Math.round(10 + lvl * 1.5);
  if (r.agility <= 0) r.agility = Math.round(5 + lvl);
  if (r.luck <= 0) r.luck = Math.round(5 + lvl * 0.5);
  // weaponTemplateId is NOT NULL in app."Bots" (schema default 7001), so this only fires if the admin picked
  // an id the server can't find a template for (template cache stale/reload race) — never a silent 0-damage bot.
  if (r.baseAttack <= 0) r.baseAttack = Math.round(80 + lvl * 6);
  if (r.baseDefence <= 0) r.baseDefence = Math.round(20 + lvl * 2);
}

/** `GamePlayer.recalcStats()`, but for a `VirtualPlayer` (no bags, no cards/pet/totem/mount — none exist for a bot). */
export function buildBotView(spec: BotSpec, t: BotStatSource, now = new Date()): BotView {
  const equip = buildBotEquip(spec, t.findItem);
  const r = computeStats(
    {
      equip, grade: spec.level, levelBlood: t.levels.get(spec.level) ?? 0, necklaceExpAdd: 0, totemId: 0,
      texp: ZERO_TEXP, cards: [], pet: null, evolutionGrade: 0, now,
    },
    t.stats,
  );
  withLevelFloor(spec.level, r);
  // DEV_BOT_HP (dev-only, unset in prod): overrides every bot's hp with a fixed low value so a PvP fight
  // against a bot can be finished deterministically in a test/smoke run (ver docs/client-pixi/STATUS.md
  // "achados" — mirar às cegas contra o hp real do bot não fecha KO de propósito em N tentativas).
  const devHp = process.env.DEV_BOT_HP ? Number(process.env.DEV_BOT_HP) : undefined;
  if (devHp && Number.isFinite(devHp) && devHp > 0) r.hp = devHp;
  const { style, color, skin } = styleFromEquip(equip);
  return {
    attack: r.attack, defence: r.defence, agility: r.agility, luck: r.luck, hp: r.hp,
    baseAttack: r.baseAttack, baseDefence: r.baseDefence, magicAttack: r.magicAttack, magicDefence: r.magicDefence,
    style, colors: color, skin,
  };
}
