/**
 * Aba no jogo: Mascote › bolsa do mascote (consultar seus pets ou os de outro jogador online/offline).
 * Pacotes: 68 PET sub 1 (UpdatePet).
 * C#: `UpdatePet.cs`.
 * Como testar: `apps/game/test/pets-advanced.test.ts`. Manual: Mascote → abrir bolsa.
 */
import type { GSPacket } from "@ddt/protocol";
import { loadUserPets } from "../../db/pets-cards.js";
import { reduceProp } from "../../game/pets.js";
import type { GamePlayer } from "../../game/player.js";
import * as Out from "../../packets/out.js";
import type { ServerContext } from "../../session/context.js";

/** 1 UpdatePet: int userId — bolsa em memória (se online) ou `Sys_Users_Pet` do banco (se offline/outro). */
export async function updatePet(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  const uid = pkt.readInt();
  const other = uid === p.id ? p : ctx.world.get(uid);
  const pets = other ? other.petBag.getPets() : await loadUserPets(ctx.db.db, uid);
  const slots = pets.map((pet) => ({ place: pet.Place, pet: { ...pet, PetHappyStarReduce: (v: number) => reduceProp(pet, v) } }));
  p.send(Out.updateUserPet(uid, p.zoneId, slots, other?.petBag.eat ?? { weaponLevel: 0, clothesLevel: 0, hatLevel: 0 }));
}
