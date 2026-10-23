/**
 * `flash.utils.IDataInput` — esqueleto gerado por tools/as3-to-ts/src/gen-flash-skeletons.ts.
 * Constantes conferem com o Flash Player; métodos não implementados avisam no console.
 */
import { $interface } from "../as3";
import { $todo } from "../todo";

export interface IDataInput {
  readBytes(...args: any[]): void;
  readBoolean(...args: any[]): boolean;
  readByte(...args: any[]): number;
  readUnsignedByte(...args: any[]): number;
  readShort(...args: any[]): number;
  readUnsignedShort(...args: any[]): number;
  readInt(...args: any[]): number;
  readUnsignedInt(...args: any[]): number;
  readFloat(...args: any[]): number;
  readDouble(...args: any[]): number;
  readMultiByte(...args: any[]): string;
  readUTF(...args: any[]): string;
  readUTFBytes(...args: any[]): string;
  bytesAvailable: number;
  readObject(...args: any[]): any;
  objectEncoding: number;
  endian: string;
}
export const IDataInput = $interface("flash.utils.IDataInput");
void $todo;
