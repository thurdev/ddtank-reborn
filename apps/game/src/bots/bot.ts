/**
 * Bot hook: a virtual player that can occupy a room seat (the original's RobotGamePlayer / RingStation bots).
 * It receives the same packets as a human (send) so an AI driven by @ddt/fight can react; until then it is passive.
 * Bots come from app."Bots" (editable names in the admin).
 */
import type { GSPacket } from "@ddt/protocol";
import type { RoomMember } from "../game/player.js";
import type { BaseRoom } from "../rooms/room.js";
import type { PlayerInfo } from "../game/player-info.js";
import { defaultMatch, defaultTexp } from "../game/player-info.js";
import type { PlayerView } from "../packets/out.js";

export interface BotBrain {
  /** Every packet the bot's seat would receive. */
  onPacket(bot: VirtualPlayer, pkt: GSPacket): void;
}

export interface BotSpec {
  id: number;
  nickname: string;
  sex: boolean;
  level: number;
  weaponTemplateId: number;
}

export interface BotProvider {
  /** Returns a bot for an auto-match fallback or a free seat, or null. */
  acquire(level: number): VirtualPlayer | null;
  release(bot: VirtualPlayer): void;
}

/** Bot ids are negative so they never collide with Sys_Users_Detail.UserID. */
export class VirtualPlayer implements RoomMember {
  readonly isBot = true;
  currentRoom: BaseRoom | null = null;
  roomIndex = -1;
  roomTeam = 1;
  isViewer = false;
  readonly playerState = 1;
  readonly info: PlayerInfo;

  constructor(readonly spec: BotSpec, public brain: BotBrain | null = null, readonly zoneId = 0, readonly zoneName = "") {
    const now = new Date();
    this.info = {
      ID: -spec.id, UserID: -spec.id, UserName: `bot${spec.id}`, NickName: spec.nickname, Sex: spec.sex, Grade: spec.level,
      Style: ",,,,,,", Colors: ",,,,,,", Skin: "", Hide: 1111111111, Honor: "", Attack: 0, Defence: 0, Agility: 0, Luck: 0, hp: 1000,
      ConsortiaID: 0, ConsortiaName: "", ConsortiaLevel: 0, ConsortiaRepute: 0, Texp: defaultTexp(-spec.id, now), typeVIP: 0, VIPLevel: 0,
    } as unknown as PlayerInfo;
  }

  get id(): number {
    return this.info.ID;
  }
  get hasMainWeapon(): boolean {
    return true;
  }

  view(): PlayerView {
    return {
      id: this.id, info: this.info, match: defaultMatch(this.id), zoneId: this.zoneId, zoneName: this.zoneName, roomIndex: this.roomIndex,
      roomTeam: this.roomTeam, inRoom: this.currentRoom != null, pingTime: 0, weaponTemplateId: this.spec.weaponTemplateId,
      secondWeaponTemplateId: 0, medal: 0,
    };
  }

  send(pkt: GSPacket): void {
    this.brain?.onPacket(this, pkt);
  }

  sendMessage(): void {}
}
