/**
 * `flash.net.FileReference` — esqueleto gerado por tools/as3-to-ts/src/gen-flash-skeletons.ts.
 * Constantes conferem com o Flash Player; métodos não implementados avisam no console.
 */
import { $class } from "../as3";
import { $todo } from "../todo";
import { EventDispatcher } from "../events/EventDispatcher";

export class FileReference extends EventDispatcher {

  constructor() {
    super();
  }
  get creationDate(): any { return $todo("FileReference.creationDate"); }
  get creator(): string { return $todo("FileReference.creator"); }
  get modificationDate(): any { return $todo("FileReference.modificationDate"); }
  get name(): string { return $todo("FileReference.name"); }
  get size(): number { return $todo("FileReference.size"); }
  get type(): string { return $todo("FileReference.type"); }
  cancel(): void { return $todo("FileReference.cancel()"); }
  download(_param1: any, _param2?: string): void { return $todo("FileReference.download()"); }
  upload(_param1: any, _param2?: string, _param3?: boolean): void { return $todo("FileReference.upload()"); }
  get data(): any { return $todo("FileReference.data"); }
  load(): void { return $todo("FileReference.load()"); }
  save(_data: any, _defaultFileName?: string): void { return $todo("FileReference.save()"); }
  browse(_param1?: any[]): boolean { return $todo("FileReference.browse()"); }
}
$class(FileReference, "flash.net.FileReference");
