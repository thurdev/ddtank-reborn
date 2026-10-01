/**
 * Stub fight engine used until @ddt/fight lands: PVPGame.Prepare -> SendCreateGame (91/101) and
 * PVPGame.StartLoading -> SendStartLoading (91/103, Game.Logic/PVPGame.cs:841), so a room reaches the battle
 * loading screen. Loading-complete / turn packets are logged and ignored.
 */
import type { GSPacket } from "@ddt/protocol";
import * as Out from "../packets/out.js";
import type { RoomMember } from "../game/player.js";
import type { FightEngine, FightGame, StartGameOptions } from "./types.js";

let gameIdSeq = 1;

export class StubFightEngine implements FightEngine {
  readonly name = "stub";
  readonly games = new Map<number, StubGame>();

  constructor(private readonly pickMap: (mapId: number) => number, private readonly log?: (m: string) => void) {}

  startPvp(o: StartGameOptions): FightGame | null {
    const g = new StubGame(gameIdSeq++, this.pickMap(o.mapId), o, this);
    this.games.set(g.id, g);
    g.prepare();
    return g;
  }

  logPacket(m: string): void {
    this.log?.(m);
  }
}

class StubGame implements FightGame {
  private readonly members: { p: RoomMember; team: number; living: number }[];
  constructor(readonly id: number, readonly mapId: number, private readonly o: StartGameOptions, private readonly engine: StubFightEngine) {
    let living = 0;
    this.members = [...o.red.map((p) => ({ p, team: 1, living: living++ })), ...o.blue.map((p) => ({ p, team: 2, living: living++ }))];
  }

  private sendAll(pkt: GSPacket): void {
    for (const m of this.members) m.p.send(pkt);
  }

  prepare(): void {
    const views: Out.FightPlayerView[] = this.members.map(({ p, team, living }) => {
      const v = p.view();
      const w = (p as { mainWeapon?: { RefineryLevel: number; template: { Name: string | null } } | null }).mainWeapon;
      return { ...v, team, livingId: living, maxBlood: Math.max(1, p.info.hp), weaponRefineryLevel: w?.RefineryLevel ?? 0, weaponName: w?.template.Name ?? "" };
    });
    this.sendAll(Out.gameCreate(this.o.roomType, this.o.gameType, this.o.timeType, views));
    this.sendAll(Out.gameLoad(60, this.mapId, []));
  }

  processData(from: RoomMember, pkt: GSPacket): void {
    const sub = pkt.readByte();
    this.engine.logPacket(`stub game ${this.id}: GAME_CMD sub ${sub} from ${from.id} ignored`);
  }

  removePlayer(p: RoomMember): void {
    const i = this.members.findIndex((m) => m.p === p);
    if (i >= 0) this.members.splice(i, 1);
    if (this.members.length === 0) this.stop();
  }

  stop(): void {
    this.engine.games.delete(this.id);
    this.o.onStopped();
  }
}
