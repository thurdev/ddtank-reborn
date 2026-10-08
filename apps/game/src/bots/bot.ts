/**
 * Bot virtual (RobotGamePlayer do original): ocupa assento de sala e recebe os mesmos pacotes que humano.
 * Origem dos dados: tabela app."Bots" (nomes editáveis no admin).
 *
 * Como lê esse código (cada variável):
 * - spec: ficha do bot (id, nickname, sex, level, weaponTemplateId, equips, guild).
 * - brain: IA que reage a cada pacote recebido via send(); null = passivo.
 * - zoneId/zoneName: zona exibida no view() do bot.
 * - difficulty: mira da IA (0-100); level/equips/guildName: atalhos de leitura do spec.
 * - info: PlayerInfo falso (ID negativo) para nunca colidir com jogador real.
 */
import type { GSPacket } from "@ddt/protocol";
import type { RoomMember } from "../game/player.js";
import type { BaseRoom } from "../rooms/room.js";
import type { PlayerInfo } from "../game/player-info.js";
import { defaultMatch, defaultTexp } from "../game/player-info.js";
import type { PlayerView } from "../packets/out.js";

/** Reação a cada pacote que o assento do bot receberia. */
export interface BotBrain {
  /** Cada pacote que o assento do bot receberia. */
  onPacket(bot: VirtualPlayer, pkt: GSPacket): void;
}

/** Ficha do bot (espelha app."Bots": só bots com enabled=true entram em jogo). */
export interface BotSpec {
  id: number;
  nickname: string;
  sex: boolean;
  level: number;
  weaponTemplateId: number;
  /** IDs de templates equipados (coluna equips); ausente = sem equipamento. */
  equips?: number[];
  /** Nome da guilda exibido (coluna guild); ausente/null = sem guilda. */
  guild?: string | null;
}

export interface BotProvider {
  /** Devolve bot p/ fallback do auto-match ou assento livre, ou null. */
  acquire(level: number): VirtualPlayer | null;
  release(bot: VirtualPlayer): void;
}

/** Ids negativos nunca colidem com Sys_Users_Detail.UserID. */
export class VirtualPlayer implements RoomMember {
  readonly isBot = true;
  currentRoom: BaseRoom | null = null;
  roomIndex = -1;
  roomTeam = 1;
  isViewer = false;
  readonly playerState = 1;
  readonly info: PlayerInfo;
  /** Mira da IA (0-100, padrão 50); preenchido pelo provider via DIFFICULTY. */
  public difficulty = 50;

  constructor(readonly spec: BotSpec, public brain: BotBrain | null = null, readonly zoneId = 0, readonly zoneName = "") {
    const now = new Date();
    this.info = {
      ID: -spec.id, UserID: -spec.id, UserName: `bot${spec.id}`, NickName: spec.nickname, Sex: spec.sex, Grade: spec.level,
      Style: ",,,,,,", Colors: ",,,,,,", Skin: "", Hide: 1111111111, Honor: "", Attack: 0, Defence: 0, Agility: 0, Luck: 0, hp: 1000,
      ConsortiaID: 0, ConsortiaName: spec.guild ?? "", ConsortiaLevel: 0, ConsortiaRepute: 0, Texp: defaultTexp(-spec.id, now), typeVIP: 0, VIPLevel: 0,
    } as unknown as PlayerInfo;
  }

  /** Nível efetivo do bot (espelha spec.level). */
  get level(): number {
    return this.spec.level;
  }
  /** Atalho de leitura: templates equipados. */
  get equips(): number[] {
    return this.spec.equips ?? [];
  }
  /** Atalho de leitura: nome da guilda ("" = sem guilda). */
  get guildName(): string {
    return this.spec.guild ?? "";
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
