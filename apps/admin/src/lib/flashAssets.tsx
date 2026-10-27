/**
 * Real exported client UI art (site-admin-redesign, round 2): the owner rejected the first visual editors
 * for not looking like the game ("generic dark card"). This resolves assets straight from the PixiJS
 * client's export tree (`tools/swf-export`'s output, `docs/client-pixi/ASSETS.md`) — the same
 * `library.json` + PNGs the real client renders — served read-only by the API at `/client-assets/flash/ui/
 * vietnam/swf/<module>/...` (`apps/api/src/routes/static.ts`), proxied by the admin's dev server
 * (`vite.config.ts`). These PNGs are already the pt-BR-patched export (baked-in text like "Objetivo da
 * tarefa:"/"Recompensa:" — verified by inspection), not the vendor Vietnamese/Chinese originals.
 */
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type { CSSProperties } from "react";

const BASE = "/client-assets/flash/ui/vietnam/swf";

export interface FlashChar {
  k: string;
  img?: string;
  w?: number;
  h?: number;
}
export interface FlashLibrary {
  chars: Record<string, FlashChar>;
  classes: Record<string, { id: number; base: string }>;
}

export function flashLibraryQuery(module: string) {
  return {
    queryKey: ["flash-library", module],
    queryFn: async (): Promise<FlashLibrary> => {
      const r = await fetch(`${BASE}/${module}/library.json`);
      if (!r.ok) throw new Error(`${module}/library.json: HTTP ${r.status}`);
      return (await r.json()) as FlashLibrary;
    },
    staleTime: Infinity,
    retry: 1,
  };
}

export function useFlashLibrary(module: string): UseQueryResult<FlashLibrary> {
  return useQuery(flashLibraryQuery(module));
}

export interface ResolvedFlashAsset {
  url: string;
  /** Natural pixel size from the export, when known (0×0 for 9-slice/scale assets — read the real PNG's
   *  dimensions some other way, e.g. a known cell size from the AS3 source, when you need those). */
  w?: number;
  h?: number;
}

/** Resolves one exported asset by its AS3 linkage classname (e.g. "asset.core.quest.necessary") against an
 *  already-loaded library. `null` while loading/missing — callers render nothing rather than a broken `<img>`. */
export function resolveFlashAsset(lib: FlashLibrary | undefined, module: string, className: string): ResolvedFlashAsset | null {
  const cls = lib?.classes[className];
  if (!cls) return null;
  const char = lib?.chars[String(cls.id)];
  if (!char?.img) return null;
  return { url: `${BASE}/${module}/${char.img}`, w: char.w || undefined, h: char.h || undefined };
}

/**
 * Real game art as an `<img>`, resolved by AS3 linkage classname. Renders nothing (not a broken-image icon)
 * when the library hasn't loaded yet or the class is missing — a preview this is reused across (quest,
 * dungeon, item, event, NPC windows) should degrade quietly, never show a broken-image glyph.
 */
export function FlashImg({
  module,
  className: assetClass,
  alt = "",
  style,
  imgClassName,
}: {
  module: string;
  className: string;
  alt?: string;
  style?: CSSProperties;
  imgClassName?: string;
}) {
  const { data: lib } = useFlashLibrary(module);
  const asset = resolveFlashAsset(lib, module, assetClass);
  if (!asset) return null;
  return <img src={asset.url} alt={alt} draggable={false} style={style} className={imgClassName} />;
}
