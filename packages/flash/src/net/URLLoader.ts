/**
 * `flash.net.URLLoader` — baixa texto/binário/variáveis (os `.ashx` e XMLs
 * de template do servidor). Eventos: OPEN, PROGRESS, HTTP_STATUS, COMPLETE
 * ou IO_ERROR — sempre assíncronos, como no Flash.
 *
 * SWF pedido como binário (ModuleLoader do pickgliss): não baixa nada — o
 * jogo não tem mais SWF; devolve um ByteArray vazio marcado com a URL, e o
 * `Loader.loadBytes` carrega a biblioteca exportada correspondente.
 */
import { $class } from "../as3";
import { Event } from "../events/Event";
import { EventDispatcher } from "../events/EventDispatcher";
import { HTTPStatusEvent } from "../events/HTTPStatusEvent";
import { IOErrorEvent } from "../events/IOErrorEvent";
import { ProgressEvent } from "../events/ProgressEvent";
import { safe } from "../player-safe";
import { isExportedSwf } from "../swf/index-of-assets";
import { ByteArray } from "../utils/ByteArray";
import { httpRequest } from "./http";
import type { URLRequest } from "./URLRequest";
import { URLVariables } from "./URLVariables";

const dec = new TextDecoder("utf-8");

export class URLLoader extends EventDispatcher {
  data: any = null;
  dataFormat = "text";
  bytesLoaded = 0;
  bytesTotal = 0;
  $closed = false;

  constructor(request: URLRequest | null = null) {
    super();
    if (request) this.load(request);
  }

  load(request: URLRequest): void {
    this.$closed = false;
    const url = request.url;
    queueMicrotask(() => safe(() => this.dispatchEvent(new Event(Event.OPEN)), "URLLoader.OPEN"));
    if (this.dataFormat === "binary" && isExportedSwf(url)) {
      setTimeout(() => {
        if (this.$closed) return;
        const b = new ByteArray();
        b.$sourceUrl = url;
        this.data = b;
        safe(() => this.dispatchEvent(new Event(Event.COMPLETE)), "URLLoader.COMPLETE");
      }, 0);
      return;
    }
    httpRequest(request).then(
      (res) => {
        if (this.$closed) return;
        this.bytesLoaded = this.bytesTotal = res.bytes.length;
        safe(() => this.dispatchEvent(new HTTPStatusEvent(HTTPStatusEvent.HTTP_STATUS, false, false, res.status)), "URLLoader.HTTP_STATUS");
        if (res.status >= 400) {
          safe(() => this.dispatchEvent(new IOErrorEvent(IOErrorEvent.IO_ERROR, false, false, `Error #2032: Stream Error. URL: ${url}`, 2032)), "URLLoader.IO_ERROR");
          return;
        }
        safe(() => this.dispatchEvent(new ProgressEvent(ProgressEvent.PROGRESS, false, false, res.bytes.length, res.bytes.length)), "URLLoader.PROGRESS");
        if (this.dataFormat === "binary") this.data = ByteArray.fromBytes(res.bytes, url);
        else {
          let text = dec.decode(res.bytes);
          if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
          this.data = this.dataFormat === "variables" ? new URLVariables(text) : text;
        }
        safe(() => this.dispatchEvent(new Event(Event.COMPLETE)), "URLLoader.COMPLETE");
      },
      (err) => {
        if (this.$closed) return;
        safe(() => this.dispatchEvent(new IOErrorEvent(IOErrorEvent.IO_ERROR, false, false, `Error #2032: Stream Error. URL: ${url} (${(err as Error).message})`, 2032)), "URLLoader.IO_ERROR");
      },
    );
  }

  close(): void { this.$closed = true; }
}
$class(URLLoader, "flash.net.URLLoader");
