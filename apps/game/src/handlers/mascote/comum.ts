/**
 * Infra compartilhada por quase todo arquivo de `mascote/` — sem tela própria.
 * C#: `PetHandler.cs` → `PetLogicProcessor` (byte sub = `PetPackageType`); lógica pura em `game/pets.ts`.
 */
import type { GamePlayer } from "../../game/player.js";
import { cfgNum } from "../../game/pets.js";
import type { ServerContext } from "../../session/context.js";

/** PetInventory.MaxLevelByGrade = min(nível do jogador, Pet_Config MaxLevel). */
export function petMaxLevelByGrade(ctx: ServerContext, p: GamePlayer): number {
  return Math.min(p.info.Grade, cfgNum(ctx.templates.pets, "MaxLevel", 50));
}

/** Recalcula o pet equipado + manda a lista pro cliente; `stats` também recalcula os status de combate. */
export function petsChanged(p: GamePlayer, stats: boolean): void {
  p.pet = p.petBag.equipped();
  p.flushPets();
  if (stats) p.updatePlayerProperties();
}

/** MoneyDirect(custo, false, false): desconta Cupom (saldo travado primeiro); false = não tinha o suficiente
 *  (nada é removido). */
export function tryRemoveMoney(p: GamePlayer, cost: number): boolean {
  if (p.info.Money + p.info.MoneyLock < cost) return false;
  p.removeMoney(cost);
  return true;
}
