/**
 * Aba no jogo: Casamento › Igreja/capela (lista de salas, criar/entrar/sair, trocar cenário, estado
 * atual, editar nome/senha/descrição da sala).
 * Pacotes: 240 MARRY_SCENE_LOGIN, 241 MARRY_ROOM_CREATE, 242 MARRY_ROOM_LOGIN,
 * 244 PLAYER_EXIT_MARRY_ROOM, 233 MARRY_SCENE_CHANGE, 251 SCENE_STATE, 253 MARRY_ROOM_INFO_UPDATE.
 * C#: `UserEnterMarrySceneHandler.cs` (240), `MarryRoomCreateHandler.cs` (241),
 * `MarryRoomLoginHandler.cs` (242), `UserLeaveMarryRoom.cs` (244), `MarrySceneChangeHandler.cs` (233),
 * `MarryStateHandler.cs` (251), `MarryRoomInfoUpdateHandler.cs` (253).
 * Atenção: 253 é a edição da SALA da capela (nome/senha/descrição); 237 (`mural.ts`) é a edição do seu
 * pedido no MURAL — são formatos diferentes que o C# original misturava (ver cabeçalho de `mural.ts`).
 * Como testar: `apps/game/test/marriage-farm-auction.test.ts`. Manual: Casamento → Igreja → criar sala →
 * convidar → trocar cenário → editar descrição → sair.
 *
 * NOVO (m2-bolsa): todos os 7 códigos deste arquivo são IDÊNTICOS entre 4.1 e 6600 (confirmado campo a
 * campo contra `GameSocketOut.as`/os readers `ChurchManager.as` dos dois lados). Único achado: 241
 * MARRY_ROOM_CREATE no 6600 soma +1 bool `merryActivity` no final (`sendCreateRoom(...)`, depois dos 7
 * campos que já lemos) — não lido por nenhum handler nosso nem pelo `.cs` original, framed-by-length,
 * sem fix (mesmo padrão do resto do arquivo `cerimonia.ts`).
 *
 * m3-partial-sweep (2026-10-19): os readers AS3 reais (`church.controller.ChurchRoomListController`
 * `.__addRoom`/`church.controller.ChurchRoomController.__addPlayer`, achados nesta tarefa — a nota
 * "melhor esforço" antiga não tinha localizado) confirmaram 3 bugs de layout/audiência, todos corrigidos:
 * `marrySceneLogin`/`marryRoomCreate`/`marryRoomInfoUpdate` mandavam 242 (formato de "você entrou nesta
 * sala") pra quem só está navegando a LISTA — o certo é 241 "sala criada"/255 "sala atualizada"
 * (`chapelRoomScenePacket`), pra uma nova plateia rastreada em `chapelBrowsers` (quem mandou 240).
 * `marrySceneChange`/`sceneState` sub 0 ganharam a troca de presença 3D que faltava (243
 * `playerEnterMarryRoomPacket`, só existia a saída 244); `sceneState` sub 1 (genérico, outras telas sem
 * relação com casamento) ganhou `ctx.rooms.enterWaitingRoom`, igual ao 21 SCENE_REMOVE_USER.
 */
import { GSPacket, PacketOut } from "@ddt/protocol";
import { eq } from "drizzle-orm";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import {
  broadcast, chapelBrowsers, type ChapelRoom, chapelRoomScenePacket, isCouple, marryMapSpawn, MARRY_ROOM,
  playerEnterMarryRoomPacket, PRICE_MARRY_ROOM, roomInfoPacket, roomOf, rooms, setMarried,
} from "./infra.js";

/**
 * 240 MARRY_SCENE_LOGIN: entra na tela da LISTA da capela (`UserEnterMarrySceneHandler.cs`), recebe a
 * lista de salas ativas. Fix (m3-partial-sweep): a lista usava o layout de 242 `roomInfoPacket` ("você
 * entrou nesta sala"), que faz `ChurchManager.currentRoom` da AS3 (`__roomLogin`) ser sobrescrita pra
 * CADA sala existente — o cliente ficava pensando que tinha entrado na última sala da lista. O layout
 * certo pra "sala apareceu na lista" é 241 (`AbstractPacketLib.SendMarryRoomInfo`, mesmo código usado por
 * `marryRoomCreate` abaixo), lido por `church.controller.ChurchRoomListController.__addRoom`. Também
 * registra `p` em `chapelBrowsers` (plateia que recebe os updates 241/255 de outras salas).
 */
export function marrySceneLogin(ctx: ServerContext, p: GamePlayer): void {
  chapelBrowsers(ctx).add(p);
  p.send((() => { const o = new PacketOut(240); o.writeBoolean(true); return o; })());
  for (const room of rooms(ctx).values()) p.send(chapelRoomScenePacket(241, room));
}

/** 241 MARRY_ROOM_CREATE: UTF nome, UTF senha, int mapIndex, int horas, int maxCount, bool guestInvite,
 * UTF introdução — só casal casado sem sala própria pode criar. */
export async function marryRoomCreate(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  const name = pkt.readString(); const pwd = pkt.readString(); const mapIndex = pkt.readInt();
  let hours = pkt.readInt(); const maxCount = pkt.readInt(); const guestInvite = pkt.readBoolean(); const intro = pkt.readString();
  if (!p.info.IsMarried || p.info.IsCreatedMarryRoom) return;
  if (p.info.HasBagPassword && p.info.IsLocked) return p.sendMessage(0, ctx.lang.t("Bag.Locked"));
  if (![2, 3, 4].includes(hours)) hours = 4;
  const price = PRICE_MARRY_ROOM(hours);
  if (p.info.Money + p.info.MoneyLock < price) return;
  p.removeMoney(price);
  const spouse = ctx.world.get(p.info.SpouseID);
  const groomID = p.info.Sex ? p.info.SpouseID : p.id;
  const groomName = p.info.Sex ? p.info.SpouseName ?? "" : p.info.NickName ?? "";
  const brideID = p.info.Sex ? p.id : p.info.SpouseID;
  const brideName = p.info.Sex ? p.info.NickName ?? "" : p.info.SpouseName ?? "";
  const now = ctx.now();
  const [row] = await ctx.db.db.insert(MARRY_ROOM).values({
    Name: name, PlayerID: p.id, PlayerName: p.info.NickName ?? "", GroomID: groomID, GroomName: groomName, BrideID: brideID, BrideName: brideName,
    Pwd: pwd, AvailTime: hours, MaxCount: Math.max(2, maxCount), GuestInvite: guestInvite, MapIndex: mapIndex, BeginTime: now,
    BreakTime: new Date(now.getTime() + hours * 3_600_000), RoomIntroduction: intro, ServerID: ctx.zoneId, IsHymeneal: false,
  }).returning();
  const room: ChapelRoom = {
    id: row!.ID, name, pwd, mapIndex, maxCount: Math.max(2, maxCount), guestInvite, introduction: intro,
    creatorId: p.id, creatorName: p.info.NickName ?? "", groomID, groomName, brideID, brideName, createTime: now,
    availHours: hours, breakTime: row!.BreakTime, isHymeneal: false, isGunsaluteUsed: false, started: false,
    members: new Set([p]), forbidden: new Set(), mapByPlayer: new Map([[p.id, 1]]), // MarryRoom.AddPlayer: MarryMap defaults to 1
    giftPool: 0, // 41-capela-reembolso (249/12), ver ChapelRoom.giftPool em infra.ts
  };
  rooms(ctx).set(room.id, room);
  await setMarried(ctx, p.id, { IsMarried: true, SpouseID: p.info.SpouseID, SpouseName: p.info.SpouseName ?? "", IsCreatedMarryRoom: true, SelfMarryRoomID: room.id });
  if (spouse) await setMarried(ctx, spouse.id, { IsMarried: true, SpouseID: spouse.info.SpouseID, SpouseName: spouse.info.SpouseName ?? "", SelfMarryRoomID: room.id });
  // MarryRoomCreateHandler.cs:80-82: SendMarryRoomInfo (241) pra toda a plateia da lista + SendMarryRoomLogin
  // (242, roomInfoPacket) só pro criador. Fix (m3-partial-sweep): o porte anterior mandava um 2º pacote 242
  // TRUNCADO (só `writeBoolean(true)`, sem os outros campos) em vez do 241 — o cliente lia esse 2º 242 como
  // uma resposta de login válida com todos os campos zerados/vazios (framed-by-length), sobrescrevendo
  // `ChurchManager.currentRoom` com lixo bem na hora que o jogador acabou de criar a sala.
  for (const browser of chapelBrowsers(ctx)) browser.send(chapelRoomScenePacket(241, room));
  p.send(roomInfoPacket(room));
}

/** 242 MARRY_ROOM_LOGIN: int roomId (0 = própria), str pwd, int marryMap. */
export async function marryRoomLogin(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  const roomId = pkt.readInt(); const pwd = pkt.readString(); pkt.readInt();
  let room = roomId !== 0 ? rooms(ctx).get(roomId) : [...rooms(ctx).values()].find((r) => isCouple(r, p.id));
  if (!room && roomId === 0 && p.info.SelfMarryRoomID) return p.sendMessage(0, ctx.lang.t("MarryRoomLoginHandler.RoomExist", String(ctx.zoneId), String(p.info.SelfMarryRoomID)));
  if (!room) { p.send(roomInfoPacket(null)); return; }
  if (room.forbidden.has(p.id)) { p.send(roomInfoPacket(null)); return; }
  if (roomId !== 0 && room.pwd && room.pwd !== pwd && !isCouple(room, p.id)) { p.send(roomInfoPacket(null)); return; }
  room.members.add(p);
  room.mapByPlayer.set(p.id, 1); // MarryRoom.AddPlayer: MarryMap defaults to 1 for every join, not just the creator
  p.send(roomInfoPacket(room));
}

/** 244 PLAYER_EXIT_MARRY_ROOM: sai da sala atual da capela. */
export function playerExitMarryRoom(ctx: ServerContext, p: GamePlayer): void {
  const r = roomOf(ctx, p);
  if (!r) return;
  r.members.delete(p);
  broadcast(r, (() => { const o = new PacketOut(244, p.id); return o; })());
}

/**
 * 233 MARRY_SCENE_CHANGE: int map (1 ou 2) — troca de cenário dentro da capela (`Class20.cs`). Fix
 * (m3-partial-sweep): faltava TODA a troca de presença 3D — só avisava a plateia do mapa ANTIGO que o
 * jogador saiu (244); nunca avisava a plateia do mapa NOVO que o jogador chegou (243), então quem já
 * estava lá nunca via o sprite aparecer. Guardas também ausentes: `Class20.cs` exige estar numa sala com
 * `MarryMap!=0` e ignora quando `num==MarryMap` (sem-op, sem pacote nenhum).
 */
export function marrySceneChange(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): void {
  const map = pkt.readInt();
  const r = roomOf(ctx, p);
  if (!r) return;
  const oldMap = r.mapByPlayer.get(p.id) ?? 0;
  if (!oldMap || map === oldMap) return; // Class20.cs:11-19
  const leave = new PacketOut(244, p.id);
  for (const m of r.members) if (m !== p && (r.mapByPlayer.get(m.id) ?? 0) === oldMap) m.send(leave);
  r.mapByPlayer.set(p.id, map);
  const { x, y } = marryMapSpawn(map, true);
  for (const m of r.members) {
    if (m === p || (r.mapByPlayer.get(m.id) ?? 0) !== map) continue;
    m.send(playerEnterMarryRoomPacket(p, x, y));
    p.send(playerEnterMarryRoomPacket(m, x, y)); // m's own (x,y) unknown here, like the original (self X/Y not resynced)
  }
}

/**
 * 251 SCENE_STATE: sub-roteador por int (`Class21.cs`). Fix (m3-partial-sweep): o porte anterior ignorava
 * o sub e só reenviava `roomInfoPacket` (242) — nem a sincronia 3D de entrada (sub 0) nem a saída pra sala
 * de espera do hall (sub 1, usada por telas sem nenhuma relação com casamento: loja/consórcio/lista de
 * salas/dungeon/boss mundial — `ctx.rooms.enterWaitingRoom` já é o mesmo caminho genérico do 21
 * SCENE_REMOVE_USER, `EnterWaitingRoomAction.cs`) existiam.
 */
export function sceneState(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): void {
  const sub = pkt.readInt();
  if (sub === 0) {
    const r = roomOf(ctx, p);
    if (!r) return;
    const map = r.mapByPlayer.get(p.id) ?? 0;
    if (!map) return;
    const { x, y } = marryMapSpawn(map, false);
    for (const m of r.members) {
      if (m === p || (r.mapByPlayer.get(m.id) ?? 0) !== map) continue;
      m.send(playerEnterMarryRoomPacket(p, x, y));
      p.send(playerEnterMarryRoomPacket(m, x, y));
    }
  } else if (sub === 1) {
    ctx.rooms.enterWaitingRoom(p);
  }
}

/**
 * 253 MARRY_ROOM_INFO_UPDATE: str name, bool changePwd, str pwd, str intro — o DONO edita a própria
 * sala da capela (ver nota do cabeçalho sobre a troca com 237). Fix (m3-partial-sweep): `Class19.cs:30`
 * manda `SendMarryRoomInfoUpdateToScenePlayers` (255, mesmo layout de 241, ver `chapelRoomScenePacket`)
 * pra quem está vendo a LISTA, não (242) pros membros da sala — broadcast(r,...) nunca alcançava quem
 * importava (quem navega a lista de fora), e usava o layout errado (242 tem campos que 255 não tem).
 */
export async function marryRoomInfoUpdate(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  const name = pkt.readString(); const changePwd = pkt.readBoolean(); const pwd = pkt.readString(); const intro = pkt.readString();
  const r = roomOf(ctx, p);
  if (!r || r.creatorId !== p.id) return;
  r.name = name; r.introduction = intro;
  if (changePwd) r.pwd = pwd;
  await ctx.db.db.update(MARRY_ROOM).set({ Name: name, Pwd: r.pwd, RoomIntroduction: intro }).where(eq(MARRY_ROOM.ID, r.id));
  for (const browser of chapelBrowsers(ctx)) browser.send(chapelRoomScenePacket(255, r));
  p.sendMessage(0, ctx.lang.t("MarryRoomInfoUpdateHandler.Successed"));
}
