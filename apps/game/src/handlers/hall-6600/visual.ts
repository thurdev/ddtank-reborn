/**
 * Aba no jogo: Hall (6600) › aparência do avatar no salão — 262/5 MODIFYDRESS (sem corpo: "troquei de
 * roupa, me redesenhem") e 262/9 UPDATEPETS (bool descartado, int id, int petsID: "mostrar/ocultar o
 * bichinho ao meu lado").
 * C#: `Game.Server.NewHall.Handle.PlayerModifyDress`/`UpdatePets` (`[Attribute13(5)]`/`[Attribute13(9)]`),
 * `WorldMgr.NewHallRooms.method_1` (dress, broadcast direto)/`UpdatePets` (`NewHallRoom.cs`).
 * Cliente: `GameSocketOut.as sendModifyNewPlayerDress()`/`sendUpdatePets(flag,id,petsID)`;
 * `horse/HorseManager.as:527` e `playerDress/PlayerDressManager.as:126` chamam o 1º ao trocar
 * montaria/figurino; `petsBag/petsAdvanced/PetsFormPetsItem.as:140-147` chama o 2º.
 * `petsID`/`MountsType` não são sistemas implementados ainda (Montaria é m1-schema-only); o valor do
 * bichinho fica só em memória por sessão (`GamePlayer.hallPetsId`) — ver `packets/out.ts` HallPlayerView.
 */
import type { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";

/** 262/5 MODIFYDRESS — sem corpo. */
export function newHallModifyDress(ctx: ServerContext, p: GamePlayer): void {
  ctx.newHall.modifyDress(p);
}

/**
 * 262/9 UPDATEPETS.
 * Como lê esse código (cada variável):
 * - descarta o 1º bool (o C# lê `packet.ReadBoolean()` e nunca usa — `UpdatePets.cs:12`).
 * - `id`: sempre o próprio id do jogador (`sendUpdatePets(flag, PlayerManager.Instance.Self.ID, ...)`).
 * - `petsId`: id do bichinho a mostrar, ou `0` pra ocultar.
 */
export function newHallUpdatePets(ctx: ServerContext, _p: GamePlayer, pkt: GSPacket): void {
  pkt.readBoolean();
  const id = pkt.readInt();
  const petsId = pkt.readInt();
  ctx.newHall.updatePets(id, petsId);
}
