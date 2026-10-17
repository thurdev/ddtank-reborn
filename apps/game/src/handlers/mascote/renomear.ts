/**
 * Aba no jogo: Mascote › renomear pet (custo em Cupom).
 * Pacotes: 68 PET sub 9 (RenamePet).
 * C#: `RenamePet.cs` (Pet_Config `ChangeNameCost`, MoneyDirect).
 * Como testar: `apps/game/test/pets-advanced.test.ts`. Manual: Mascote → selecionar pet → Renomear.
 */
import type { GSPacket } from "@ddt/protocol";
import { cfgNum } from "../../game/pets.js";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import { petsChanged } from "./comum.js";

/** 9 RenamePet: int place, str name. */
export function rename(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): void {
  const T = ctx.templates.pets;
  const t = ctx.lang.t.bind(ctx.lang);
  const bag = p.petBag;
  const place = pkt.readInt();
  const name = pkt.readString().trim().slice(0, 32);
  const cost = cfgNum(T, "ChangeNameCost", 1900);
  if (!name || !bag.getPetAt(place)) return;
  if (p.info.Money + p.info.MoneyLock < cost) return p.sendMessage(0, t("UserBuyItemHandler.Money"));
  p.removeMoney(cost);
  bag.renamePet(place, name);
  p.sendMessage(0, t("PetHandler.Msg20"));
  petsChanged(p, false);
}
