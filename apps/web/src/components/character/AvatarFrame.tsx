import { useEffect, useRef, useState } from "react";
import type { CreatedCharacterSlot } from "@/lib/api";

/**
 * task multi-char (correction from the coordinator): the real in-game character model
 * (`ShowCharacter`/`RoomCharacter`, the same classes the bag/equip preview and room lobby use), not
 * stacked equipment icons. `apps/client`'s lightweight second entry point (`avatar.html`/`src/avatar.ts`)
 * renders exactly ONE character on a transparent canvas, without socket/login/hall, and posts
 * `{type:"ddt-avatar-ready"}` once it's done loading. Only used when the server actually has a PixiJS
 * client configured (`pixiClientUrl`, from `GameConfig.pixiUrl`/`PIXI_CLIENT_URL`) — `CharacterCarousel`
 * falls back to `CharacterStage` (the icon-stack renderer) otherwise.
 */
export function AvatarFrame({
  character,
  pixiClientUrl,
  resourceUrl,
  reducedMotion,
}: {
  character: CreatedCharacterSlot;
  pixiClientUrl: string;
  resourceUrl: string;
  reducedMotion: boolean;
}) {
  const [ready, setReady] = useState(false);
  const frameRef = useRef<HTMLIFrameElement | null>(null);

  const src = buildAvatarUrl(pixiClientUrl, resourceUrl, character, reducedMotion);

  useEffect(() => {
    setReady(false);
    const onMessage = (e: MessageEvent) => {
      if (e.source === frameRef.current?.contentWindow && (e.data as { type?: string } | null)?.type === "ddt-avatar-ready") setReady(true);
    };
    window.addEventListener("message", onMessage);
    // Safety net: if the postMessage never arrives (blocked, old cached build...), stop showing the
    // spinner anyway after a bit — the iframe itself still renders the character underneath.
    const t = setTimeout(() => setReady(true), 6000);
    return () => {
      window.removeEventListener("message", onMessage);
      clearTimeout(t);
    };
  }, [src]);

  return (
    <div className="avatar-frame">
      {/* Shown immediately (no dependency on the iframe booting) — a generic silhouette so the card never
       *  looks "empty" while avatar.html loads; fades out once the real render posts ready. */}
      <div className={`avatar-frame__silhouette${ready ? " avatar-frame__silhouette--hidden" : ""}`} aria-hidden>
        <svg viewBox="0 0 100 140" width="110" height="154" fill="currentColor" opacity="0.18">
          <circle cx="50" cy="32" r="22" />
          <path d="M50 58c-24 0-40 16-40 42v30h80v-30c0-26-16-42-40-42z" />
        </svg>
      </div>
      <iframe
        ref={frameRef}
        src={src}
        title={character.nickname}
        className="avatar-frame__iframe"
        style={{ opacity: ready ? 1 : 0 }}
        sandbox="allow-scripts allow-same-origin"
        loading="eager"
      />
    </div>
  );
}

function buildAvatarUrl(pixiClientUrl: string, resourceUrl: string, character: CreatedCharacterSlot, reducedMotion: boolean): string {
  const base = pixiClientUrl.endsWith("/") ? pixiClientUrl : `${pixiClientUrl}/`;
  const apiOrigin = (() => {
    try {
      return new URL(resourceUrl, window.location.href).origin;
    } catch {
      return "";
    }
  })();
  const qs = new URLSearchParams({
    id: String(character.id),
    nickname: character.nickname,
    sex: character.sex === "m" ? "1" : "0",
    grade: String(character.level),
    style: character.style,
    colors: character.colors,
    skin: character.skin,
    typeVip: String(character.vip.type),
    vipLevel: String(character.vip.level),
    consortiaName: character.guild ?? "",
    dutyName: character.title ?? "",
    nimbus: String(character.nimbus),
    // task multi-char (load-time fix): lets avatar.ts build a MINIMAL ItemManager template dictionary
    // from just this character's own equipped items instead of fetching+parsing the full ~7650-item
    // catalog (see avatar.ts `buildItemManager`'s header for why that was the ~8s of dead time).
    equip: JSON.stringify(character.equip.map((it) => [it.templateId, it.categoryId, it.needSex, it.property1, it.level])),
    api: apiOrigin,
  });
  if (reducedMotion) qs.set("reducedMotion", "1");
  return `${base}avatar.html?${qs.toString()}`;
}
