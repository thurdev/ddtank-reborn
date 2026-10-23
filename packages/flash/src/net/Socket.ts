/**
 * `flash.net.Socket` sobre WebSocket.
 *
 * O jogo abre `socket.connect(ip, porta)` com o que veio do ServerList.
 * Navegador não abre TCP, então conectamos no endpoint WebSocket do
 * apps/game (mesmo protocolo binário, mesmas mensagens — ver
 * docs/client-pixi/PACOTES.md). Quem decide a URL é `setSocketResolver`
 * (o boot usa o `wsUrl` do servidor escolhido).
 *
 * Leitura/escrita igual ao ByteArray: os bytes recebidos acumulam num buffer
 * (`bytesAvailable`), escritas acumulam até `flush()`.
 */
import { $class } from "../as3";
import { dlog } from "../debug";
import { Event } from "../events/Event";
import { EventDispatcher } from "../events/EventDispatcher";
import { IOErrorEvent } from "../events/IOErrorEvent";
import { ProgressEvent } from "../events/ProgressEvent";
import { safe } from "../player-safe";
import { ByteArray } from "../utils/ByteArray";
import { IDataInput } from "../utils/IDataInput";
import { IDataOutput } from "../utils/IDataOutput";

let resolver: (host: string, port: number) => string = (host, port) => `ws://${host}:${port}/ws`;
/** (host, porta do jogo) → URL WebSocket */
export function setSocketResolver(f: (host: string, port: number) => string): void { resolver = f; }

/** espia bytes crus (debug de pacotes) */
export type SocketTap = (dir: "in" | "out", bytes: Uint8Array) => void;
let tap: SocketTap | null = null;
export function setSocketTap(f: SocketTap | null): void { tap = f; }

const READ_METHODS = ["readBoolean", "readByte", "readUnsignedByte", "readShort", "readUnsignedShort", "readInt", "readUnsignedInt",
  "readFloat", "readDouble", "readUTF", "readUTFBytes", "readMultiByte", "readBytes", "readObject"] as const;
const WRITE_METHODS = ["writeBoolean", "writeByte", "writeShort", "writeInt", "writeUnsignedInt", "writeFloat", "writeDouble",
  "writeUTF", "writeUTFBytes", "writeMultiByte", "writeBytes", "writeObject"] as const;

export class Socket extends EventDispatcher {
  $ws: WebSocket | null = null;
  /** recebido e ainda não lido */
  $in = new ByteArray();
  /** escrito e ainda não enviado */
  $out = new ByteArray();
  timeout = 20000;
  $endian = "bigEndian";

  constructor(host: string | null = null, port = 0) {
    super();
    if (host && port) this.connect(host, port);
  }

  get connected(): boolean { return this.$ws?.readyState === 1; }
  get bytesAvailable(): number { return this.$in.bytesAvailable; }
  get bytesPending(): number { return this.$out.length; }
  get endian(): string { return this.$endian; }
  set endian(v: string) { this.$endian = v; this.$in.endian = v; this.$out.endian = v; }
  get objectEncoding(): number { return 3; }
  set objectEncoding(_v: number) {}
  get localAddress(): string { return ""; }
  get localPort(): number { return 0; }
  get remoteAddress(): string { return ""; }
  get remotePort(): number { return 0; }

  connect(host: string, port: number): void {
    this.close();
    const url = resolver(host, port);
    dlog("packet", `socket conectando ${host}:${port} → ${url}`);
    const ws = new WebSocket(url);
    ws.binaryType = "arraybuffer";
    this.$ws = ws;
    ws.onopen = () => safe(() => this.dispatchEvent(new Event(Event.CONNECT)), "Socket.CONNECT");
    ws.onmessage = (ev) => {
      const bytes = new Uint8Array(ev.data as ArrayBuffer);
      tap?.("in", bytes);
      // anexa no fim do buffer de entrada, mantendo a posição de leitura
      const pos = this.$in.position;
      this.$in.position = this.$in.length;
      this.$in.writeBytes(ByteArray.fromBytes(bytes));
      this.$in.position = pos;
      safe(() => this.dispatchEvent(new ProgressEvent(ProgressEvent.SOCKET_DATA, false, false, bytes.length, 0)), "Socket.SOCKET_DATA");
      // compacta o que já foi lido
      if (this.$in.position > 65536 && this.$in.position === this.$in.length) this.$in.clear();
    };
    ws.onerror = () => {
      dlog("error", `socket erro ${url}`);
      safe(() => this.dispatchEvent(new IOErrorEvent(IOErrorEvent.IO_ERROR, false, false, `Error #2031: Socket Error. URL: ${host}`, 2031)), "Socket.IO_ERROR");
    };
    ws.onclose = () => {
      if (this.$ws !== ws) return;
      this.$ws = null;
      safe(() => this.dispatchEvent(new Event(Event.CLOSE)), "Socket.CLOSE");
    };
  }

  close(): void {
    const ws = this.$ws;
    this.$ws = null;
    if (ws && ws.readyState <= 1) ws.close();
    this.$in = new ByteArray();
    this.$in.endian = this.$endian;
    this.$out = new ByteArray();
    this.$out.endian = this.$endian;
  }

  flush(): void {
    if (!this.$out.length) return;
    const bytes = this.$out.$bytes().slice();
    this.$out.clear();
    tap?.("out", bytes);
    if (this.$ws?.readyState === 1) this.$ws.send(bytes);
  }
}

// lê/escreve delegando pros buffers (mesma API do ByteArray)
for (const m of READ_METHODS) {
  (Socket.prototype as any)[m] = function (this: Socket, ...a: any[]) { return (this.$in as any)[m](...a); };
}
for (const m of WRITE_METHODS) {
  (Socket.prototype as any)[m] = function (this: Socket, ...a: any[]) { return (this.$out as any)[m](...a); };
}

export interface Socket {
  readBoolean(): boolean; readByte(): number; readUnsignedByte(): number; readShort(): number; readUnsignedShort(): number;
  readInt(): number; readUnsignedInt(): number; readFloat(): number; readDouble(): number; readUTF(): string;
  readUTFBytes(n: number): string; readMultiByte(n: number, cs: string): string; readBytes(b: ByteArray, o?: number, l?: number): void; readObject(): any;
  writeBoolean(v: boolean): void; writeByte(v: number): void; writeShort(v: number): void; writeInt(v: number): void;
  writeUnsignedInt(v: number): void; writeFloat(v: number): void; writeDouble(v: number): void; writeUTF(v: string): void;
  writeUTFBytes(v: string): void; writeMultiByte(v: string, cs: string): void; writeBytes(b: ByteArray, o?: number, l?: number): void; writeObject(v: any): void;
}
$class(Socket, "flash.net.Socket", { implements: [IDataInput, IDataOutput] });
