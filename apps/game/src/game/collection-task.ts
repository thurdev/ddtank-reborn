/**
 * Game.Server.CollectionTask.CollectionTaskRoom (vendor/DDT-6600/Source/Game.Server/Game.Server.CollectionTask/
 * CollectionTaskRoom.cs) — in-memory registry for "Coleta" (`collectiontask.swf`, 261 COLLECTION_TASK, m4-coleta).
 * One global room for the whole server, same as `WorldMgr.CollectionTaskRooms` (static single instance,
 * `Game.Server.Managers/WorldMgr.cs:52`) and the same pattern as `game/new-hall.ts`'s `NewHallRoom`.
 *
 * What this room is NOT: it does not track quest progress. "Coleta" is a quest-driven minigame — the player
 * only ever gets here by clicking the "go to location" button of whichever of their active quests has
 * `Condition===64` (`CollectionTaskCondition`, `hall/tasktrack/HallTaskTrackListCell.as:389-391`,
 * `quest/TaskMainFrame.as:953-956`, both `case 64: CollectionTaskManager.Instance.setUp()`). The scene itself
 * has no server-side concept of "which quest" — it is just a shared walkable room where clicking one of 5
 * fixed hotspots (tree/bee box) sends a fixed `collectedId` (`CollectionTaskSceneMap.as:205-236`: 11499 red
 * tree, 11495 green tree, 11497 yellow tree, 11783 both bee boxes) that the QUEST system checks against the
 * player's own active condition's `Para1` — see `game/quests.ts` `onCollectionTaskCollect`.
 *
 * 6600-only: `ePackageType.COLLECTION_TASK=261` doesn't exist in the 4.1 enum — guarded at the handler layer
 * (`handlers/eventos/coleta.ts`), not inside this class, same convention as `new-hall.ts`.
 *
 * Admin gate: `isOpen(ctx, "collection_task")` (`handlers/eventos/agendador.ts`) — the original has no on/off
 * switch for this scene at all (reachability is 100% quest-driven); this is a NEW gate the task asked for
 * (owner wants every M4 window admin-configurable), checked once on entry (261/5 INIT_PLAYERS) same as
 * `labyrinth`'s room-create gate — once inside, nothing closes the door on you mid-session.
 */
import type { PacketOut } from "@ddt/protocol";
import * as Out from "../packets/out.js";
import type { GamePlayer } from "./player.js";

interface Occupant {
  player: GamePlayer;
  x: number;
  y: number;
}

function view(o: Occupant): Out.CollectionTaskPlayerView {
  return { info: o.player.info, x: o.x, y: o.y };
}

export class CollectionTaskRoom {
  private readonly byId = new Map<number, Occupant>();

  /**
   * CollectionTaskRoom.AddPlayer (:95-110) — 261/5 INIT_PLAYERS request (`sendCollectionSceneEnter`,
   * `CollectionTaskMainView.enter`, :37-50). Leaves whatever room the player was in (mirrors
   * `player.CurrentRoom.RemovePlayerUnsafe(player)`), registers them at (0,0) the first time (the C# field
   * `GamePlayer.CollectionTaskPosX/PosY` defaults to 0 — replicated: a freshly-joined occupant who hasn't
   * walked yet really does report (0,0) to everyone else until their first 261/2 WALK), then replies with the
   * current full occupant snapshot (`SendPlayerInfos`, :24-50) — including themselves, same as the original
   * (the AS3 reader skips any entry whose ID equals its own, `CollectionTaskMainView.addPlayer`, :118-148).
   *
   * **Gap kept, not fixed** (documented, not silently dropped): the original's `SendAddPlayer`/`AddPlayerInfo`
   * (byte 1, broadcast to everyone but the new player) is never called from `AddPlayer` itself — so a player
   * already in the room is NEVER told a new occupant joined after their own snapshot. They only find out the
   * new occupant exists once that occupant's first WALK broadcast arrives (which updates the model implicitly
   * through `movePlayer`... except the AS3 `CollectionTaskSceneMap.movePlayer` (:359-368) silently NO-OPS for
   * an unknown id instead of adding it!). Net effect in the real game: you only ever see players who were
   * already in the room before you arrived, never ones who arrive after you — a genuine original limitation,
   * replicated by simply never calling the TS equivalent of `SendAddPlayer` either.
   */
  addPlayer(p: GamePlayer): void {
    p.currentRoom?.removePlayer(p);
    let o = this.byId.get(p.id);
    if (!o) this.byId.set(p.id, (o = { player: p, x: 0, y: 0 }));
    p.send(Out.collectionTaskInit([...this.byId.values()].map(view)));
  }

  /** CollectionTaskRoom.PlayerMove (:73-84) — 261/2 WALK request. `id` is always the sender's own id (the AS3
   *  `sendCollectionSceneMove` call carries no id either — same "id is implicit" shape as NewHall's PLAYERMOVE,
   *  `game/new-hall.ts playerMove`). No-op if the sender somehow isn't registered (e.g. raced a disconnect). */
  playerMove(id: number, x: number, y: number): void {
    const o = this.byId.get(id);
    if (!o) return;
    o.x = x;
    o.y = y;
    this.broadcastExcept(Out.collectionTaskWalk(id, x, y), o.player);
  }

  /**
   * CollectionTaskRoom.RemovePlayer (:112-126) — 261/4 QUIT request AND the disconnect/logout cleanup hook
   * (`GamePlayer.Quit` → `WorldMgr.CollectionTaskRooms.RemovePlayer(PlayerId)`, `session/login.ts doQuit`).
   * **Not replicated as-is** (documented deviation, not a silent fix): the real client's `sendLeaveCollectionScene`
   * (`GameSocketOut.as:4355-4360`) writes ONLY the sub-byte — no int — while the real server's
   * `PlayerExit.CommandHandler` (`Game.Server.CollectionTask.Handle/PlayerExit.cs:8-16`) unconditionally calls
   * `packet.ReadInt()` anyway. C#'s `GSPacketIn.ReadInt()` past the buffer's end silently returns 0 (no real
   * player ever has id 0, so the original's QUIT is an unconditional no-op in production); our codec's
   * `readInt()` THROWS on underflow instead (`packages/protocol/src/byte-buffer.ts`, deliberately strict —
   * see its header comment). Reading nothing and removing the SENDER's own id (not an attacker-supplied one)
   * reaches the exact same outcome the real client/server pair reaches in practice — "you leave your own
   * occupant slot" — without inventing a read that never happens for real and without trusting a foreign id
   * the real packet never carries either way. */
  removePlayer(id: number): boolean {
    if (!this.byId.delete(id)) return false;
    this.broadcastAll(Out.collectionTaskQuit(id));
    return true;
  }

  private broadcastAll(pkt: PacketOut): void {
    for (const o of this.byId.values()) o.player.send(pkt);
  }

  private broadcastExcept(pkt: PacketOut, except: GamePlayer): void {
    for (const o of this.byId.values()) if (o.player !== except) o.player.send(pkt);
  }
}
