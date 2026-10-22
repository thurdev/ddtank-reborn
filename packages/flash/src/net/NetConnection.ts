/** `flash.net.NetConnection` — só `connect(null)` (modo progressivo) é usado. */
import { $class } from "../as3";
import { EventDispatcher } from "../events/EventDispatcher";

export class NetConnection extends EventDispatcher {
  client: any = null;
  objectEncoding = 3;
  proxyType = "none";
  $connected = false;
  connect(_command: string | null, ..._args: any[]): void { this.$connected = true; }
  close(): void { this.$connected = false; }
  call(..._a: any[]): void {}
  addHeader(..._a: any[]): void {}
  get connected(): boolean { return this.$connected; }
  get uri(): string { return "null"; }
  get usingTLS(): boolean { return false; }
  get protocol(): string { return "rtmp"; }
}
$class(NetConnection, "flash.net.NetConnection");
