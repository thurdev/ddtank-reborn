/** `flash.net.URLRequest` */
import { $class } from "../as3";

export class URLRequest {
  url: string;
  method = "GET";
  data: any = null;
  contentType: string | null = null;
  requestHeaders: any[] = [];
  digest: string | null = null;
  followRedirects = true;
  cacheResponse = true;
  useCache = true;
  idleTimeout = 0;
  userAgent = "";
  manageCookies = true;
  authenticate = true;
  constructor(url: string | null = null) {
    this.url = url ?? "";
  }
  useRedirectedURL(_r: URLRequest, _wild = false, _pattern: any = null, _replace: string | null = null): void {}
}
$class(URLRequest, "flash.net.URLRequest");
