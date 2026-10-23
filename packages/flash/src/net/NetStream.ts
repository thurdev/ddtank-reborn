/**
 * `flash.net.NetStream` — no DDTank só toca a música de fundo
 * (`sound/<id>.flv`). Aqui vira `<audio>` tocando o `.mp3` convertido
 * (tools/swf-export converte os FLV), com os mesmos eventos NET_STATUS.
 */
import { $class } from "../as3";
import { dlog } from "../debug";
import { EventDispatcher } from "../events/EventDispatcher";
import { NetStatusEvent } from "../events/NetStatusEvent";
import { SoundTransform } from "../media/SoundTransform";
import { safe } from "../player-safe";
import { rewriteUrl } from "./http";

export class NetStream extends EventDispatcher {
  static readonly CONNECT_TO_FMS = "connectToFMS";
  static readonly DIRECT_CONNECTIONS = "directConnections";
  $audio: HTMLAudioElement | null = null;
  $transform = new SoundTransform();
  bufferTime = 0.1;
  client: any = null;
  checkPolicyFile = false;
  inBufferSeek = false;

  constructor(_connection: any, _peerID = "connectToFMS") {
    super();
  }

  private status(code: string, level = "status"): void {
    safe(() => this.dispatchEvent(new NetStatusEvent(NetStatusEvent.NET_STATUS, false, false, { code, level })), `NetStream ${code}`);
  }

  play(...args: any[]): void {
    this.close();
    const src = String(args[0] ?? "");
    const url = rewriteUrl(src).replace(/\.flv(\?|$)/i, ".mp3$1");
    if (typeof Audio === "undefined") return;
    const a = new Audio(url);
    a.volume = Math.max(0, Math.min(1, this.$transform.volume));
    this.$audio = a;
    a.addEventListener("playing", () => this.status("NetStream.Play.Start"), { once: true });
    a.addEventListener("ended", () => { this.status("NetStream.Play.Stop"); this.client?.onPlayStatus?.({ code: "NetStream.Play.Complete" }); });
    a.addEventListener("error", () => this.status("NetStream.Play.StreamNotFound", "error"));
    a.addEventListener("loadedmetadata", () => safe(() => this.client?.onMetaData?.({ duration: a.duration }), "onMetaData"));
    dlog("sound", `música ${url}`);
    void a.play().catch(() => {
      // navegador bloqueou autoplay: tenta de novo no primeiro clique
      const retry = () => { void a.play().catch(() => {}); };
      window.addEventListener("pointerdown", retry, { once: true });
    });
  }

  get soundTransform(): SoundTransform { return new SoundTransform(this.$transform.volume, this.$transform.pan); }
  set soundTransform(t: SoundTransform) {
    this.$transform = new SoundTransform(t.volume, t.pan);
    if (this.$audio) this.$audio.volume = Math.max(0, Math.min(1, t.volume));
  }
  get time(): number { return this.$audio?.currentTime ?? 0; }
  get bytesLoaded(): number { return 0; }
  get bytesTotal(): number { return 0; }
  get bufferLength(): number { return 0; }

  pause(): void { this.$audio?.pause(); }
  resume(): void { void this.$audio?.play().catch(() => {}); }
  togglePause(): void { if (this.$audio?.paused) this.resume(); else this.pause(); }
  seek(offset: number): void { if (this.$audio) this.$audio.currentTime = offset; }
  close(): void {
    // removeAttribute + load() solta o arquivo; `src = ""` faria o navegador pedir a própria página
    if (this.$audio) { this.$audio.pause(); this.$audio.removeAttribute("src"); this.$audio.load(); this.$audio = null; }
  }
  dispose(): void { this.close(); }
  attach(_c: any): void {}
  attachAudio(_m: any): void {}
  attachCamera(_c: any): void {}
  receiveAudio(_f: boolean): void {}
  receiveVideo(_f: boolean): void {}
  send(..._a: any[]): void {}
  appendBytes(_b: any): void {}
  appendBytesAction(_a: string): void {}
}
$class(NetStream, "flash.net.NetStream");
