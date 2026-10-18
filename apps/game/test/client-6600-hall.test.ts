/**
 * `m2-newhall` (docs/plan/TASKS.md, research/6600/packets-m1.md "M2 newhall"): 262 NEW_HALL — o salão
 * andável do 6600. Mesmo método dos Rounds anteriores (`client-6600*.test.ts`): monta o pacote EXATO que o
 * AS3 manda (campo a campo, confirmado contra `GameSocketOut.as`/o `.cs` real do 6600), roda pelo handler
 * de verdade via `FakeClient`, lê a resposta na ordem exata do reader AS3 citado no research doc —
 * `offset === length` no final (sem EOF, sem sobra). 6600-exclusivo: sem equivalente na 4.1 (ver
 * `packets/out.ts`), então um cliente 4.1 nunca deve receber nada por este código nem aparecer nas listas.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { GSPacket } from "@ddt/protocol";
import type { GameServer } from "../src/server.js";
import { loggedIn, startServer } from "./helpers.js";

let server: GameServer;
beforeAll(async () => {
  server = await startServer();
});
afterAll(async () => {
  await server?.stop();
});

function expectFullyConsumed(p: GSPacket): void {
  expect(p.offset).toBe(p.length);
}

/** Lê os 16 campos de `HallPlayerView.readPlayerInfoPkg` (AS3 :418-438) na ordem exata. */
function readHallPlayerFields(p: GSPacket) {
  const id = p.readInt();
  const nick = p.readString();
  const vip = p.readInt();
  const typeVip = p.readInt();
  const sex = p.readBoolean();
  const style = p.readString();
  const colors = p.readString();
  const mountsType = p.readInt();
  const petsId = p.readInt();
  const x = p.readInt();
  const y = p.readInt();
  const consortiaId = p.readInt();
  const badgeId = p.readInt();
  const consortiaName = p.readString();
  const honor = p.readString();
  const honorId = p.readInt();
  return { id, nick, vip, typeVip, sex, style, colors, mountsType, petsId, x, y, consortiaId, badgeId, consortiaName, honor, honorId };
}

/** 262/0 PLAYERINFO: byte sub(0), int selfX, int selfY, int count, count*16 campos. */
function readSelfInfo(p: GSPacket) {
  expect(p.readByte()).toBe(0);
  const x = p.readInt();
  const y = p.readInt();
  const count = p.readInt();
  const others = Array.from({ length: count }, () => readHallPlayerFields(p));
  return { x, y, others };
}

/** 262/7 PLAYERHID: byte sub(7), bool hide. */
function readHid(p: GSPacket): boolean {
  expect(p.readByte()).toBe(7);
  return p.readBoolean();
}

/** 262/{1,4,5} OTHERPLAYERINFO/ADDPLAYE/MODIFYDRESS share the same 16-field body, only the sub-byte differs. */
function readHallPlayerPacket(p: GSPacket, sub: number) {
  expect(p.readByte()).toBe(sub);
  return readHallPlayerFields(p);
}

describe("262 NEW_HALL (6600-only, m2-newhall)", () => {
  it("262/0 PLAYERINFO: self spawn point is the C# default (1560,500), not null — this is the fix for the #1009 crash", async () => {
    const { c } = await loggedIn(server, { client: "6600" });
    c.out(262, (o) => o.writeByte(0)); // sendOtherPlayerInfo() — sem corpo
    // HidePlayerInfo sempre manda 7 (hide flag) ANTES do 0 (NewHallRoom.cs:24-31).
    const hid = await c.code(262, 7);
    expect(readHid(hid.pkt)).toBe(true); // HideAllFriend começa `true` em todo login (GamePlayer.cs:1937)
    expectFullyConsumed(hid.pkt);
    const info = await c.code(262, 0);
    const self = readSelfInfo(info.pkt);
    expect(self.x).toBe(1560); // GamePlayer.cs ctor:1926 PosX = 1560
    expect(self.y).toBe(500); // GamePlayer.cs ctor:1927 PosY = 500
    expect(self.others).toHaveLength(0); // primeiro (e único, oculto) jogador do hall
    expectFullyConsumed(info.pkt);
    c.close();
  });

  it("262/8 PLAYERSHOW só atualiza o próprio jogador (sem broadcast) — mesmo HidePlayerInfo de 262/7", async () => {
    const { c } = await loggedIn(server, { client: "6600" });
    c.out(262, (o) => o.writeByte(0));
    await c.code(262, 0);
    const m = c.mark();
    c.out(262, (o) => o.writeByte(8)); // sendLoadOtherPlayer() — sem corpo
    const hid = await c.code(262, 7, m);
    expect(readHid(hid.pkt)).toBe(false);
    const info = await c.code(262, 0, m);
    expect(readSelfInfo(info.pkt).others).toHaveLength(0);
    c.close();
  });

  it("4.1 nunca manda nem recebe 262 — handler ignora silenciosamente (sem crash, sem resposta)", async () => {
    const { c } = await loggedIn(server, { client: "41" });
    const m = c.mark();
    c.out(262, (o) => o.writeByte(0)); // um cliente 4.1 nunca monta este pacote de verdade; simula um mal-formado
    await new Promise((r) => setTimeout(r, 150));
    expect(c.received.slice(m).filter((r) => r.code === 262)).toHaveLength(0); // handler devolveu antes de registrar/responder (clientKind !== "6600")
    c.close();
  });

  it("entrar -> ficar visível -> sair -> reentrar: lista de outros, ADDPLAYE, MODIFYDRESS, UPDATEPETS, PLAYERMOVE, PLAYEREXIT — 4.1 testemunha não recebe nada", async () => {
    const a = await loggedIn(server, { client: "6600" });
    const b = await loggedIn(server, { client: "6600" });
    const d = await loggedIn(server, { client: "41" }); // testemunha: nunca deve receber um único pacote 262

    // A entra oculto (default), depois fica visível (sub 8) — PLAYERSHOW não anuncia nada ainda (ver teste acima).
    a.c.out(262, (o) => o.writeByte(0));
    await a.c.code(262, 0);
    a.c.out(262, (o) => o.writeByte(8));
    await a.c.code(262, 0, a.c.mark());

    // A sai do hall (entrando em outro estado, ex. lista de salas) e reentra — StateManager.as:265-268.
    const aId = a.player().id;
    a.c.out(262, (o) => { o.writeByte(2); o.writeInt(aId); }); // sendPlayerExit(Self.ID)
    await new Promise((r) => setTimeout(r, 50));
    const mA1 = a.c.mark();
    a.c.out(262, (o) => o.writeByte(0)); // reentra: agora HideAllFriend já é false -> anuncia pros outros
    const aReenter = await a.c.code(262, 0, mA1);
    expect(readSelfInfo(aReenter.pkt).others).toHaveLength(0); // ninguém mais registrado ainda

    // B entra já visível (sub 8 antes do sub 0 — cliente real nunca faz isso, mas o C# não impede) e se
    // registra: como B já está visível, PLAYERINFO anuncia B pra quem já estiver no hall (A).
    const bId = b.player().id;
    const mA2 = a.c.mark();
    b.c.out(262, (o) => o.writeByte(8));
    await b.c.code(262, 0);
    const mB0 = b.c.mark();
    b.c.out(262, (o) => o.writeByte(0));
    const bSelf = await b.c.code(262, 0, mB0);
    expect(readSelfInfo(bSelf.pkt).others.map((o) => o.id)).toContain(aId); // B vê A (A já visível+registrado)

    // A recebe 262/1 OTHERPLAYERINFO anunciando B.
    const aSeesB = await a.c.code(262, 1, mA2);
    const bInfo = readHallPlayerPacket(aSeesB.pkt, 1);
    expect(bInfo.id).toBe(bId);
    expect(bInfo.x).toBe(1560);
    expect(bInfo.y).toBe(500);
    expectFullyConsumed(aSeesB.pkt);

    // PLAYERMOVE: B anda, A vê o ponto final (sem waypoints — NewHallRoom.PlayerMove, :110-121).
    const mA3 = a.c.mark();
    b.c.out(262, (o) => { o.writeByte(3); o.writeInt(900); o.writeInt(600); }); // sendPlayerPos(x,y)
    const moved = await a.c.code(262, 3, mA3);
    expect(moved.pkt.readByte()).toBe(3);
    expect(moved.pkt.readInt()).toBe(bId);
    expect(moved.pkt.readInt()).toBe(900);
    expect(moved.pkt.readInt()).toBe(600);
    expectFullyConsumed(moved.pkt);
    expect(b.player().posX).toBe(900);
    expect(b.player().posY).toBe(600);

    // ADDPLAYE: A pede os dados de B (sendAddNewPlayer) — a resposta vai pra "todo mundo exceto B"
    // (NewHallRoom.SendAddPlayer, :87-108), então A recebe, B NÃO recebe a própria descrição.
    const mA4 = a.c.mark();
    const mB1 = b.c.mark();
    a.c.out(262, (o) => { o.writeByte(4); o.writeInt(bId); });
    const added = await a.c.code(262, 4, mA4);
    const addedInfo = readHallPlayerPacket(added.pkt, 4);
    expect(addedInfo.id).toBe(bId);
    expectFullyConsumed(added.pkt);
    await new Promise((r) => setTimeout(r, 80));
    expect(b.c.received.slice(mB1).filter((r) => r.code === 262 && r.sub === 4)).toHaveLength(0);

    // MODIFYDRESS: B avisa que trocou de roupa (sem corpo) — broadcast pros outros, não pra si mesmo.
    const mA5 = a.c.mark();
    const mB2 = b.c.mark();
    b.c.out(262, (o) => o.writeByte(5));
    const dressed = await a.c.code(262, 5, mA5);
    expect(readHallPlayerPacket(dressed.pkt, 5).id).toBe(bId);
    await new Promise((r) => setTimeout(r, 80));
    expect(b.c.received.slice(mB2).filter((r) => r.code === 262 && r.sub === 5)).toHaveLength(0);

    // UPDATEPETS: B muda o bichinho mostrado — eco pra si mesmo (7+0) e anúncio (1) pros outros.
    const mA6 = a.c.mark();
    const mB3 = b.c.mark();
    b.c.out(262, (o) => { o.writeByte(9); o.writeBoolean(true); o.writeInt(bId); o.writeInt(42); });
    const petsHid = await b.c.code(262, 7, mB3);
    expect(readHid(petsHid.pkt)).toBe(false); // B segue visível
    const petsAnnounce = await a.c.code(262, 1, mA6);
    expect(readHallPlayerPacket(petsAnnounce.pkt, 1).petsId).toBe(42);

    // PLAYEREXIT: B sai; A é avisado; D (4.1) nunca viu nada disso.
    const mA7 = a.c.mark();
    b.c.out(262, (o) => { o.writeByte(2); o.writeInt(bId); });
    const left = await a.c.code(262, 2, mA7);
    expect(left.pkt.readByte()).toBe(2);
    expect(left.pkt.readInt()).toBe(bId);
    expectFullyConsumed(left.pkt);

    expect(d.c.received.filter((r) => r.code === 262)).toHaveLength(0);

    a.c.close(); b.c.close(); d.c.close();
  });
});
