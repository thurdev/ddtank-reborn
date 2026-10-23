/** `flash.system.Security` — sandbox do Flash não existe mais: tudo no-op. */
import { $class } from "../as3";

export class Security {
  static readonly REMOTE = "remote";
  static readonly LOCAL_WITH_FILE = "localWithFile";
  static readonly LOCAL_WITH_NETWORK = "localWithNetwork";
  static readonly LOCAL_TRUSTED = "localTrusted";
  static readonly APPLICATION = "application";
  static exactSettings = false;
  static disableAVM1Loading = true;
  static get sandboxType(): string { return "remote"; }
  static get pageDomain(): string { return typeof location !== "undefined" ? location.origin : ""; }
  static allowDomain(..._d: any[]): void {}
  static allowInsecureDomain(..._d: any[]): void {}
  static loadPolicyFile(_url: string): void {}
  static showSettings(_panel = "default"): void {}
}
$class(Security, "flash.system.Security");
