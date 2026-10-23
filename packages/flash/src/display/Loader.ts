/**
 * `flash.display.Loader` — carrega "SWF" (biblioteca exportada) ou imagem.
 *
 * - `.swf` (ou `.png` que era SWF, como `1.png`/`3.png`): `SwfLibrary.load`,
 *   registra as classes de linkage e `content` = timeline principal;
 * - imagem: `content` = Bitmap.
 * - `loadBytes(bytes)`: os bytes vêm do URLLoader marcados com a URL
 *   (`$sourceUrl`) — carrega a biblioteca dessa URL.
 * Eventos em `contentLoaderInfo`: OPEN, PROGRESS, INIT, COMPLETE, IO_ERROR.
 */
import { $class, $tryCls } from "../as3";
import { dlog } from "../debug";
import { Event } from "../events/Event";
import { IOErrorEvent } from "../events/IOErrorEvent";
import { ProgressEvent } from "../events/ProgressEvent";
import { httpRequest, rewriteUrl } from "../net/http";
import { SWF_MARK } from "../net/URLLoader";
import type { URLRequest } from "../net/URLRequest";
import { safe } from "../player-safe";
import { isExportedSwf } from "../swf/index-of-assets";
import { SwfLibrary } from "../swf/SwfLibrary";
import { withSymbol } from "../swf/symbol";
import { ApplicationDomain } from "../system/ApplicationDomain";
import type { ByteArray } from "../utils/ByteArray";
import { Bitmap } from "./Bitmap";
import { BitmapData } from "./BitmapData";
import { DisplayObjectContainer } from "./DisplayObjectContainer";
import { LoaderInfo } from "./LoaderInfo";
import { MovieClip } from "./MovieClip";
import type { DisplayObject } from "./DisplayObject";

export class Loader extends DisplayObjectContainer {
  $content: DisplayObject | null = null;
  $info: LoaderInfo;
  $gen = 0;

  constructor() {
    super();
    this.$info = new LoaderInfo(this);
  }

  get content(): DisplayObject | null { return this.$content; }
  get contentLoaderInfo(): LoaderInfo { return this.$info; }
  get uncaughtErrorEvents(): any { return this.$info.uncaughtErrorEvents; }

  load(request: URLRequest, context: any = null): void {
    this.$start(request.url, context);
  }

  loadBytes(bytes: ByteArray, context: any = null): void {
    let url: string | undefined = (bytes as any)?.$sourceUrl;
    if (!url && bytes && bytes.length > SWF_MARK.length) {
      const head = new TextDecoder().decode(bytes.$bytes().subarray(0, Math.min(bytes.length, 2048)));
      if (head.startsWith(SWF_MARK)) url = head.slice(SWF_MARK.length);
    }
    if (!url) {
      dlog("error", "Loader.loadBytes sem URL de origem (bytes de SWF não são suportados — só bibliotecas exportadas)");
      queueMicrotask(() => safe(() => this.$info.dispatchEvent(new IOErrorEvent(IOErrorEvent.IO_ERROR, false, false, "loadBytes sem origem")), "Loader.IO_ERROR"));
      return;
    }
    this.$start(url, context);
  }

  private $start(url: string, context: any): void {
    const gen = ++this.$gen;
    this.unload();
    const info = this.$info;
    info.$url = url;
    dlog("load", `Loader ${url}`);
    info.$applicationDomain = context?.applicationDomain ?? ApplicationDomain.currentDomain;
    queueMicrotask(() => safe(() => info.dispatchEvent(new Event(Event.OPEN)), "Loader.OPEN"));
    const fail = (msg: string) => {
      if (gen !== this.$gen) return;
      dlog("error", `Loader falhou ${url}: ${msg}`);
      safe(() => info.dispatchEvent(new IOErrorEvent(IOErrorEvent.IO_ERROR, false, false, `Error #2035: URL Not Found. URL: ${url}`, 2035)), "Loader.IO_ERROR");
    };
    const done = (content: DisplayObject, w: number, h: number, fps = 24) => {
      if (gen !== this.$gen) return;
      this.$content = content;
      info.$content = content;
      info.$width = w;
      info.$height = h;
      info.$frameRate = fps;
      info.$bytesLoaded = info.$bytesTotal = 1;
      content.$loaderInfo = info;
      this.addChild(content);
      safe(() => info.dispatchEvent(new ProgressEvent(ProgressEvent.PROGRESS, false, false, 1, 1)), "Loader.PROGRESS");
      safe(() => info.dispatchEvent(new Event(Event.INIT)), "Loader.INIT");
      safe(() => info.dispatchEvent(new Event(Event.COMPLETE)), "Loader.COMPLETE");
    };
    if (isExportedSwf(url)) {
      info.$contentType = "application/x-shockwave-flash";
      SwfLibrary.load(url).then((lib) => {
        info.$library = lib;
        // timeline principal do "SWF" vira o content; se o SWF tinha classe de documento
        // (SymbolClass id 0, ex.: DDT_Loading), instancia ela (código transpilado)
        const docName = Object.entries(lib.data.classes).find(([, v]) => v.id === 0)?.[0];
        const DocClass = docName ? $tryCls(docName) : undefined;
        const binding = { lib, id: 0, char: { k: "sprite" as const, tl: lib.data.main } };
        const root = withSymbol(binding, () => (DocClass && !DocClass.$dynamicAsset ? new DocClass() : new MovieClip()));
        done(root, lib.data.width, lib.data.height, lib.data.frameRate);
      }, (e) => fail((e as Error).message));
      return;
    }
    info.$contentType = /\.jpe?g/i.test(url) ? "image/jpeg" : "image/png";
    httpRequest({ url }).then(async (res) => {
      if (res.status >= 400) return fail(String(res.status));
      try {
        const img = await createImageBitmap(new Blob([res.bytes as BlobPart]), { premultiplyAlpha: "premultiply" });
        const bd = BitmapData.$fromImage(img as any, rewriteUrl(url));
        done(new Bitmap(bd), img.width, img.height);
      } catch (e) {
        fail((e as Error).message);
      }
    }, (e) => fail((e as Error).message));
  }

  unload(): void {
    if (this.$content && this.$content.$parent === this) this.removeChild(this.$content);
    this.$content = null;
    this.$info.$content = null;
  }
  unloadAndStop(_gc = true): void { this.unload(); }
  close(): void { this.$gen++; }
}
$class(Loader, "flash.display.Loader");
