/**
 * Biblioteca de um "SWF" exportado: lê `library.json`, carrega as imagens e
 * cria os objetos de display de cada caractere — substitui o SWF em runtime.
 *
 * Quando o jogo "carrega um SWF" (Loader/ModuleLoader), o shim do Loader
 * pede `SwfLibrary.load(url)`; ao terminar, todas as classes de linkage do
 * SWF (`asset.hall.xxx`) ficam registradas e `getDefinitionByName` /
 * `ClassUtils.CreatInstance` funcionam sincronamente, como no Flash.
 */
import { ImageSource, Texture } from "pixi.js";
import { $registerDynamic, $tryCls } from "../as3";
import { dlog } from "../debug";
import { Rectangle } from "../geom/Rectangle";
import type { CharT, LibraryT } from "./library-types";
import { withSymbol, type SymbolBinding } from "./symbol";
import { assetUrl } from "./paths";
import { virtualSwfs } from "./index-of-assets";
import { Shape } from "../display/Shape";
import { MovieClip } from "../display/MovieClip";
import { Sprite } from "../display/Sprite";
import { SimpleButton } from "../display/SimpleButton";
import { Bitmap } from "../display/Bitmap";
import { BitmapData } from "../display/BitmapData";
import { TextField } from "../text/TextField";
import { Sound } from "../media/Sound";
import { ByteArray } from "../utils/ByteArray";
import { Font } from "../text/Font";
import type { DisplayObject } from "../display/DisplayObject";

const cache = new Map<string, Promise<SwfLibrary>>();

/** ids de caractere já avisados por `$missingCharPlaceholder` (evita log repetido a cada frame/loop) */
const warnedMissingChars = new Set<string>();

/**
 * Placeholder pra um caractere referenciado na timeline (por id) que o
 * exportador não conseguiu rasterizar — hoje só acontece com `DefineVideoStream`
 * (câmera/vídeo embutido no SWF original, ex. `asset.core.playerLevelUpFaileAsset`
 * → `lv_mc.lv_mc_init.video`): não tem desenho pra exportar, então o id simplesmente
 * não aparece em `chars`. Sem isso, `MovieClip.$place`/`SimpleButton`/`Sprite`
 * recebiam `null` de `create()` e nunca colocavam o filho nem setavam a instância
 * nomeada (`mc["video"]` ficava `undefined`), derrubando qualquer código que depois
 * chamasse um método nela (ex. `.clear()` do Video real).
 *
 * Em vez de tentar imitar a classe real (não dá pra saber qual era só pelo id),
 * devolve um `MovieClip` vazio (sem desenho, sem filhos) envolto num `Proxy`:
 * qualquer método que não existir nele vira um no-op em vez de estourar
 * `TypeError`. Propriedades/métodos reais de `DisplayObject` (posição, parent,
 * adicionar/remover...) continuam funcionando normalmente.
 */
function $missingCharPlaceholder(libKey: string, id: number): DisplayObject {
  const key = `${libKey}#${id}`;
  if (!warnedMissingChars.has(key)) {
    warnedMissingChars.add(key);
    dlog("load", `[flash] caractere #${id} de "${libKey}" não existe no library.json exportado (provável DefineVideoStream/vídeo embutido) — usando placeholder vazio`);
  }
  const mc = new MovieClip();
  mc.visible = false;
  return new Proxy(mc, {
    get(target, prop, receiver) {
      const v = Reflect.get(target, prop, receiver);
      if (v !== undefined || prop in target || typeof prop !== "string") return v;
      return (..._args: unknown[]) => undefined;
    },
  }) as unknown as DisplayObject;
}

type Img = HTMLImageElement | ImageBitmap;

/**
 * `<img>` em vez de ImageBitmap: o navegador só decodifica quando desenha e
 * pode descartar a versão decodificada sob pressão de memória (com centenas
 * de PNGs por "SWF" isso faz diferença grande).
 */
/**
 * Fila global de downloads: bibliotecas grandes (gameover, campo de treino)
 * têm centenas de PNGs e o Chrome recusa tudo de uma vez
 * (net::ERR_INSUFFICIENT_RESOURCES). No máximo MAX_PARALLEL ao mesmo tempo.
 */
const MAX_PARALLEL = 24;
let running = 0;
const waiting: (() => void)[] = [];
async function limited<T>(job: () => Promise<T>): Promise<T> {
  if (running >= MAX_PARALLEL) await new Promise<void>((r) => waiting.push(r));
  running++;
  try { return await job(); } finally { running--; waiting.shift()?.(); }
}

function loadImageOnce(url: string): Promise<Img> {
  return new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => rej(new Error(url));
    im.src = url;
  });
}

/** baixa uma imagem pela fila (tenta de novo uma vez se falhar) */
function loadImage(url: string): Promise<Img> {
  return limited(() => loadImageOnce(url).catch(() => loadImageOnce(url)));
}

export class SwfLibrary {
  /** caminho lógico (ex.: `flash/ui/vietnam/swf/hall`) */
  key: string;
  data: LibraryT;
  private imgs = new Map<number, Img>();
  /** máscaras de clique (formas invisíveis) */
  private hits = new Map<number, Img>();
  private texs = new Map<number, Texture>();
  private bitmapDatas = new Map<number, BitmapData>();
  private binaries = new Map<number, Uint8Array>();
  /** id do caractere → classe de linkage */
  private classById = new Map<number, any>();

  private constructor(key: string, data: LibraryT) {
    this.key = key;
    this.data = data;
  }

  /**
   * Carrega (uma vez) a biblioteca de um SWF. `swfPath` = caminho como o
   * jogo pede (`/flash/ui/vietnam/swf/hall.swf?lv=17` ou só `flash/ui/.../hall`).
   */
  static load(swfPath: string): Promise<SwfLibrary> {
    const key = libraryKey(swfPath);
    let p = cache.get(key);
    if (!p) {
      p = SwfLibrary.$load(key);
      cache.set(key, p);
      p.catch(() => cache.delete(key));
    }
    return p;
  }

  static loaded(swfPath: string): boolean {
    return cache.has(libraryKey(swfPath));
  }

  private static async $load(key: string): Promise<SwfLibrary> {
    if (virtualSwfs.has(key)) {
      dlog("load", `${key} → só código (já convertido pra TS)`);
      return new SwfLibrary(key, { version: 1, swf: key, frameRate: 25, width: 1000, height: 600, chars: {}, classes: {}, main: { n: 1, f: [[]] } });
    }
    const base = assetUrl(key) + "/";
    const r = await fetch(base + "library.json");
    if (!r.ok) throw new Error(`asset não exportado: ${key} (${r.status}) — rode tools/swf-export`);
    const lib = new SwfLibrary(key, (await r.json()) as LibraryT);
    await lib.$preload(base);
    lib.$registerClasses();
    dlog("load", `${key} → ${Object.keys(lib.data.chars).length} caracteres, ${Object.keys(lib.data.classes).length} classes`);
    return lib;
  }

  /** baixa todas as imagens antes de liberar (o Flash entrega tudo junto) */
  private async $preload(base: string): Promise<void> {
    const jobs: Promise<void>[] = [];
    for (const [ids, c] of Object.entries(this.data.chars)) {
      const id = Number(ids);
      const file = c.k === "shape" || c.k === "morph" || c.k === "bitmap" ? c.img : c.k === "text" ? c.img : undefined;
      if (file) {
        jobs.push(loadImage(base + file).then((im) => { this.imgs.set(id, im); }, (e) => dlog("error", `imagem falhou: ${e.message}`)));
      }
      if (c.k === "shape" && c.hit) {
        jobs.push(loadImage(base + c.hit).then((im) => { this.hits.set(id, im); }, () => {}));
      }
      if (c.k === "binary" && c.file) {
        jobs.push(limited(() => fetch(base + c.file!).then((x) => x.arrayBuffer())).then((b) => { this.binaries.set(id, new Uint8Array(b)); }, () => {}));
      }
    }
    await Promise.all(jobs);
  }

  url(file: string): string {
    return assetUrl(this.key) + "/" + file;
  }

  image(id: number): Img | undefined {
    return this.imgs.get(id);
  }

  texture(id: number): Texture | undefined {
    let t = this.texs.get(id);
    if (!t) {
      const im = this.imgs.get(id);
      if (!im) return undefined;
      // <img>: o Pixi pré-multiplica no upload; ImageBitmap já vem pré-multiplicado
      t = new Texture({ source: new ImageSource({ resource: im as any, alphaMode: im instanceof HTMLImageElement ? "premultiply-alpha-on-upload" : "premultiplied-alpha" }) });
      this.texs.set(id, t);
    }
    return t;
  }

  /** BitmapData compartilhado de um bitmap (imagem não copiada) */
  bitmapData(id: number): BitmapData | undefined {
    let bd = this.bitmapDatas.get(id);
    if (!bd) {
      const im = this.imgs.get(id);
      if (!im) return undefined;
      const c = this.data.chars[id] as CharT & { img?: string };
      bd = BitmapData.$fromImage(im as any, `${this.key}/${c.img ?? id}`);
      this.bitmapDatas.set(id, bd);
    }
    return bd;
  }

  /** registra as classes de linkage (`asset.hall.xxx`) no domínio global */
  private $registerClasses(): void {
    for (const [name, info] of Object.entries(this.data.classes)) {
      const char = this.data.chars[info.id];
      if (!char) continue;
      const binding: SymbolBinding = { lib: this, id: info.id, char, linkage: name };
      // classe com código (frame scripts) gerada em TS: só liga o símbolo
      const coded = $tryCls(name);
      if (coded && !coded.$dynamicAsset) {
        Object.defineProperty(coded, "$symbol", { value: binding, configurable: true });
        this.classById.set(info.id, coded);
        continue;
      }
      const cls = this.$makeClass(info.base, binding);
      if (!cls) continue;
      Object.defineProperty(cls, "$symbol", { value: binding, configurable: true });
      Object.defineProperty(cls, "$dynamicAsset", { value: true });
      Object.defineProperty(cls, "name", { value: name.split(".").pop() });
      $registerDynamic(name, cls);
      this.classById.set(info.id, cls);
    }
  }

  private $makeClass(base: string, b: SymbolBinding): any {
    const lib = this;
    switch (base) {
      case "flash.display.BitmapData":
        return class extends BitmapData {
          constructor(_w = 0, _h = 0) {
            super(0, 0);
            const im = lib.imgs.get(b.id);
            if (im) {
              this.$w = im.width;
              this.$h = im.height;
              this.$img = im as any;
              this.$source = `${lib.key}/${(b.char as any).img}`;
            }
          }
        };
      case "flash.display.Bitmap":
        return class extends Bitmap { constructor() { super(lib.bitmapData(b.id) ?? null); } };
      case "flash.display.SimpleButton":
        return class extends SimpleButton {};
      case "flash.display.Sprite":
        return class extends Sprite {};
      case "flash.media.Sound":
        return class extends Sound { constructor() { super(); this.$url = lib.url((b.char as any).file); } };
      case "flash.text.Font":
        return class extends Font { constructor() { super(); this.$name = (b.char as any).name; } };
      case "flash.utils.ByteArray":
        return class extends ByteArray {
          constructor() {
            super();
            const bytes = lib.binaries.get(b.id);
            if (bytes) { this.writeBytes(ByteArray.fromBytes(bytes)); this.position = 0; }
          }
        };
      default: {
        // classe base pode ser outra classe do jogo/asset (raro): usa se existir, senão MovieClip
        const parent = base.startsWith("flash.") ? MovieClip : ($tryCls(base) ?? MovieClip);
        return class extends parent {};
      }
    }
  }

  /** cria o objeto de display de um caractere (filho de timeline) */
  create(id: number): DisplayObject | null {
    const cls = this.classById.get(id);
    if (cls) {
      const o = new cls();
      return typeof (o as any).$node === "object" ? o : new Bitmap(o);
    }
    const c = this.data.chars[id];
    if (!c) return $missingCharPlaceholder(this.key, id);
    const binding: SymbolBinding = { lib: this, id, char: c };
    let o: DisplayObject | null = null;
    switch (c.k) {
      case "shape": case "morph": case "text": {
        const s = new Shape();
        const tex = this.texture(id);
        const im = this.imgs.get(id);
        // hit-test usa a máscara de clique se a forma for invisível (área de clique do Flash)
        if (tex && im) s.$setImage(tex, new Rectangle(c.r[0], c.r[1], c.r[2], c.r[3]), { image: (this.hits.get(id) ?? im) as any });
        o = s;
        break;
      }
      case "bitmap": {
        o = new Bitmap(this.bitmapData(id) ?? null);
        break;
      }
      case "sprite":
        o = withSymbol(binding, () => new MovieClip());
        break;
      case "button":
        o = withSymbol(binding, () => new SimpleButton());
        break;
      case "etext":
        o = TextField.$fromData(c.r, c.p);
        break;
      default:
        return null;
    }
    if (o && !o.$symbol) o.$symbol = { swf: this.key, id, image: (c as any).img ? `${this.key}/${(c as any).img}` : undefined };
    return o;
  }

  /** linkage → classe (pra ApplicationDomain.getDefinition) */
  getClass(name: string): any {
    return this.data.classes[name] ? $tryCls(name) : undefined;
  }

  get classNames(): string[] {
    return Object.keys(this.data.classes);
  }
}

/** `/flash/ui/vietnam/swf/hall.swf?lv=17` → `flash/ui/vietnam/swf/hall` */
export function libraryKey(path: string): string {
  let p = path.replace(/^[a-z]+:\/\/[^/]+/i, "").replace(/[?#].*$/, "").replace(/^\/+/, "");
  p = p.replace(/\.(swf|png)$/i, "");
  return p.toLowerCase();
}
