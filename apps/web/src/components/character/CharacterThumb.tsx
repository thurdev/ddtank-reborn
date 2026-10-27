import type { CharacterSlot } from "@/lib/api";

/** Cheap placeholder/side-card render: plain `<img>` layers, no WebGL context. Used for every card except
 *  the focused one (`CharacterStage`, the real PixiJS render) — see that file's header for why only one
 *  live canvas exists at a time. */
export function CharacterThumb({ character, resourceUrl }: { character: CharacterSlot; resourceUrl: string }) {
  if (!character.created) {
    return (
      <div className="character-thumb character-thumb--pending" aria-hidden>
        <span>?</span>
      </div>
    );
  }
  const layers = [...character.equip].sort((a, b) => a.categoryId - b.categoryId);
  return (
    <div className="character-thumb" aria-hidden>
      {layers.map((l, i) => (
        <img key={`${l.place}-${i}`} src={`${resourceUrl}${l.iconRel}`} className="character-thumb__layer" style={{ zIndex: i }} loading="lazy" alt="" />
      ))}
    </div>
  );
}
