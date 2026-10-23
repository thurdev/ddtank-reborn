/**
 * `flash.net.LocalConnection` — esqueleto gerado por tools/as3-to-ts/src/gen-flash-skeletons.ts.
 * Constantes conferem com o Flash Player; métodos não implementados avisam no console.
 */
import { $class } from "../as3";
import { $todo } from "../todo";
import { EventDispatcher } from "../events/EventDispatcher";

export class LocalConnection extends EventDispatcher {

  constructor() {
    super();
  }
  static get isSupported(): boolean { return $todo("LocalConnection.isSupported"); }
  close(): void { return $todo("LocalConnection.close()"); }
  connect(_param1: string): void { return $todo("LocalConnection.connect()"); }
  get domain(): string { return $todo("LocalConnection.domain"); }
  send(_param1: string, _param2: string, ...rest: any[]): void { return $todo("LocalConnection.send()"); }
  get client(): any { return $todo("LocalConnection.client"); }
  set client(_v: any) { $todo("LocalConnection.client="); }
  get isPerUser(): boolean { return $todo("LocalConnection.isPerUser"); }
  set isPerUser(_v: boolean) { $todo("LocalConnection.isPerUser="); }
  allowDomain(...rest: any[]): void { return $todo("LocalConnection.allowDomain()"); }
  allowInsecureDomain(...rest: any[]): void { return $todo("LocalConnection.allowInsecureDomain()"); }
}
$class(LocalConnection, "flash.net.LocalConnection");
