/**
 * `flash.utils.IDataOutput` — esqueleto gerado por tools/as3-to-ts/src/gen-flash-skeletons.ts.
 * Constantes conferem com o Flash Player; métodos não implementados avisam no console.
 */
import { $interface } from "../as3";
import { $todo } from "../todo";

export interface IDataOutput {
  writeBytes(...args: any[]): void;
  writeBoolean(...args: any[]): void;
  writeByte(...args: any[]): void;
  writeShort(...args: any[]): void;
  writeInt(...args: any[]): void;
  writeUnsignedInt(...args: any[]): void;
  writeFloat(...args: any[]): void;
  writeDouble(...args: any[]): void;
  writeMultiByte(...args: any[]): void;
  writeUTF(...args: any[]): void;
  writeUTFBytes(...args: any[]): void;
  writeObject(...args: any[]): void;
  objectEncoding: number;
  endian: string;
}
export const IDataOutput = $interface("flash.utils.IDataOutput");
void $todo;
