/**
 * `flash.net.SharedObject` — "cookie" do Flash, guardado no localStorage
 * (`ddt.so.<nome>`). `data` é salvo como JSON no `flush()` (e ao fechar a aba).
 */
import { $class } from "../as3";
import { EventDispatcher } from "../events/EventDispatcher";

const all = new Map<string, SharedObject>();

export class SharedObject extends EventDispatcher {
  data: any = {};
  $key = "";
  objectEncoding = 3;
  client: any = null;
  fps = 0;

  static getLocal(name: string, localPath: string | null = null, _secure = false): SharedObject {
    const key = `ddt.so.${localPath ?? ""}/${name}`;
    let so = all.get(key);
    if (!so) {
      so = new SharedObject();
      so.$key = key;
      try {
        const raw = localStorage.getItem(key);
        if (raw) so.data = JSON.parse(raw);
      } catch { /* sem storage */ }
      all.set(key, so);
    }
    return so;
  }
  static getRemote(name: string, ..._a: any[]): SharedObject { return SharedObject.getLocal(name); }
  static deleteAll(_url: string): number { return 0; }
  static getDiskUsage(_url: string): number { return 0; }
  static get defaultObjectEncoding(): number { return 3; }

  get size(): number { try { return JSON.stringify(this.data).length; } catch { return 0; } }

  flush(_minDiskSpace = 0): string {
    try { localStorage.setItem(this.$key, JSON.stringify(this.data)); } catch { /* cheio/sem storage */ }
    return "flushed";
  }
  clear(): void {
    this.data = {};
    try { localStorage.removeItem(this.$key); } catch { /* ok */ }
  }
  close(): void { this.flush(); }
  connect(_nc: any, _params: string | null = null): void {}
  send(..._a: any[]): void {}
  setDirty(_p: string): void {}
  setProperty(p: string, v: any = null): void { this.data[p] = v; }
}
$class(SharedObject, "flash.net.SharedObject");

if (typeof window !== "undefined") window.addEventListener("beforeunload", () => { for (const so of all.values()) so.flush(); });
