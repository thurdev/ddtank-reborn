/**
 * Game.Server.NewHall.NewHallRoom (vendor/DDT-6600/Source/Game.Server/Game.Server.NewHall/NewHallRoom.cs) —
 * in-memory registry of who is visible in the 6600 walkable hall (262 NEW_HALL). One global room for the
 * whole server, same as the C# original: `NewHallRoom` never reads a map id, so the "big hall" (grade>10,
 * `HallPlayerView`'s `mapID=0`) and the "school" (grade<=10, `mapID=1`) share the SAME dictionary — a
 * grade-5 and a grade-20 player can see each other's dot moving even though their local meshes differ.
 * Not "fixed" here: this is how the original behaves (`WorldMgr.NewHallRooms` is a single static instance,
 * `Game.Server.Managers/WorldMgr.cs:38,50`), and the client-side `judgePlayerShow` x-range filter already
 * hides anyone whose position falls off-screen regardless of which map they are "really" on.
 *
 * 6600-only: ePackageType.NEW_HALL=262 doesn't exist in the 4.1 enum (no collision — see packets/out.ts
 * header comment), so every method here is only ever reached for `clientKind==="6600"` players (guarded at
 * the handler layer, `handlers/hall-6600/`, not inside this class — mirrors the C# which simply has no 4.1
 * equivalent of any of this).
 *
 * No player cap found anywhere in the C# (`GetPlayersSafe`/`method_1` walk the whole dictionary, no
 * `.Take()`/length check) — unlike the 94/9 room-list page cap (8 vs 9, m2-salas), there is nothing to
 * replicate here; documented so a future reader doesn't go looking for one again.
 */
import type { PacketOut } from "@ddt/protocol";
import * as Out from "../packets/out.js";
import type { GamePlayer } from "./player.js";

function view(p: GamePlayer): Out.HallPlayerView {
  return { info: p.info, posX: p.posX, posY: p.posY, petsId: p.hallPetsId };
}

export class NewHallRoom {
  private readonly byId = new Map<number, GamePlayer>();

  /**
   * NewHallRoom.PlayerInfo (:132-151) — client's 262/0 PLAYERINFO request on hall enter
   * (`HallPlayerView.sendPkg`, AS3 :124-136). Registers the player, replies to them (hide flag + own
   * position + visible others), and — unless they are hidden — announces them to everyone else already
   * in the hall.
   */
  playerInfo(p: GamePlayer): void {
    p.currentRoom?.removePlayer(p); // player.CurrentRoom.RemovePlayerUnsafe(player) (:134-137)
    if (!this.byId.has(p.id)) this.byId.set(p.id, p);
    this.hidePlayerInfo(p);
    if (!p.hideAllFriend) this.sendOtherFriendPlayerInfo(p);
  }

  /** NewHallRoom.HidePlayerInfo (:24-31): own hide-flag echo + SendPlayerInfo, always together. Also the
   *  reply to 262/7 PLAYERHID and 262/8 PLAYERSHOW (both just flip `HideAllFriend` then call this). */
  hidePlayerInfo(p: GamePlayer): void {
    p.send(Out.newHallPlayerHid(p.hideAllFriend));
    this.sendPlayerInfo(p);
  }

  /** NewHallRoom.SendPlayerInfo (:33-62): self position + every other occupant (empty if `p` is hidden —
   *  GetPlayersSafe, :218-234). This is the packet that creates `_selfPlayer`/`_sceneScene` client-side. */
  sendPlayerInfo(p: GamePlayer): void {
    p.send(Out.newHallSelfInfo(view(p), this.getPlayersSafe(p).map(view)));
  }

  /** NewHallRoom.SendOtherFriendPlayerInfo (:64-85): broadcast `p`'s own info to the rest of the hall. */
  sendOtherFriendPlayerInfo(p: GamePlayer): void {
    this.broadcastExcept(Out.newHallOtherPlayerInfo(view(p)), p);
  }

  /** NewHallRoom.SendAddPlayer (:87-108): reply to 262/4 ADDPLAYE. Broadcast to everyone but the described
   *  player (method_1(pkg, player)) — NOT only to whoever asked; replicated exactly, not "fixed". */
  sendAddPlayer(p: GamePlayer): void {
    this.broadcastExcept(Out.newHallAddPlayer(view(p)), p);
  }

  /** PlayerModifyDress.CommandHandler (:12-30, 262/5): own sub-byte, NOT a call into SendOtherFriendPlayerInfo
   *  — a different AS3 handler reacts to it (`__onAddModifyPlayerDress` vs `__onOtherFriendPlayerInfo`). */
  modifyDress(p: GamePlayer): void {
    this.broadcastExcept(Out.newHallModifyDress(view(p)), p);
  }

  /** NewHallRoom.PlayerMove (:110-121): 262/3 PLAYERMOVE request, `id` is always the sender's own id
   *  (`sendPlayerPos(x,y)` carries no id — `PlayerMove.cs:12-14` reads `Player.PlayerId`, not the packet). */
  playerMove(id: number, x: number, y: number): void {
    const p = this.byId.get(id);
    if (!p) return;
    p.posX = x;
    p.posY = y;
    this.broadcastExcept(Out.newHallPlayerMove(p.id, p.posX, p.posY), p);
  }

  /** NewHallRoom.AddPlayerInfo (:123-130): 262/4 ADDPLAYE request — client saw an unknown id moving and
   *  asked for its info. No-op if that id isn't registered (same as the C#, no error reply either way). */
  addPlayerInfo(id: number): void {
    const p = this.byId.get(id);
    if (p) this.sendAddPlayer(p);
  }

  /** NewHallRoom.UpdatePets (:153-173): 262/9 UPDATEPETS request. Updates the session-only "pet shown"
   *  field then re-announces exactly like a fresh PlayerInfo (self refresh + broadcast unless hidden). */
  updatePets(id: number, petsId: number): void {
    const p = this.byId.get(id);
    if (!p) return;
    p.hallPetsId = petsId;
    this.hidePlayerInfo(p);
    if (!p.hideAllFriend) this.sendOtherFriendPlayerInfo(p);
  }

  /** NewHallRoom.RemovePlayer (:175-189): 262/2 PLAYEREXIT request — the client always sends its own id
   *  (`StateManager.as:267`, sent whenever leaving `StateType.MAIN`, i.e. every hall exit including into a
   *  room). Broadcast to everyone (method_0 = method_1(pkg, null), no "except"). */
  removePlayer(id: number): boolean {
    if (!this.byId.delete(id)) return false;
    this.broadcastExcept(Out.newHallPlayerExit(id), null);
    return true;
  }

  /** NewHallRoom.GetPlayersSafe(GamePlayer) (:218-234): nobody if `except` is hidden; everyone else
   *  otherwise (no filtering on the OTHER players' own hide flag — that only gates broadcasts, see
   *  `method_1`/`broadcastExcept`). */
  private getPlayersSafe(except: GamePlayer): GamePlayer[] {
    if (except.hideAllFriend) return [];
    return [...this.byId.values()].filter((o) => o !== except);
  }

  /** NewHallRoom.method_1 (:241-261): every registered player except `except`, skipping any whose OWN
   *  `HideAllFriend` is set (a hidden player receives nothing about anyone either). */
  private broadcastExcept(pkt: PacketOut, except: GamePlayer | null): void {
    for (const o of this.byId.values()) {
      if (o !== except && !o.hideAllFriend) o.send(pkt);
    }
  }
}
