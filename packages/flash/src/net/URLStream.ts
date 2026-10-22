/**
 * `flash.net.URLStream` — esqueleto gerado por tools/as3-to-ts/src/gen-flash-skeletons.ts.
 * Constantes conferem com o Flash Player; métodos não implementados avisam no console.
 */
import { $class } from "../as3";
import { $todo } from "../todo";
import { EventDispatcher } from "../events/EventDispatcher";

export class URLStream extends EventDispatcher {

  constructor() {
    super();
  }
  load(_param1: any): void { return $todo("URLStream.load()"); }
  readBytes(_param1: any, _param2?: number, _param3?: number): void { return $todo("URLStream.readBytes()"); }
  readBoolean(): boolean { return $todo("URLStream.readBoolean()"); }
  readByte(): number { return $todo("URLStream.readByte()"); }
  readUnsignedByte(): number { return $todo("URLStream.readUnsignedByte()"); }
  readShort(): number { return $todo("URLStream.readShort()"); }
  readUnsignedShort(): number { return $todo("URLStream.readUnsignedShort()"); }
  readUnsignedInt(): number { return $todo("URLStream.readUnsignedInt()"); }
  readInt(): number { return $todo("URLStream.readInt()"); }
  readFloat(): number { return $todo("URLStream.readFloat()"); }
  readDouble(): number { return $todo("URLStream.readDouble()"); }
  readMultiByte(_param1: number, _param2: string): string { return $todo("URLStream.readMultiByte()"); }
  readUTF(): string { return $todo("URLStream.readUTF()"); }
  readUTFBytes(_param1: number): string { return $todo("URLStream.readUTFBytes()"); }
  get connected(): boolean { return $todo("URLStream.connected"); }
  get bytesAvailable(): number { return $todo("URLStream.bytesAvailable"); }
  close(): void { return $todo("URLStream.close()"); }
  readObject(): any { return $todo("URLStream.readObject()"); }
  get objectEncoding(): number { return $todo("URLStream.objectEncoding"); }
  set objectEncoding(_v: number) { $todo("URLStream.objectEncoding="); }
  get endian(): string { return $todo("URLStream.endian"); }
  set endian(_v: string) { $todo("URLStream.endian="); }
  get diskCacheEnabled(): boolean { return $todo("URLStream.diskCacheEnabled"); }
  get position(): number { return $todo("URLStream.position"); }
  set position(_v: number) { $todo("URLStream.position="); }
  get length(): number { return $todo("URLStream.length"); }
  stop(): void { return $todo("URLStream.stop()"); }
}
$class(URLStream, "flash.net.URLStream");
