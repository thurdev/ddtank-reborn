import { useEffect, useMemo, useRef } from "react";
import type { CharacterSlot } from "@/lib/api";

type Card = { kind: "character"; character: CharacterSlot } | { kind: "create" };

/**
 * task multi-char (round 2, coordinator ask): ONE `avatar.html` iframe for the WHOLE carousel, not one per
 * card — every real character renders as the actual `ShowCharacter` (room-lobby class) on a single PixiJS
 * stage, positioned/scaled/dimmed by `apps/client/src/avatar.ts`'s own ellipse math. This component just
 * tells it the roster (built into the iframe `src`, which only changes when the account's characters
 * change) and, on every focus change, posts `{type:"ddt-avatar-layout", focus}` — a single small message,
 * not per-frame traffic; `avatar.ts` owns the tween between old and new layout.
 *
 * Mounted ONCE by `CharacterCarousel`, absolutely positioned to cover `.character-carousel-stage` — the
 * per-card `<div className="character-card">`s stay in the DOM on top of it (same CSS grid/offset math as
 * before) but render NO visual content in this mode, only acting as click/keyboard/ARIA hit targets; the
 * iframe itself is `pointer-events: none` so those clicks pass straight through to them.
 */
export function AvatarStage({
  cards,
  focus,
  pixiClientUrl,
  resourceUrl,
  reducedMotion,
  createLabel,
  pendingLabel,
}: {
  cards: Card[];
  focus: number;
  pixiClientUrl: string;
  resourceUrl: string;
  reducedMotion: boolean;
  createLabel: string;
  pendingLabel: string;
}) {
  const frameRef = useRef<HTMLIFrameElement | null>(null);

  const apiOrigin = useMemo(() => {
    try {
      return new URL(resourceUrl, window.location.href).origin;
    } catch {
      return "";
    }
  }, [resourceUrl]);

  // The iframe is rebuilt only when the ROSTER changes (who's in the carousel, their style/equip) — never
  // on a focus change, which is pure postMessage. `cards` is a fresh array each render, so key off its
  // actual content instead of identity.
  const rosterKey = useMemo(() => JSON.stringify(cards.map(cardFingerprint)), [cards]);
  const src = useMemo(
    () => buildStageUrl(pixiClientUrl, apiOrigin, cards, focus, reducedMotion, createLabel, pendingLabel),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally NOT depending on `focus` (postMessage instead, see effect below)
    [pixiClientUrl, apiOrigin, rosterKey, reducedMotion, createLabel, pendingLabel],
  );

  useEffect(() => {
    const win = frameRef.current?.contentWindow;
    if (!win) return;
    win.postMessage({ type: "ddt-avatar-layout", focus }, "*");
  }, [focus, src]);

  return (
    <iframe
      ref={frameRef}
      src={src}
      title="Carrossel de personagens"
      className="avatar-stage__iframe"
      sandbox="allow-scripts allow-same-origin"
      loading="eager"
    />
  );
}

function cardFingerprint(card: Card) {
  if (card.kind === "create") return "create";
  const c = card.character;
  if (!c.created) return `pending-${c.slot}`;
  return [c.slot, c.nickname, c.level, c.style, c.colors, c.skin, c.vip.type, c.vip.level, c.title, c.guild, c.nimbus, c.equip.length].join("|");
}

function buildStageUrl(
  pixiClientUrl: string,
  apiOrigin: string,
  cards: Card[],
  focus: number,
  reducedMotion: boolean,
  createLabel: string,
  pendingLabel: string,
): string {
  const base = pixiClientUrl.endsWith("/") ? pixiClientUrl : `${pixiClientUrl}/`;
  const entries = cards.map((card) => {
    if (card.kind === "create") return { kind: "create", label: createLabel };
    const c = card.character;
    if (!c.created) return { kind: "create", label: pendingLabel };
    return {
      kind: "character",
      nickname: c.nickname,
      sex: c.sex === "m" ? "1" : "0",
      grade: String(c.level),
      style: c.style,
      colors: c.colors,
      skin: c.skin,
      typeVip: String(c.vip.type),
      vipLevel: String(c.vip.level),
      consortiaName: c.guild ?? "",
      dutyName: c.title ?? "",
      nimbus: String(c.nimbus),
      equip: c.equip.map((it) => [it.templateId, it.categoryId, it.needSex, it.property1, it.level, it.pic, it.property8]),
    };
  });
  const qs = new URLSearchParams({ chars: JSON.stringify(entries), focus: String(focus), api: apiOrigin });
  if (reducedMotion) qs.set("reducedMotion", "1");
  return `${base}avatar.html?${qs.toString()}`;
}
