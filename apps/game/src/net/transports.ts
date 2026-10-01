/**
 * Listeners: raw TCP game port (in-band '<' policy answered by the frame decoder), WebSocket endpoint for Ruffle's
 * socketProxy (binary messages carry the same byte stream), and the optional Flash policy server on 843.
 */
import net from "node:net";
import { WebSocketServer, type WebSocket } from "ws";
import { POLICY_RESPONSE } from "@ddt/protocol";
import type { Transport } from "../session/client.js";
import type { Logger } from "../util/log.js";

export interface ConnectionGate {
  /** Called for each new connection; returns false to refuse (limits). */
  accept(remote: string): boolean;
  release(remote: string): void;
  /** Creates the session for an accepted transport and returns its byte sink. */
  attach(t: Transport): { receive(chunk: Uint8Array): void; disconnect(reason: string): void };
}

export function startTcp(host: string, port: number, gate: ConnectionGate, log: Logger): Promise<net.Server> {
  const srv = net.createServer((sock) => {
    const remote = sock.remoteAddress ?? "?";
    if (!gate.accept(remote)) {
      sock.destroy();
      return;
    }
    sock.setNoDelay(true);
    let released = false;
    const release = () => {
      if (!released) {
        released = true;
        gate.release(remote);
      }
    };
    const t: Transport = {
      kind: "tcp",
      remoteAddress: remote,
      write: (b) => {
        if (!sock.destroyed) sock.write(b);
      },
      close: () => sock.end(),
    };
    const s = gate.attach(t);
    sock.on("data", (d: Buffer) => s.receive(d));
    sock.on("error", () => {});
    sock.on("close", () => {
      release();
      s.disconnect("socket closed");
    });
  });
  return new Promise((res, rej) => {
    srv.once("error", rej);
    srv.listen(port, host, () => {
      log.info(`TCP game listener on ${host}:${(srv.address() as net.AddressInfo).port}`);
      res(srv);
    });
  });
}

export interface WsOptions {
  host: string;
  port: number;
  path: string;
  allowedOrigins: string[];
  maxPayload: number;
}

export function startWs(o: WsOptions, gate: ConnectionGate, log: Logger): Promise<WebSocketServer> {
  const any = o.allowedOrigins.length === 0 || o.allowedOrigins.includes("*");
  const wss = new WebSocketServer({
    host: o.host,
    port: o.port,
    path: o.path,
    maxPayload: o.maxPayload,
    perMessageDeflate: false,
    verifyClient: (info, cb) => {
      const origin = info.origin ?? "";
      if (!any && !o.allowedOrigins.includes(origin)) return cb(false, 403, "Origin not allowed");
      const remote = info.req.socket.remoteAddress ?? "?";
      if (!gate.accept(remote)) return cb(false, 429, "Too many connections");
      gate.release(remote); // re-acquired on "connection"
      cb(true);
    },
  });
  wss.on("connection", (ws: WebSocket, req) => {
    const remote = req.socket.remoteAddress ?? "?";
    if (!gate.accept(remote)) return ws.close(1013, "limit");
    const t: Transport = {
      kind: "ws",
      remoteAddress: remote,
      write: (b) => {
        if (ws.readyState === ws.OPEN) ws.send(b, { binary: true });
      },
      close: () => ws.close(),
    };
    const s = gate.attach(t);
    ws.on("message", (data, isBinary) => {
      if (!isBinary) return; // socketProxy only sends binary frames
      const buf = Array.isArray(data) ? Buffer.concat(data) : Buffer.from(data as ArrayBuffer);
      s.receive(buf);
    });
    ws.on("error", () => {});
    ws.on("close", () => {
      gate.release(remote);
      s.disconnect("ws closed");
    });
  });
  return new Promise((res, rej) => {
    wss.once("error", rej);
    wss.once("listening", () => {
      log.info(`WebSocket listener on ${o.host}:${(wss.address() as net.AddressInfo).port}${o.path}`);
      res(wss);
    });
  });
}

/** Flash socket policy server (port 843): answers <policy-file-request/> with POLICY and closes. */
export function startPolicy(host: string, port: number, log: Logger): Promise<net.Server | null> {
  const srv = net.createServer((sock) => {
    let got = 0;
    sock.setTimeout(5000, () => sock.destroy());
    sock.on("data", (d: Buffer) => {
      got += d.length;
      if (got > 0) {
        sock.end(Buffer.from(POLICY_RESPONSE));
      }
    });
    sock.on("error", () => {});
  });
  return new Promise((res) => {
    srv.once("error", (err) => {
      log.warn(`policy server on ${port} not started: ${(err as Error).message}`);
      res(null);
    });
    srv.listen(port, host, () => {
      log.info(`Flash policy server on ${host}:${(srv.address() as net.AddressInfo).port}`);
      res(srv);
    });
  });
}
