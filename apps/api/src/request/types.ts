import type { FastifyRequest } from "fastify";
import type { AppCtx } from "../context.js";
import { result, type XEl } from "../lib/flash-xml.js";

export type Output =
  | { kind: "xml"; xml: XEl | string; zlib?: boolean }
  | { kind: "text"; text: string; contentType?: string }
  | { kind: "redirect"; url: string };

export interface ReqCtx {
  app: AppCtx;
  req: FastifyRequest;
  /** context.Request["x"]: query string or form, case-insensitive key, URL-decoded. */
  p(name: string): string | undefined;
  /** int.Parse with a default (C# would throw -> handler's catch -> Fail!). */
  int(name: string, def?: number): number;
  ip: string;
}

export interface Endpoint {
  /** Path as in Tank.Request (matched case-insensitively), e.g. "/Login.ashx". */
  path: string;
  /** Mirrored C# source for reference. */
  source?: string;
  handle(c: ReqCtx): Promise<Output>;
}

export const xml = (x: XEl | string, zlib = false): Output => ({ kind: "xml", xml: x, zlib });
export const text = (t: string): Output => ({ kind: "text", text: t });

export function define(path: string, handle: Endpoint["handle"], source?: string): Endpoint {
  return { path, handle, source };
}

/** Graceful stub: endpoint the client calls but that is not ported (or broken in DDTank41 too). */
export function stub(path: string, opts: { zlib?: boolean; value?: boolean; message?: string; extra?: [string, string][] } = {}): Endpoint {
  return {
    path,
    source: "stub",
    handle: async () => xml(result(opts.value ?? false, opts.message ?? "Not supported", [], opts.extra), opts.zlib),
  };
}
