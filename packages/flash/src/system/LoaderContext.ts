/** `flash.system.LoaderContext` — só dados (domínio/segurança não se aplicam aqui). */
import { $class } from "../as3";

export class LoaderContext {
  checkPolicyFile: boolean;
  applicationDomain: any;
  securityDomain: any;
  allowCodeImport = true;
  allowLoadBytesCodeExecution = true;
  parameters: any = null;
  requestedContentParent: any = null;
  imageDecodingPolicy = "onDemand";
  constructor(checkPolicyFile = false, applicationDomain: any = null, securityDomain: any = null) {
    this.checkPolicyFile = checkPolicyFile;
    this.applicationDomain = applicationDomain;
    this.securityDomain = securityDomain;
  }
}
$class(LoaderContext, "flash.system.LoaderContext");
