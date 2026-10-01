// Tiny dependency-free WebSocket listener on :9300/ws that logs what Ruffle's socketProxy sends.
// It never answers game packets; it only proves the Socket -> WebSocket tunnel works and records the
// first bytes (the DDTank LOGIN packet) to logs/ws.jsonl. Replace with apps/game later.
import { createServer } from "node:http";
import { createHash } from "node:crypto";
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const LOG = join(here, "../logs/ws.jsonl");
mkdirSync(dirname(LOG), { recursive: true });
const PORT = Number(process.env.WS_PROBE_PORT ?? 9300);
const GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

const server = createServer((_req, res) => res.writeHead(426).end("websocket only"));
server.on("upgrade", (req, socket) => {
  const key = req.headers["sec-websocket-key"];
  const log = (o: Record<string, unknown>) => appendFileSync(LOG, JSON.stringify({ t: new Date().toISOString(), ...o }) + "\n");
  log({ ev: "upgrade", url: req.url, origin: req.headers.origin, protocol: req.headers["sec-websocket-protocol"] });
  if (typeof key !== "string") return socket.destroy();
  const accept = createHash("sha1").update(key + GUID).digest("base64");
  const proto = req.headers["sec-websocket-protocol"];
  socket.write(
    "HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n" +
      `Sec-WebSocket-Accept: ${accept}\r\n` +
      (proto ? `Sec-WebSocket-Protocol: ${String(proto).split(",")[0]!.trim()}\r\n` : "") +
      "\r\n",
  );
  let buf = Buffer.alloc(0);
  socket.on("data", (chunk: Buffer) => {
    buf = Buffer.concat([buf, chunk]);
    while (buf.length >= 2) {
      const opcode = buf[0]! & 0x0f;
      const masked = (buf[1]! & 0x80) !== 0;
      let len = buf[1]! & 0x7f;
      let off = 2;
      if (len === 126) { if (buf.length < 4) return; len = buf.readUInt16BE(2); off = 4; }
      else if (len === 127) { if (buf.length < 10) return; len = Number(buf.readBigUInt64BE(2)); off = 10; }
      const need = off + (masked ? 4 : 0) + len;
      if (buf.length < need) return;
      const mask = masked ? buf.subarray(off, off + 4) : null;
      const payload = Buffer.from(buf.subarray(off + (masked ? 4 : 0), need));
      if (mask) for (let i = 0; i < payload.length; i++) payload[i]! ^= mask[i % 4]!;
      buf = buf.subarray(need);
      log({ ev: "frame", opcode, len: payload.length, hex: payload.subarray(0, 64).toString("hex") });
      console.log(`frame opcode=${opcode} len=${payload.length} head=${payload.subarray(0, 16).toString("hex")}`);
      if (opcode === 8) socket.end();
    }
  });
  socket.on("close", () => log({ ev: "close" }));
  socket.on("error", () => {});
});
server.listen(PORT, () => console.log(`ws-probe on ws://localhost:${PORT}/ws -> ${LOG}`));
