import net from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import WebSocket from "ws";
import { POLICY_REQUEST } from "@ddt/protocol";
import type { GameServer } from "../src/server.js";
import { FakeClient, createCharacter, sharedDb, startServer } from "./helpers.js";

let server: GameServer;
beforeAll(async () => {
  server = await startServer({ WS_ALLOWED_ORIGINS: "http://allowed.test" });
});
afterAll(async () => {
  await server?.stop();
});

async function enter(c: FakeClient, user: string, pass: string) {
  c.login(user, pass);
  await c.code(95);
  c.out(16, (p) => p.writeInt(1));
  await c.code(94, 9);
}

describe("integration (PGlite + real sockets)", () => {
  it("TCP in-band policy, policy server 843 and admin channel", async () => {
    const answer = (port: number) =>
      new Promise<string>((res, rej) => {
        const s = net.connect(port, "127.0.0.1", () => s.write(POLICY_REQUEST));
        let buf = "";
        s.on("data", (d) => {
          buf += d.toString("utf8");
          if (buf.includes("</cross-domain-policy>")) {
            s.destroy();
            res(buf);
          }
        });
        s.on("error", rej);
      });
    expect(await answer(server.tcpPort)).toContain('to-ports="*"');
    const pol = (server.policy!.address() as net.AddressInfo).port;
    expect(await answer(pol)).toContain("cross-domain-policy");
    const st = await (await fetch(`http://127.0.0.1:${server.adminPort}/status`)).json();
    expect(st).toMatchObject({ online: expect.any(Number), rooms: expect.any(Number) });
  });

  it("rejects WebSocket connections from a foreign Origin", async () => {
    const ws = new WebSocket(`ws://127.0.0.1:${server.wsPort}/ws`, { origin: "http://evil.test" });
    const code = await new Promise<number>((res) => {
      ws.on("unexpected-response", (_req, r) => res(r.statusCode ?? 0));
      ws.on("error", () => res(-1));
    });
    expect(code).toBe(403);
  });

  it("TCP client + WS client: login, create room, join, chat in the room, start 1v1 -> loading", async () => {
    const db = await sharedDb();
    const a = await createCharacter(db);
    const b = await createCharacter(db);
    const ca = await FakeClient.tcp(server.tcpPort);
    const cb = await FakeClient.ws(`ws://127.0.0.1:${server.wsPort}/ws`, "http://allowed.test");
    await enter(ca, a.user, a.pass);
    await enter(cb, b.user, b.pass);
    ca.out(94, (p) => {
      p.writeInt(0); p.writeByte(1); p.writeByte(2); p.writeUTF("integration"); p.writeUTF("");
    });
    const created = await ca.code(94, 0);
    created.pkt.readByte();
    const roomId = created.pkt.readInt();
    cb.out(94, (p) => {
      p.writeInt(1); p.writeBoolean(false); p.writeInt(1); p.writeInt(-1); p.writeInt(roomId); p.writeUTF("");
    });
    await cb.code(94, 1);
    const m = cb.mark();
    ca.out(19, (p) => {
      p.writeByte(0); p.writeBoolean(false); p.writeUTF(""); p.writeUTF("gl hf");
    });
    const chat = await cb.code(19, undefined, m);
    expect(chat.clientId).toBe(a.userId);
    cb.out(94, (p) => {
      p.writeInt(15); p.writeByte(1);
    });
    await ca.code(94, 15);
    ca.out(94, (p) => p.writeInt(7));
    await ca.code(91, 103);
    await cb.code(91, 103);
    const stats = await (await fetch(`http://127.0.0.1:${server.adminPort}/stats`)).json();
    expect(stats.playingRooms).toBeGreaterThanOrEqual(1);
    const br = await fetch(`http://127.0.0.1:${server.adminPort}/broadcast`, { method: "POST", body: JSON.stringify({ msg: "maintenance" }) });
    expect((await br.json()).sent).toBeGreaterThanOrEqual(2);
    await cb.waitFor((r) => {
      if (r.code !== 3) return false;
      r.pkt.offset = 20;
      return r.pkt.readInt() === 3 && r.pkt.readString() === "maintenance";
    });
    const k = await fetch(`http://127.0.0.1:${server.adminPort}/kick`, { method: "POST", body: JSON.stringify({ userId: b.userId }) });
    expect(k.status).toBe(200);
    await cb.waitClosed();
    ca.close();
  });
});
