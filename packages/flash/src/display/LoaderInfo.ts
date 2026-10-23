/**
 * `flash.display.LoaderInfo` — dados do que foi carregado. O LoaderInfo do
 * Stage (`Player.rootInfo`) carrega os `parameters` (flashvars: user, key,
 * config...) que o site passava pro SWF.
 */
import { $class } from "../as3";
import { EventDispatcher } from "../events/EventDispatcher";
import { ApplicationDomain } from "../system/ApplicationDomain";

export class LoaderInfo extends EventDispatcher {
  $loader: any;
  $url = "";
  $content: any = null;
  $width = 0;
  $height = 0;
  $frameRate = 24;
  $bytesLoaded = 0;
  $bytesTotal = 0;
  $contentType = "";
  $applicationDomain: ApplicationDomain = ApplicationDomain.currentDomain;
  $parameters: Record<string, string> = {};
  /** biblioteca exportada (SwfLibrary) quando é "SWF" */
  $library: any = null;
  uncaughtErrorEvents = new EventDispatcher();
  sharedEvents = new EventDispatcher();

  constructor(loader: any = null) {
    super();
    this.$loader = loader;
  }

  static getLoaderInfoByDefinition(_o: any): LoaderInfo | null { return null; }

  get loader(): any { return this.$loader; }
  get content(): any { return this.$content; }
  get url(): string { return this.$url; }
  /** URL do "SWF" que carregou isto (o boot põe a do Loading.swf original pro código antigo montar caminhos) */
  $loaderURL = "";
  get loaderURL(): string { return this.$loaderURL || this.$url || (typeof location !== "undefined" ? location.href : ""); }
  get width(): number { return this.$width; }
  get height(): number { return this.$height; }
  get frameRate(): number { return this.$frameRate; }
  get bytesLoaded(): number { return this.$bytesLoaded; }
  get bytesTotal(): number { return this.$bytesTotal; }
  get bytes(): any { return null; }
  get contentType(): string { return this.$contentType; }
  get applicationDomain(): ApplicationDomain { return this.$applicationDomain; }
  get parameters(): Record<string, string> { return this.$parameters; }
  get swfVersion(): number { return 15; }
  get actionScriptVersion(): number { return 3; }
  get sameDomain(): boolean { return true; }
  get childAllowsParent(): boolean { return true; }
  get parentAllowsChild(): boolean { return true; }
  get isURLInaccessible(): boolean { return false; }
  get childSandboxBridge(): any { return null; }
  get parentSandboxBridge(): any { return null; }
}
$class(LoaderInfo, "flash.display.LoaderInfo");
