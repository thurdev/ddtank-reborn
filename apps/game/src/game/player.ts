/**
 * GamePlayer (Game.Server/GamePlayer.cs) — online character state, bags, currencies and persistence.
 * Bags constructed as in the GamePlayer ctor (GamePlayer.cs:1126-1137).
 */
import { saveRecords } from "./events.js";
import type { GSPacket } from "@ddt/protocol";
import type { Database } from "@ddt/db";
import { savePlayerInfo } from "../db/characters.js";
import { saveItem } from "../db/items.js";
import type { AchievementDataRow, BuffRow, ExtraRow, QuestDataRow, RecordRow } from "../db/social.js";
import * as Out from "../packets/out.js";
import { BagType, ItemInfo, templateBagType, isSpecialTemplate, type ItemTemplate } from "./item.js";
import { PlayerEquipInventory, PlayerInventory, type InventoryHooks } from "./inventory.js";
import type { ClientKind, MatchRow, PlayerInfo } from "./player-info.js";
import type { BaseRoom } from "../rooms/room.js";
import type { QuestInventory } from "./quests.js";
import { saveBuffs, saveQuests } from "../db/social.js";
import { computeStats, emptyStatTables, userNimbus, type StatTables, type UserCard, type UserPet } from "./stats.js";
import { PetInventory, reduceProp, getPetEquips } from "./pets.js";
import { CardInventory } from "./cards.js";
import { savePets, saveCards, saveEatPets } from "../db/pets-cards.js";
import { saveAvatarCollection, type UserAvatarCollectionRow } from "../db/avatar-collection.js";

/** ePlayerState. */
export const PlayerState = { Offline: 0, Manual: 1, Online: 1, Away: 2 } as const;

export interface PacketSink {
  send(pkt: GSPacket): void;
  disconnect(reason: string): void;
  readonly remoteAddress: string;
  /** Resolves when every packet already queued for this connection was handled (GameClient.idle). */
  idle?(): Promise<void>;
}

export interface RoomMember {
  readonly id: number;
  readonly isBot: boolean;
  view(): Out.PlayerView;
  send(pkt: GSPacket): void;
  sendMessage(type: number, msg: string): void;
  currentRoom: BaseRoom | null;
  roomIndex: number;
  roomTeam: number;
  isViewer: boolean;
  readonly hasMainWeapon: boolean;
  readonly playerState: number;
  readonly info: PlayerInfo;
  onRoomLeft?(): void;
}

/** Teto de coluna integer do Postgres / `int` do C#. */
const I32_MAX = 2147483647;

export class GamePlayer implements RoomMember {
  readonly isBot = false;
  /** Set right after login (session/login.ts, from app.LoginSessions.Client) — see game/player-info.ts ClientKind. */
  clientKind: ClientKind = "41";
  readonly equipBag: PlayerEquipInventory;
  readonly propBag: PlayerInventory;
  readonly consortiaBag: PlayerInventory;
  readonly bankBag: PlayerInventory;
  readonly storeBag: PlayerInventory;
  readonly fightBag: PlayerInventory;
  readonly tempBag: PlayerInventory;
  readonly caddyBag: PlayerInventory;
  readonly farmBag: PlayerInventory;
  readonly foodBag: PlayerInventory;
  readonly petEggBag: PlayerInventory;
  friends = new Map<number, number>();
  quests: QuestDataRow[] = [];
  /** QuestInventory (set at login). */
  questInv: QuestInventory | null = null;
  /** LevelMgr.GetLevel(GP) (set at login). */
  gradeForGp: (gp: number) => number | undefined = () => undefined;
  /** LanguageMgr.GetTranslation (set at login) for messages built inside the player (quests). */
  lang: (key: string, ...args: unknown[]) => string = (k) => k;
  achievements: AchievementDataRow[] = [];
  records: RecordRow[] = [];
  buffs: BuffRow[] = [];
  extra: ExtraRow | null = null;
  currentRoom: BaseRoom | null = null;
  roomIndex = -1;
  roomTeam = 1;
  isViewer = false;
  playerState: number = PlayerState.Manual;
  lastChatTime = 0;
  /** GamePlayer.LastOpenHole (OpenFiveSixHoleHandler.cs throttle). */
  lastOpenHole = 0;
  /** GamePlayer.TimeCheckHack (unix seconds of the last 300 heartbeat). */
  timeCheckHack = 0;
  pingStart = 0;
  pingTime = 0;
  /** GamePlayer.m_showPP: ViewCurrent only sends 167 after the login burst. */
  showPP = false;
  readonly tempProperties = new Map<string, number>();
  isActive = true;
  /** Set by quitPlayer: every caller awaits the same quit (and its final save). */
  quitting: Promise<void> | null = null;
  /** Attribute tables (Templates.stats); set at login. */
  statTables: StatTables = emptyStatTables();
  /** Sys_Users_Card rows (equipped = Place 0..4) and the equipped Sys_Users_Pet (loaded at login). */
  cards: UserCard[] = [];
  pet: UserPet | null = null;
  /** PetInventory (20 slots) and CardInventory (100 slots, 0..4 equipped): loaded at login (session/login.ts). */
  petBag = new PetInventory(20);
  cardBag: CardInventory;
  /** PlayerAvatarCollection.AvatarCollect (AVATAR_COLLECTION 402): loaded at login (session/login.ts), db/avatar-collection.ts. */
  avatarCollect: UserAvatarCollectionRow[] = [];
  /** GamePlayer.GetBaseAttack / GetBaseDefence from the last recalcStats (fight specs). */
  baseAttack = 0;
  baseDefence = 0;
  private changeDepth = 0;
  private propsPending = false;

  constructor(
    readonly sink: PacketSink,
    public info: PlayerInfo,
    public match: MatchRow,
    public zoneId: number,
    public zoneName: string,
    private readonly levelBlood: (grade: number) => number = () => 0,
  ) {
    const hooks: InventoryHooks = {
      onSlotsChanged: (bag, slots) => this.send(Out.inventorySlots(this.id, bag, slots)),
      onEquipChanged: () => this.updatePlayerProperties(),
      canEquip: (t) => this.canEquip(t),
      onNewGear: (it) => this.questInv?.onNewGear(it.template.CategoryID),
    };
    this.equipBag = new PlayerEquipInventory(hooks);
    this.cardBag = new CardInventory(info.ID);
    this.propBag = new PlayerInventory(BagType.PropBag, 96, 0, true, true, hooks);
    this.consortiaBag = new PlayerInventory(BagType.Consortia, 100, 0, true, true, hooks);
    this.bankBag = new PlayerInventory(BagType.BankBag, 198, 0, true, true, hooks);
    this.storeBag = new PlayerInventory(BagType.Store, 20, 0, true, true, hooks);
    this.fightBag = new PlayerInventory(BagType.FightBag, 3, 0, false, false, hooks);
    this.tempBag = new PlayerInventory(BagType.TempBag, 60, 0, true, false, hooks);
    this.caddyBag = new PlayerInventory(BagType.CaddyBag, 30, 0, true, false, hooks);
    this.farmBag = new PlayerInventory(BagType.FarmBag, 30, 0, true, true, hooks);
    this.foodBag = new PlayerInventory(BagType.Food, 30, 0, true, true, hooks);
    this.petEggBag = new PlayerInventory(BagType.PetEgg, 30, 0, true, true, hooks);
    for (const b of this.allBags()) b.ownerId = info.ID;
  }

  get id(): number {
    return this.info.ID;
  }

  allBags(): PlayerInventory[] {
    return [this.equipBag, this.propBag, this.consortiaBag, this.bankBag, this.storeBag, this.fightBag, this.tempBag, this.caddyBag, this.farmBag, this.foodBag, this.petEggBag];
  }

  send(pkt: GSPacket): void {
    this.sink.send(pkt);
  }

  sendMessage(type: number, msg: string): void {
    this.send(Out.message(type, msg));
  }

  /** GamePlayer.GetInventory (GamePlayer.cs:2737). */
  getInventory(bagType: number): PlayerInventory | null {
    switch (bagType) {
      case BagType.CaddyBag: return this.caddyBag;
      case BagType.Consortia: return this.consortiaBag;
      case BagType.FarmBag: return this.farmBag;
      case BagType.EquipBag: return this.equipBag;
      case BagType.FightBag: return this.fightBag;
      case BagType.Food: return this.foodBag;
      case BagType.PetEgg: return this.petEggBag;
      case BagType.PropBag: return this.propBag;
      case BagType.Store: return this.storeBag;
      case BagType.TempBag: return this.tempBag;
      case BagType.BankBag: return this.bankBag;
      default: return null;
    }
  }

  getItemInventory(t: ItemTemplate): PlayerInventory | null {
    return this.getInventory(templateBagType(t));
  }

  get mainWeapon(): ItemInfo | null {
    return this.equipBag.getItemAt(6);
  }
  get hasMainWeapon(): boolean {
    return this.mainWeapon != null;
  }
  get secondWeapon(): ItemInfo | null {
    return this.equipBag.getItemAt(15);
  }

  /** GamePlayer.CanEquip: NeedLevel and NeedSex (0 any, 1 male, 2 female). */
  canEquip(t: ItemTemplate): boolean {
    if (t.NeedLevel > this.info.Grade) return false;
    if (t.NeedSex !== 0 && t.NeedSex !== (this.info.Sex ? 1 : 2)) return false;
    return t.CanEquip;
  }

  /** Medal = count of item 11408 (GetMedalNum). */
  get medal(): number {
    return this.propBag.getItemCount(11408);
  }

  view(): Out.PlayerView {
    return {
      id: this.id,
      info: this.info,
      match: this.match,
      zoneId: this.zoneId,
      zoneName: this.zoneName,
      roomIndex: this.roomIndex,
      roomTeam: this.roomTeam,
      inRoom: this.currentRoom != null,
      pingTime: this.pingTime,
      weaponTemplateId: this.mainWeapon?.TemplateID ?? -1,
      secondWeaponTemplateId: this.secondWeapon?.TemplateID ?? 0,
      medal: this.medal,
      clientKind: this.clientKind,
    };
  }

  // -------------------------------------------------------------------- properties
  beginChanges(): void {
    this.changeDepth++;
  }
  commitChanges(): void {
    this.changeDepth = Math.max(0, this.changeDepth - 1);
    this.updateProperties();
  }

  /** GamePlayer.UpdateProperties (GamePlayer.cs:5352): 38 to self, 67 to self and the room. */
  updateProperties(): void {
    if (this.changeDepth > 0) {
      this.propsPending = true;
      return;
    }
    this.propsPending = false;
    // NOTE: `pub` is built once in this.clientKind's layout and broadcast as-is to the whole room (M1 scope:
    // a lobby of one client version). A room mixing 4.1 and 6600 viewers would need one 67 build per viewer
    // client — not needed until salas/M2 support mixed clients (docs/plan/MIGRACAO-6600.md).
    this.send(Out.privateInfo(this.info, this.medal, this.clientKind));
    const pub = Out.publicPlayer(this.info, this.match, this.clientKind);
    this.send(pub);
    this.currentRoom?.sendToAll(pub, this);
  }

  /**
   * PlayerEquipInventory.UpdatePlayerProperties (PlayerEquipInventory.cs:200): attributes, hp and FightPower via
   * game/stats.ts (items, compose, strengthen, gems, potential, gold plating, training, cards, pet, suits, totem),
   * style/colors/skin string, then 38/67 property packets.
   */
  updatePlayerProperties(): void {
    this.recalcStats();
    if (this.showPP) this.send(Out.playerProperty(this.id));
    this.updateProperties();
  }

  /** The computation half of UpdatePlayerProperties (no packets): used before the login burst too. */
  recalcStats(): void {
    const styleIndex = [1, 2, 3, 4, 5, 6, 11, 13, 14, 15, 16, 17, 18, 19, 20];
    const s0 = this.equipBag.getItemAt(0);
    let style = s0 ? `${s0.TemplateID}|${s0.Pic}` : "";
    let color = s0 ? s0.Color : "";
    const skin = this.equipBag.getItemAt(5)?.Skin ?? "";
    for (const idx of styleIndex) {
      style += ",";
      color += ",";
      const it = this.equipBag.getItemAt(idx);
      if (it) {
        style += `${it.TemplateID}|${it.Pic}`;
        color += it.Color;
      }
    }
    const c = this.info;
    const equip: (ItemInfo | null)[] = [];
    for (let i = 0; i < 31; i++) equip.push(this.equipBag.getItemAt(i));
    const r = computeStats({
      equip, grade: c.Grade, levelBlood: this.levelBlood(c.Grade), necklaceExpAdd: c.necklaceExpAdd ?? 0, totemId: c.totemId ?? 0,
      texp: c.Texp ?? { attTexpExp: 0, defTexpExp: 0, spdTexpExp: 0, lukTexpExp: 0, hpTexpExp: 0 },
      cards: this.cardBag.equipped().length ? this.cardBag.equipped() : this.cards, pet: this.petBag.equipped() ?? this.pet, evolutionGrade: c.evolutionGrade ?? 0,
      petEquips: this.petBag.equipped() ? getPetEquips(this.petBag.equipped()!) : [], eat: this.petBag.eat,
      // PlayerAvatarCollection.GetAvatarPropertyActived (ver getAvatarCollectionBonus em stats.ts): todo set
      // que o jogador possui entra, o corte half/full é feito lá dentro por itemCount vs CountClothGroupWithID.
      avatarCollect: this.avatarCollect.map((a) => ({ AvatarID: a.AvatarID, itemCount: a.items.length })),
    }, this.statTables);
    c.Attack = r.attack; c.Defence = r.defence; c.Agility = r.agility; c.Luck = r.luck; c.hp = r.hp;
    c.FightPower = r.fightPower;
    this.baseAttack = r.baseAttack;
    this.baseDefence = r.baseDefence;
    c.Nimbus = userNimbus(equip); // GetUserNimbus (strengthen / gilded aura tiers)
    c.Style = style; c.Colors = color; c.Skin = skin;
  }

  // -------------------------------------------------------------------- currencies (GamePlayer Add*/Remove*)
  /** Level-up hook (GamePlayer.AddGP → AcademyMgr.UpdateAwardApp when masterID != 0). */
  onGradeUp?: (oldGrade: number) => void;
  // Moedas/GP são `int` no C# (Sys_Users_Detail integer): soma presa em 2^31-1, senão o save estoura e falha.
  /** GamePlayer.AddGP: level-up recomputes HP, refreshes grade quests; the client re-requests quests on Grade change. */
  addGP(v: number, useMultiple = true): void {
    if (v <= 0) return;
    // GamePlayer.AddGP (GamePlayer.cs:1357): GPAddPlus (type 13 GP buff, e.g. x2 exp card) multiplies; AddGP(gp, false) does not.
    if (useMultiple && this.gpAddPlus > 0) v = Math.trunc(v * this.gpAddPlus);
    this.info.GP = Math.min(I32_MAX, this.info.GP + v);
    const g = this.gradeForGp(this.info.GP);
    if (g && g > this.info.Grade) {
      const old = this.info.Grade;
      this.info.Grade = g;
      this.updatePlayerProperties();
      this.questInv?.refresh();
      this.onGradeUp?.(old);
    } else this.updateProperties();
  }
  /** GamePlayer.GPAddPlus: product of the active GP-multiplier buffs (type 13). */
  get gpAddPlus(): number {
    let m = 1;
    const now = Date.now();
    for (const b of this.buffs) if (b.Type === 13 && b.IsExist && b.BeginDate.getTime() + b.ValidDate * 60_000 > now) m *= b.Value || 1;
    return m;
  }
  addMoney(v: number): void { if (v > 0) { this.info.Money = Math.min(I32_MAX, this.info.Money + v); this.updateProperties(); } }
  addOffer(v: number): void { if (v > 0) { this.info.Offer = Math.min(I32_MAX, this.info.Offer + v); this.updateProperties(); } }
  addHonor(v: number): void { if (v > 0) { this.info.myHonor = Math.min(I32_MAX, this.info.myHonor + v); this.updateProperties(); } }
  /** GamePlayer.RemovemyHonor (GamePlayer.cs:6037): only spends when `v` fits in the current balance. */
  removeMyHonor(v: number): boolean {
    if (v > 0 && v <= this.info.myHonor) { this.info.myHonor -= v; this.updateProperties(); return true; }
    return false;
  }
  /** GamePlayer.AddMaxHonor (GamePlayer.cs:6048): daily honor-purchase counter (HONOR_UP_COUNT type 2). */
  addMaxBuyHonor(v: number): void { if (v > 0) { this.info.MaxBuyHonor += v; this.updateProperties(); } }
  /**
   * GamePlayer.AddTotem (GamePlayer.cs:6013): sets (not increments) totemId; a lower value is ignored. Only calls
   * OnPropertiesChanged (= updateProperties, no stat recompute) — the handler itself calls EquipBag.UpdatePlayerProperties()
   * right after (OpenOneTotemHandler.cs:57) to actually pick up the new totem's attribute bonus.
   */
  addTotem(id: number): void { if (id > 0) { this.info.totemId = id; this.updateProperties(); } }
  addHardCurrency(v: number): void { if (v > 0) { this.info.hardCurrency = Math.min(I32_MAX, this.info.hardCurrency + v); this.updateProperties(); } }
  /** GamePlayer.AddMedal (GamePlayer.cs:3961): medals are item 11408 in the PropBag. */
  addMedal(v: number, find: (id: number) => ItemTemplate | undefined): void {
    if (v <= 0) return;
    const it = this.propBag.getItemByTemplateID(0, 11408);
    if (it && this.propBag.addCountToStack(it, v)) { this.updateProperties(); return; }
    const t = find(11408);
    if (t) this.propBag.addTemplate(ItemInfo.createFromTemplate(t, v, 104), v);
    this.updateProperties();
  }
  addGold(v: number): void { if (v > 0) { this.info.Gold = Math.min(I32_MAX, this.info.Gold + v); this.updateProperties(); } }
  removeGold(v: number): void { if (v > 0) { this.info.Gold -= v; this.updateProperties(); } }
  addGiftToken(v: number): void { if (v > 0) { this.info.GiftToken = Math.min(I32_MAX, this.info.GiftToken + v); this.updateProperties(); } }
  removeGiftToken(v: number): void { if (v > 0) { this.info.GiftToken -= v; this.updateProperties(); } }
  removeOffer(v: number): void { if (v > 0) { this.info.Offer -= v; this.updateProperties(); } }
  removePetScore(v: number): void { if (v > 0) { this.info.petScore -= v; this.updateProperties(); } }
  /** GamePlayer.AddPetScore (GamePlayer.cs:1626). */
  addPetScore(v: number): void { if (v > 0) { this.info.petScore += v; this.updateProperties(); } }
  removeScore(v: number): void { if (v > 0) { this.info.Score -= v; this.updateProperties(); } }
  /** GamePlayer.AddScore (GamePlayer.cs:1692): soma direto, sem clamp de I32_MAX (igual ao original —
   *  também usado pelo minigame das Termas, `handlers/minigame-termas/capturar.ts`). */
  addScore(v: number): void { if (v > 0) { this.info.Score += v; this.updateProperties(); } }
  removeDamageScores(v: number): void { if (v > 0) { this.info.damageScores -= v; this.updateProperties(); } }
  /** GamePlayer.RemoveMoney: bound money (MoneyLock) first, then Money. */
  removeMoney(v: number): void {
    if (v <= 0) return;
    const fromLock = Math.min(this.info.MoneyLock, v);
    this.info.MoneyLock -= fromLock;
    this.info.Money -= v - fromLock;
    this.updateProperties();
  }
  removeMedal(count: number): void {
    this.propBag.removeTemplate(11408, count);
  }

  /** GamePlayer.GetTemplateCount (GamePlayer.cs:1823). */
  getTemplateCount(templateId: number, find: (id: number) => ItemTemplate | undefined): number {
    const t = find(templateId);
    if (!t) return 0;
    return this.getItemInventory(t)?.getItemCount(templateId) ?? 0;
  }

  /** GamePlayer.RemoveTemplateInShop (GamePlayer.cs:1810). */
  removeTemplateInShop(templateId: number, count: number, find: (id: number) => ItemTemplate | undefined): boolean {
    const t = find(templateId);
    if (!t) return false;
    return this.getItemInventory(t)?.removeTemplate(templateId, count) ?? false;
  }

  /** GamePlayer.AddTemplate(cloneItem, bagType, count, backToMail) (GamePlayer.cs:1789). */
  addTemplateToBag(item: ItemInfo, bagType: number, count: number): boolean {
    const inv = this.getInventory(bagType);
    if (!inv || isSpecialTemplate(item.template)) return false;
    return inv.addTemplate(item, count);
  }

  /** PetInventory.UpdateChangedPlaces → 68/1 with the changed slots (`all` = every slot, login). */
  flushPets(all = false): void {
    const places = all ? this.petBag.pets.map((_, i) => i) : this.petBag.takeChanged();
    if (all) this.petBag.changed.clear();
    if (!places.length) return;
    const slots = places.map((place) => {
      const pet = this.petBag.getPetAt(place);
      return { place, pet: pet ? { ...pet, petEquips: getPetEquips(pet), PetHappyStarReduce: (v: number) => reduceProp(pet, v) } : null };
    });
    this.send(Out.updateUserPet(this.id, this.zoneId, slots, this.petBag.eat));
  }
  /** CardInventory.UpdateChangedPlaces → 216 with the changed slots (every occupied slot at login). */
  flushCards(all = false): void {
    const places = all ? this.cardBag.cards.map((_, i) => i).filter((i) => this.cardBag.cards[i]) : this.cardBag.takeChanged();
    if (all) this.cardBag.changed.clear();
    if (!places.length) return;
    this.send(Out.cardData(this.id, places.map((place) => ({ place, card: this.cardBag.getItemAt(place) }))));
  }

  /** PlayerAvatarCollection.GetAvatarCollectWithAvatarID (PlayerAvatarCollection.cs:91). */
  getAvatarCollect(avatarId: number): UserAvatarCollectionRow | null {
    return this.avatarCollect.find((a) => a.AvatarID === avatarId) ?? null;
  }
  /** AbstractPacketLib.SendAvatarCollect (:2552): the full set dump, sent at login and after any change. */
  flushAvatarCollect(): void {
    this.send(Out.avatarCollect(this.avatarCollect));
  }

  isBlackFriend(id: number): boolean {
    return this.friends.get(id) === 1;
  }

  // -------------------------------------------------------------------- persistence
  private saveChain: Promise<void> = Promise.resolve();

  /** Autosave, logout e handlers podem pedir gravação ao mesmo tempo. Serializar evita inserir duas vezes
   * o mesmo item novo antes de a primeira gravação devolver ItemID (GamePlayer.cs:4450, SaveIntoDatabase).
   * Uma falha continua visível ao chamador, mas não bloqueia a próxima tentativa.
   */
  saveIntoDatabase(db: Database): Promise<void> {
    const pending = this.saveChain.then(() => this.persistIntoDatabase(db));
    this.saveChain = pending.catch(() => {});
    return pending;
  }

  /**
   * GamePlayer.SaveIntoDatabase (GamePlayer.cs:4450): player info + every saved bag's dirty/removed items.
   * Cada parte é independente: antes, um erro no UPDATE do Sys_Users_Detail (ex.: valor fora de int32) abortava o
   * resto e itens/mascotes/missões nunca eram gravados. Agora cada passo roda mesmo se outro falhar; o 1º erro é
   * relançado no fim pra quem chamou logar.
   * Como lê esse código (cada variável): `errs` erros dos passos; `step` roda um passo e guarda o erro; `bag` bolsa
   * salva; `it` item sujo.
   */
  private async persistIntoDatabase(db: Database): Promise<void> {
    const errs: unknown[] = [];
    const step = async (name: string, fn: () => Promise<void>) => {
      try { await fn(); return true; } catch (e) { console.error(`[save] user ${this.id} ${name} failed:`, (e as Error)?.message ?? e); errs.push(e); return false; }
    };
    await step("info", () => savePlayerInfo(db, this.info, this.match));
    for (const bag of this.allBags()) {
      if (!bag.saveToDb) continue;
      // Grava TODO item da bolsa (não só os marcados isDirty): vários handlers (transferência, composição, fusão...)
      // mudam campos do item direto sem marcar sujo e o jogador perdia isso ao sair. ~150 UPDATEs por save, ok.
      const all = new Set<ItemInfo>([...bag.getItems(), ...bag.dirtyItems()]);
      const saved = new Set<ItemInfo>();
      for (const it of all) {
        it.UserID = it.IsExist ? this.id : it.UserID;
        if (await step(`item ${it.ItemID ?? "?"}`, () => saveItem(db, it))) saved.add(it);
      }
      // Preserva remoções que falharam ou ocorreram enquanto o banco respondia.
      for (let i = bag.removed.length - 1; i >= 0; i--) {
        const it = bag.removed[i]!;
        if (saved.has(it) && !it.isDirty) bag.removed.splice(i, 1);
      }
    }
    if (this.questInv) {
      const q = this.questInv.takeDirty();
      if (!(await step("quests", () => saveQuests(db, q)))) this.questInv.restoreDirty(q);
    }
    const pets = [...this.petBag.getPets(), ...this.petBag.removed];
    await step("pets", () => savePets(db, pets));
    for (let i = this.petBag.removed.length - 1; i >= 0; i--) {
      const pet = this.petBag.removed[i]!;
      if (pets.includes(pet) && !pet.dirty) this.petBag.removed.splice(i, 1);
    }
    if (this.petBag.eatDirty) await step("eatPets", async () => { await saveEatPets(db, this.id, this.petBag.eat); this.petBag.eatDirty = false; });
    await step("cards", () => saveCards(db, this.cardBag.all(), this.cardBag.removed));
    await step("avatarCollect", () => saveAvatarCollection(db, this.avatarCollect));
    if (this.buffs.length) await step("buffs", () => saveBuffs(db, this.buffs));
    await step("records", () => saveRecords(db, this));
    if (errs.length) throw errs[0];
  }
}
