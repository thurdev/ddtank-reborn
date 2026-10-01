import type { DbHandle } from "@ddt/db";
import type { RsaPrivateKey } from "@ddt/protocol";
import type { Config } from "./config.js";
import type { TemplateCache } from "./templates/cache.js";
import type { Storage } from "./lib/storage.js";
import type { ResourceIndex } from "./lib/resources.js";

export interface AppCtx {
  cfg: Config;
  h: DbHandle;
  cache: TemplateCache;
  rsa: RsaPrivateKey | null;
  storage: Storage;
  resources: ResourceIndex;
  startedAt: Date;
  log: { info(msg: string): void; warn(msg: string): void; error(msg: string | object, ...a: unknown[]): void };
}
