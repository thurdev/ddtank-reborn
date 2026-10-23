/**
 * `flash.net.FileReference` — salvar/abrir arquivo local pelo navegador.
 *
 * - `save(data, nome)`: baixa o arquivo (ByteArray, String ou XML). O jogo usa
 *   pra salvar o print da tela (socialContact/copyBitmap — PNG em ByteArray).
 * - `browse()` + `load()`: abre o seletor de arquivo; `data` vira ByteArray.
 * - `upload/download` (HTTP) não são usados pelo cliente 4.1.
 */
import { $class } from "../as3";
import { $todo } from "../todo";
import { Event } from "../events/Event";
import { EventDispatcher } from "../events/EventDispatcher";
import { ByteArray } from "../utils/ByteArray";

export class FileReference extends EventDispatcher {
  $file: File | null = null;
  $data: ByteArray | null = null;

  constructor() {
    super();
  }
  get creationDate(): any { return null; }
  get creator(): string | null { return null; }
  get modificationDate(): Date | null { return this.$file ? new Date(this.$file.lastModified) : null; }
  get name(): string | null { return this.$file?.name ?? null; }
  get size(): number { return this.$file?.size ?? 0; }
  get type(): string | null {
    const m = /\.[^.]+$/.exec(this.$file?.name ?? "");
    return m ? m[0] : null;
  }
  get data(): ByteArray | null { return this.$data; }

  cancel(): void {}
  download(_param1: any, _param2?: string): void { return $todo("FileReference.download()"); }
  upload(_param1: any, _param2?: string, _param3?: boolean): void { return $todo("FileReference.upload()"); }

  /** abre o seletor de arquivo do navegador; dispara SELECT ou CANCEL */
  browse(typeFilter?: any[]): boolean {
    const input = document.createElement("input");
    input.type = "file";
    const exts = (typeFilter ?? []).flatMap((f: any) => String(f?.extension ?? "").split(";")).map((e) => e.trim().replace(/^\*/, "")).filter(Boolean);
    if (exts.length) input.accept = exts.join(",");
    input.onchange = () => {
      this.$file = input.files?.[0] ?? null;
      this.dispatchEvent(new Event(this.$file ? Event.SELECT : Event.CANCEL));
    };
    input.click();
    return true;
  }

  /** lê o arquivo escolhido em `browse()`; dispara COMPLETE com `data` preenchido */
  load(): void {
    const f = this.$file;
    if (!f) throw new Error("Error #2037: Functions called in incorrect sequence, or earlier call was unsuccessful.");
    void f.arrayBuffer().then((buf) => {
      this.$data = ByteArray.fromBytes(new Uint8Array(buf));
      this.dispatchEvent(new Event(Event.COMPLETE));
    });
  }

  /** baixa `data` como arquivo (o Flash abria "Salvar como") */
  save(data: any, defaultFileName?: string): void {
    let part: BlobPart;
    let name = defaultFileName;
    if (data instanceof ByteArray) {
      part = data.$bytes().slice();
      name ??= isPng(data.$bytes()) ? "ddtank.png" : "ddtank.bin";
    } else {
      part = String(data);
      name ??= "ddtank.txt";
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([part]));
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
    queueMicrotask(() => this.dispatchEvent(new Event(Event.COMPLETE)));
  }
}
$class(FileReference, "flash.net.FileReference");

const isPng = (b: Uint8Array) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
