/**
 * Aba no jogo: sem tela própria — infraestrutura compartilhada do minigame "Đại chiến Hút Gà" (captura de
 * bichinhos "bogu") dentro do menu Especial do hall. É um mundo à parte, sem pacote de chat e sem ligação
 * com a sala de fonte termal relax de `handlers/termas/` (mesmo código de pacote 166 LITTLEGAME_COMMAND,
 * tela e regras totalmente diferentes) — `Bogu` (bichinho), `LittleGameMgr` (lista de bichinhos/jogadores
 * em memória, timers de nascimento/passeio/escape, montagem dos pacotes de saída).
 * C#: `LittleGame/LittleGameWorldMgr.cs`, `LittleGame/Objects/Bogu.cs`, `LittleGame/LittleGamePacketsOut.cs`,
 * `LittleGame/LittleGameConfig.cs`, `LittleGame/MapReader.cs`, `GamePlayer.cs:1179` (defaults X=275,Y=30).
 *
 * Diferença de design vs o C#: lá, `Player.LittleGameInfo.Actions` é uma fila (`TriggeredQueue`) que só
 * nunca guarda mais que 1 item de verdade ("livingInhale" persiste até ser cancelado; "livingUnInhale" é
 * sempre desenfileirado na hora, é só um pulso de broadcast). Aqui isso virou direto um booleano
 * `inhaling` por jogador (mesmo efeito observável, sem precisar portar a fila genérica).
 */
import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PacketOut } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";

// -------------------------------------------------------------------------------------------- mapa (map.data)
/** `apps/game/data/littlegame-map.data`: cópia byte-a-byte de `Road.Service/Datas/LittleGame/map.data`
 *  (comprimido com zlib, igual `Marshal.Uncompress`/`MapReader.cs`). Guarda só os pontos andáveis — o
 *  resto do grid (pathing) é 100% client-side (AS3 `AStar.as`), o servidor só sorteia posições dentro
 *  dos pontos válidos. */
const MAP_DATA_PATH = resolve(dirname(fileURLToPath(import.meta.url)), "../../../data/littlegame-map.data");
let mapPointsCache: [number, number][] | null = null;

/** `MapReader`/`LittleGameWorldMgr.InitializeMap`: int width, int height, depois width*height pares de
 *  byte (o 1º é "andável"? vira ponto; o 2º é sempre descartado — o C# original comentou o `Cell[i,j]=...`
 *  e nunca usa a matriz, só a lista `points`, então aqui nem se guarda a matriz). */
function loadMapPoints(): [number, number][] {
  if (mapPointsCache) return mapPointsCache;
  const raw = readFileSync(MAP_DATA_PATH);
  const data = inflateSync(raw);
  let off = 0;
  const width = data.readInt32LE(off); off += 4;
  const height = data.readInt32LE(off); off += 4;
  const points: [number, number][] = [];
  for (let i = 0; i < width; i++) {
    for (let j = 0; j < height; j++) {
      const cell = data.readUInt8(off); off += 1;
      if (cell === 1) points.push([i, j]);
      off += 1; // 2º byte do par: descartado (igual ao original)
    }
  }
  mapPointsCache = points;
  return points;
}

/** `Random.Next(min, max)` do .NET: `max` é EXCLUSIVO. Preservado de propósito — algumas chamadas do
 *  original usam essa faixa "estreita demais" (ver `boguGenerator`/`pickMapPoint` abaixo) e isso muda o
 *  resultado observável (ex.: bogu8/bogu3 nunca nascem). Comportamento do C#, mantido tal e qual. */
function randRange(min: number, maxExclusive: number): number {
  return min + Math.floor(Math.random() * Math.max(1, maxExclusive - min));
}
function randMax(maxExclusive: number): number {
  return Math.floor(Math.random() * Math.max(1, maxExclusive));
}
/** `LittleGameWorldMgr.BoguGenerator`/`Bogu.RandomMove`: `Map.points[NextStatic(points.Count - 1)]` — o
 *  `-1` faz o Random.Next ficar `[0, points.Count-2]`, ou seja, o ÚLTIMO ponto da lista nunca é sorteado.
 *  Bug inofensivo do original (sobra 1 ponto de ~55 mil), preservado de propósito. */
function pickMapPoint(points: [number, number][]): [number, number] {
  return points[randMax(points.length - 1)]!;
}

// -------------------------------------------------------------------------------------------- config
export interface LittleGameConfig {
  smallScore: number; smallHp: number;
  mediumScore: number; mediumHp: number;
  bigScore: number; bigHp: number; bigCatchers: number;
  hugeScore: number; hugeHp: number; hugeCatchers: number;
  maxBoguCount: number;
}
const DEFAULT_BOGU_CONFIG = "200,1,1|100,4,1|5000,80,3|10000,125,5";

/** `LittleGameWorldMgr.ReloadConfig`: `LittleGameBoguConfig` (config de servidor, 1 string com 4 grupos
 *  separados por `|`: pequeno/médio/grande/gigante) + `LittleGameMaxBoguCount`. */
function loadConfig(ctx: ServerContext): LittleGameConfig {
  const raw = ctx.templates.serverConfig.get("LittleGameBoguConfig") || DEFAULT_BOGU_CONFIG;
  const groups = raw.split("|").map((g) => g.split(",").map((n) => Number(n) || 0));
  const [small, medium, big, huge] = groups;
  return {
    smallScore: small?.[0] ?? 200, smallHp: small?.[1] ?? 1,
    mediumScore: medium?.[0] ?? 100, mediumHp: medium?.[1] ?? 4,
    bigScore: big?.[0] ?? 5000, bigHp: big?.[1] ?? 80, bigCatchers: big?.[2] ?? 3,
    hugeScore: huge?.[0] ?? 10000, hugeHp: huge?.[1] ?? 125, hugeCatchers: huge?.[2] ?? 5,
    maxBoguCount: ctx.templates.cfgInt("LittleGameMaxBoguCount", 20),
  };
}

// -------------------------------------------------------------------------------------------- Bogu
export type BoguAction = "" | "livingInhale" | "livingUnInhale" | "livingDie";

/** `LittleGame/Objects/Bogu.cs`: um bichinho sorteado no mapa. `size` 0=pequeno 1=médio 2=grande 3=gigante
 *  (nomes dos modelos batem com `GameScene`/`CharacterFactory` do cliente: bogu1-3 pequenos, bogu4/bogu8
 *  médios, bogu6 grande, bogu7 gigante). */
export class Bogu {
  x: number; y: number;
  isBack = false;
  direction = "";
  caught = false;
  action: BoguAction = "";
  readonly catchers: GamePlayer[] = [];
  constructor(
    readonly id: number,
    x: number, y: number,
    readonly model: string,
    readonly size: number,
    readonly score: number,
    readonly hp: number,
    readonly maxCatchers: number,
  ) {
    this.x = x; this.y = y;
  }
}

/** `Bogu` ctor (size→Score/HP/MaxCatchers): pequeno e médio têm `MaxCatchers=1` (o campo nem é setado no
 *  C# pros tamanhos 0/1, e o default da classe é `1`). */
function newBogu(cfg: LittleGameConfig, id: number, x: number, y: number, model: string, size: number): Bogu {
  switch (size) {
    case 0: return new Bogu(id, x, y, model, size, cfg.smallScore, cfg.smallHp, 1);
    case 1: return new Bogu(id, x, y, model, size, cfg.mediumScore, cfg.mediumHp, 1);
    case 2: return new Bogu(id, x, y, model, size, cfg.bigScore, cfg.bigHp, cfg.bigCatchers);
    default: return new Bogu(id, x, y, model, size, cfg.hugeScore, cfg.hugeHp, cfg.hugeCatchers);
  }
}

// -------------------------------------------------------------------------------------------- estado do jogador
/** `GamePlayer.LittleGameInfo` (default `X=275,Y=30`, `GamePlayer.cs:1179`). */
export interface LGPlayerState {
  x: number; y: number;
  isBack: boolean;
  direction: string;
  /** Substitui a fila `Actions` do original (ver cabeçalho do arquivo): só existe "inalando" ou não. */
  inhaling: boolean;
  bogu: Bogu | null;
}
const DEFAULT_STATE = { x: 275, y: 30, isBack: false, direction: "", inhaling: false, bogu: null } as const;

// -------------------------------------------------------------------------------------------- mgr
const MONSTERS = "bogu1,bogu2,bogu3,bogu4,bogu5,bogu6,bogu7,bogu8"; // LittleGamePacketsOut.SendEnterWorld (literal)
const MUSIC_ID = "2001"; // idem — campo "music" da Scenario do cliente, não é id de mapa
/** `EnterWorld.cs`: `Player.PlayerCharacter.Grade < 20` bloqueia a entrada. */
export const MIN_GRADE = 20;

export class LittleGameMgr {
  /** `LittleGameWorldMgr.ScenariObjects`: jogadores (chave = id do personagem) + bichinhos (chave =
   *  1000000000 + sequencial) no mesmo mapa. */
  readonly scenario = new Map<number, GamePlayer | Bogu>();
  readonly state = new WeakMap<GamePlayer, LGPlayerState>();
  readonly cfg: LittleGameConfig;
  private readonly points: [number, number][];
  /** `LittleGameWorldMgr.IsOpen`. Aberto desde a criação do mgr — ainda não existe agendador por horário
   *  (`GameProperties.LittleGameStartHourse=7`/`LittleGameTimeSpendingHours=1`) nesta porta; ver
   *  `research/qa/pendencias-sem-fonte.md`. `open()`/`close()` seguem disponíveis pra quando alguém ligar
   *  o controle por horário (ou um comando de GM). */
  isOpen = false;
  private playerCount = 0;
  private boguCount = 0;
  private boguCount2 = 0;
  /** `LittleGameWorldMgr._SpawTimer`: regera os bichinhos a cada minuto. (`_ScanTimer` do original só
   *  loga estatísticas de debug a cada minuto — sem efeito de jogo, não portado.) */
  private spawnTimer: NodeJS.Timeout | null = null;
  private readonly moveTimers = new Map<number, NodeJS.Timeout>();
  private readonly escapeTimers = new Map<number, NodeJS.Timeout>();

  constructor(ctx: ServerContext) {
    this.cfg = loadConfig(ctx);
    this.points = loadMapPoints();
    this.open();
  }

  st(p: GamePlayer): LGPlayerState {
    let s = this.state.get(p);
    if (!s) { s = { ...DEFAULT_STATE }; this.state.set(p, s); }
    return s;
  }

  // ------------------------------------------------------------------------------ abrir/fechar (GM/agendador)
  /** `LittleGameWorldMgr.OpenLittleGameSetup`. */
  open(): void {
    this.boguCount2 = 0; this.boguCount = 0; this.playerCount = 0;
    this.boguGenerator();
    this.spawnTimer = setInterval(() => this.boguGenerator(), 60_000);
    this.spawnTimer.unref?.();
    this.isOpen = true;
  }
  /** `LittleGameWorldMgr.CloseLittleGame`: remove todo mundo e todo bichinho, para os timers. */
  close(): void {
    if (this.spawnTimer) clearInterval(this.spawnTimer);
    this.spawnTimer = null;
    for (const v of [...this.scenario.values()]) {
      if (v instanceof Bogu) this.removeBogu(v); else this.removePlayer(v);
    }
    this.isOpen = false;
  }

  // ------------------------------------------------------------------------------ bichinhos
  /** `LittleGameWorldMgr.BoguGenerator`: se já tem mais que o máximo, não faz nada; senão apaga tudo e
   *  sorteia `maxBoguCount` bichinhos novos do zero (não é incremental). */
  private boguGenerator(): void {
    if (this.boguCount > this.cfg.maxBoguCount) return;
    this.removeAllBogu();
    for (let i = 0; i < this.cfg.maxBoguCount; i++) {
      const rand = randMax(1000); // [0,999]
      const [x, y] = pickMapPoint(this.points);
      const id = 1_000_000_000 + this.boguCount2;
      let bogu: Bogu;
      if (rand > 900 && rand < 920) bogu = newBogu(this.cfg, id, x, y, "bogu7", 3); // gigante, ~2%
      else if (rand < 400) bogu = newBogu(this.cfg, id, x, y, "bogu" + randRange(1, 3), 0); // pequeno — NextStatic(1,3) só dá 1 ou 2: "bogu3" nunca nasce (bug do original preservado)
      else if (rand > 400 && rand < 900) {
        const model = ["bogu4", "bogu4", "bogu8"][randRange(0, 2)]!; // NextStatic(0,2) só dá 0 ou 1: "bogu8" nunca nasce (idem)
        bogu = newBogu(this.cfg, id, x, y, model, 1); // médio
      } else bogu = newBogu(this.cfg, id, x, y, "bogu6", 2); // grande
      this.scenario.set(id, bogu);
      this.send(this.addBoguPacket(bogu));
      this.startBoguMoveTimer(bogu);
      this.boguCount++; this.boguCount2++;
    }
  }
  private removeAllBogu(): void {
    for (const v of [...this.scenario.values()]) if (v instanceof Bogu) this.removeBogu(v);
    this.boguCount = 0;
  }
  /** `Bogu` ctor: timer de passeio aleatório (`m_moverTimer`), intervalos variam por tamanho. */
  private startBoguMoveTimer(bogu: Bogu): void {
    const due = 3000 + randRange(100, 500);
    const period = bogu.size === 0 ? 4555 + randRange(1000, 1500)
      : bogu.size === 1 ? 4555 + randRange(2500, 3500)
      : bogu.size === 2 ? 4555 + randRange(4500, 5500)
      : 4555 + randRange(6500, 8500);
    const fire = () => this.randomMoveBogu(bogu);
    const t = setTimeout(() => {
      fire();
      const iv = setInterval(fire, period);
      iv.unref?.();
      this.moveTimers.set(bogu.id, iv);
    }, due);
    t.unref?.();
    this.moveTimers.set(bogu.id, t);
  }
  private stopBoguTimers(bogu: Bogu): void {
    const t = this.moveTimers.get(bogu.id);
    if (t) { clearTimeout(t); clearInterval(t); this.moveTimers.delete(bogu.id); }
    const e = this.escapeTimers.get(bogu.id);
    if (e) { clearTimeout(e); this.escapeTimers.delete(bogu.id); }
  }
  /** `Bogu.RandomMove`: só anda se tiver gente no mundo e ele não estiver sendo capturado. */
  private randomMoveBogu(bogu: Bogu): void {
    if (this.playerCount !== 0 && !bogu.caught) {
      const [x, y] = pickMapPoint(this.points);
      bogu.x = x; bogu.y = y;
      this.send(this.moveBoguPacket(bogu));
    }
  }
  removeBogu(bogu: Bogu): void {
    if (!this.scenario.has(bogu.id)) return;
    this.send(this.removeLivingPacket(bogu.id));
    this.scenario.delete(bogu.id);
    this.stopBoguTimers(bogu);
    this.boguCount--;
  }
  /** `Bogu.Сaught` (setter): ao capturar, dispara a ação "livingInhale"; pequeno/médio ganham um timer de
   *  10s pra escapar se não forem reportados antes (`Escaping`). */
  setCaught(bogu: Bogu, value: boolean): void {
    bogu.caught = value;
    if (value) {
      this.boguAction(bogu, "livingInhale");
      if (bogu.size < 2) {
        const e = this.escapeTimers.get(bogu.id);
        if (e) clearTimeout(e);
        const t = setTimeout(() => this.escaping(bogu), 10_000);
        t.unref?.();
        this.escapeTimers.set(bogu.id, t);
      }
    }
  }
  /** `Bogu.Escaping`: 10s sem o jogador reportar a pontuação final — solta o bichinho de volta ao
   *  passeio aleatório e libera quem estava "inalando" ele. */
  private escaping(bogu: Bogu): void {
    bogu.caught = false;
    this.boguAction(bogu, "livingUnInhale");
    for (const catcher of bogu.catchers) this.releaseInhale(catcher);
    bogu.catchers.length = 0;
    this.randomMoveBogu(bogu);
    bogu.action = ""; // reset silencioso (sem broadcast — igual ao `Action = ""` do original)
    this.escapeTimers.delete(bogu.id);
  }

  // ------------------------------------------------------------------------------ jogadores
  inGame(p: GamePlayer): boolean {
    return this.scenario.get(p.id) === p;
  }
  /** `LittleGameWorldMgr.AddPlayer`. */
  addPlayer(p: GamePlayer): void {
    this.scenario.set(p.id, p);
    this.playerCount++;
    p.send(this.enterWorldPacket());
    this.send(this.addPlayerPacket(p), p);
  }
  /** `LittleGameWorldMgr.RemovePlayer`: some do mundo e volta pra posição padrão (275,30). */
  removePlayer(p: GamePlayer): void {
    this.send(this.removeLivingPacket(p.id));
    this.scenario.delete(p.id);
    this.state.set(p, { ...DEFAULT_STATE });
    this.playerCount--;
  }
  /** Ação persistente ("inalando") ou pulso único ("parou de inalar") do jogador — ver cabeçalho do
   *  arquivo sobre a troca da fila `Actions` por este booleano. */
  playerAction(p: GamePlayer, action: "livingInhale" | "livingUnInhale"): void {
    const s = this.st(p);
    s.inhaling = action === "livingInhale";
    this.send(this.playerActionPacket(p, action));
  }
  /** Fecha o ciclo de captura pro jogador: limpa o vínculo com o bichinho e manda "parou de inalar". */
  releaseInhale(p: GamePlayer): void {
    this.st(p).bogu = null;
    this.playerAction(p, "livingUnInhale");
  }

  // ------------------------------------------------------------------------------ envio (LittleGamePacketsOut)
  private send(pkt: PacketOut, except?: GamePlayer): void {
    for (const v of this.scenario.values()) if (!(v instanceof Bogu) && v !== except) v.send(pkt);
  }
  /** `SendEnterWorld`. */
  enterWorldPacket(): PacketOut {
    const pk = new PacketOut(166);
    pk.writeByte(2); pk.writeInt(1); pk.writeInt(1); pk.writeString(MONSTERS); pk.writeString(MUSIC_ID);
    return pk;
  }
  /** `SendAddPlayerToAll`. */
  private addPlayerPacket(p: GamePlayer): PacketOut {
    const s = this.st(p); const c = p.info;
    const pk = new PacketOut(166, p.id);
    pk.writeByte(16);
    pk.writeInt(p.id); pk.writeInt(s.x); pk.writeInt(s.y); pk.writeInt(1);
    pk.writeInt(p.id); pk.writeInt(c.Grade); pk.writeInt(c.Repute); pk.writeString(c.NickName ?? "");
    pk.writeByte(c.typeVIP ?? 0); pk.writeInt(c.VIPLevel ?? 0); pk.writeBoolean(!!c.Sex);
    pk.writeString(c.Style ?? ""); pk.writeString(c.Colors ?? ""); pk.writeString(c.Skin ?? "");
    pk.writeInt(c.Hide); pk.writeInt(c.FightPower); pk.writeInt(c.Win); pk.writeInt(c.Total);
    pk.writeBoolean(false); pk.writeInt(0);
    return pk;
  }
  /** `SendAddBoguToAll`. */
  private addBoguPacket(b: Bogu): PacketOut {
    const pk = new PacketOut(166);
    pk.writeByte(16);
    pk.writeInt(b.id); pk.writeInt(b.x); pk.writeInt(b.y); pk.writeInt(2);
    pk.writeString(b.model); pk.writeString(b.model); pk.writeBoolean(false); pk.writeInt(0);
    return pk;
  }
  /** `SendRemoveLivingToAll` (jogador ou bichinho — mesmo formato, só o id muda). */
  private removeLivingPacket(id: number): PacketOut {
    const pk = new PacketOut(166);
    pk.writeByte(17); pk.writeInt(id);
    return pk;
  }
  /** `SendMoveToAll(GamePlayer)`. */
  movePlayerPacket(p: GamePlayer): PacketOut {
    const s = this.st(p);
    const pk = new PacketOut(166);
    pk.writeByte(32); pk.writeInt(p.id); pk.writeInt(s.x); pk.writeInt(s.y);
    return pk;
  }
  /** `SendMoveToAll(Bogu)`. */
  private moveBoguPacket(b: Bogu): PacketOut {
    const pk = new PacketOut(166);
    pk.writeByte(32); pk.writeInt(b.id); pk.writeInt(b.x); pk.writeInt(b.y);
    return pk;
  }
  /** Transmite um pacote de movimento, igual aos `send()` acima (exposto pro handler de `mover.ts`). */
  broadcastMove(p: GamePlayer): void { this.send(this.movePlayerPacket(p), p); }
  broadcastBoguMove(b: Bogu): void { this.send(this.moveBoguPacket(b)); }

  /** `SendActionToAll(GamePlayer, action)`: "0" (não "10" — esse só aparece no snapshot de `SendLoadComplete`). */
  private playerActionPacket(p: GamePlayer, action: "livingInhale" | "livingUnInhale"): PacketOut {
    const s = this.st(p);
    const pk = new PacketOut(166);
    pk.writeByte(96);
    if (action === "livingInhale") {
      pk.writeString("livingInhale"); pk.writeInt(p.id);
      pk.writeString(s.isBack ? "backInhaleSmall" : "inhaleSmall"); pk.writeString(s.direction);
      pk.writeInt(0); pk.writeInt(s.x); pk.writeInt(s.y);
    } else {
      pk.writeString("livingUnInhale"); pk.writeInt(p.id); pk.writeString("stand"); pk.writeString(s.direction);
    }
    return pk;
  }
  /** `SendActionToAll(Bogu, action)`. */
  private boguActionPacket(b: Bogu, action: BoguAction): PacketOut {
    const pk = new PacketOut(166);
    pk.writeByte(96);
    if (action === "livingInhale") {
      pk.writeString("livingInhale"); pk.writeInt(b.id);
      pk.writeString(!b.isBack ? "inhaled" : (b.size === 0 ? "backInhaled" : "inhaled"));
      pk.writeString(b.direction); pk.writeInt(0); pk.writeInt(b.x); pk.writeInt(b.y);
    } else if (action === "livingUnInhale") {
      pk.writeString("livingUnInhale"); pk.writeInt(b.id);
      pk.writeString(!b.caught ? "stand" : (!b.isBack ? "die" : (b.size === 0 ? "backDie" : "die")));
      pk.writeString(b.direction);
    } else {
      pk.writeString("livingDie"); pk.writeInt(b.id);
    }
    return pk;
  }
  boguAction(b: Bogu, action: "livingInhale" | "livingUnInhale" | "livingDie"): void {
    b.action = action;
    this.send(this.boguActionPacket(b, action));
  }

  /** `SendAddObject` — vai só pro jogador que clicou (não é broadcast). */
  sendAddObject(target: GamePlayer, bogu: Bogu, kind: "normalbogu" | "bigbogu" | "bogugiveup"): void {
    const pk = new PacketOut(166);
    pk.writeByte(64);
    pk.writeString(kind);
    if (kind === "bogugiveup") {
      pk.writeInt(99); pk.writeInt(bogu.id); pk.writeInt(bogu.maxCatchers);
    } else {
      pk.writeInt(1); pk.writeInt(target.id); pk.writeInt(bogu.id);
      pk.writeInt(bogu.hp); pk.writeInt(bogu.score); pk.writeInt(Math.trunc(bogu.score / bogu.hp));
      pk.writeInt(10); pk.writeInt(bogu.catchers.length);
      for (const c of bogu.catchers) pk.writeInt(c.id);
    }
    target.send(pk);
  }

  /** `SendLoadComplete` (`3 GAME_START`): despeja todo mundo + todo bichinho pro jogador que acabou de
   *  carregar a cena. */
  loadCompletePacket(p: GamePlayer): PacketOut {
    const pk = new PacketOut(166, p.id);
    pk.writeByte(3);
    pk.writeInt(this.scenario.size);
    for (const v of this.scenario.values()) {
      if (v instanceof Bogu) {
        const b = v;
        pk.writeInt(b.id); pk.writeInt(b.x); pk.writeInt(b.y); pk.writeInt(2);
        pk.writeString("温泉小游戏"); pk.writeString(b.model); pk.writeBoolean(true); pk.writeInt(b.x); pk.writeInt(b.y);
        pk.writeInt(b.action !== "" ? 1 : 0);
        if (b.action === "livingInhale") {
          pk.writeString("livingInhale"); pk.writeInt(b.id);
          pk.writeString(!b.isBack ? "inhaled" : (b.size === 0 ? "backInhaled" : "inhaled"));
          pk.writeString(b.direction); pk.writeInt(10); pk.writeInt(b.x); pk.writeInt(b.y);
        } else if (b.action === "livingUnInhale") {
          pk.writeString("livingUnInhale"); pk.writeInt(b.id); pk.writeString("stand"); pk.writeString(b.direction);
        } else if (b.action === "livingDie") {
          pk.writeString("livingDie"); pk.writeInt(b.id);
        }
      } else {
        const pl = v; const s = this.st(pl); const c = pl.info;
        pk.writeInt(pl.id); pk.writeInt(s.x); pk.writeInt(s.y); pk.writeInt(1);
        pk.writeInt(pl.id); pk.writeInt(c.Grade); pk.writeInt(c.Repute); pk.writeString(c.NickName ?? "");
        pk.writeByte(c.typeVIP ?? 0); pk.writeInt(c.VIPLevel ?? 0); pk.writeBoolean(!!c.Sex);
        pk.writeString(c.Style ?? ""); pk.writeString(c.Colors ?? ""); pk.writeString(c.Skin ?? "");
        pk.writeInt(c.Hide); pk.writeInt(c.FightPower); pk.writeInt(c.Win); pk.writeInt(c.Total);
        pk.writeBoolean(false);
        pk.writeInt(s.inhaling ? 1 : 0);
        if (s.inhaling) {
          pk.writeString("livingInhale"); pk.writeInt(pl.id);
          pk.writeString(s.isBack ? "backInhaleSmall" : "inhaleSmall"); pk.writeString(s.direction);
          pk.writeInt(10); pk.writeInt(s.x); pk.writeInt(s.y);
        }
      }
    }
    return pk;
  }
}

const mgrs = new WeakMap<ServerContext, LittleGameMgr>();
export function littleGameMgr(ctx: ServerContext): LittleGameMgr {
  let m = mgrs.get(ctx);
  if (!m) { m = new LittleGameMgr(ctx); mgrs.set(ctx, m); }
  return m;
}

/** `GamePlayer.cs:3817` (`if (LittleGameInfo.ID != 0) LittleGameWorldMgr.RemovePlayer(this)`): limpeza ao
 *  desconectar sem apertar "Sair". Não cria o mgr se ele nunca foi usado nesta sessão de servidor. */
export function littleGameOnQuit(ctx: ServerContext, p: GamePlayer): void {
  const m = mgrs.get(ctx);
  if (m?.inGame(p)) m.removePlayer(p);
}
