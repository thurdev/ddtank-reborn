import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@ddtank/ui";
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
  // perf-cliente: `avatar.html` now boots in ~0.3-1.2s (was ~2.6-3.7s, almost all of it ~2800 unbundled
  // dev-server module requests — see vite.avatar.config.ts) but that's still not literally instant. Until
  // its own `ddt-avatar-ready` postMessage arrives, show a plain CSS nameplate+silhouette per slot (same
  // data this component already has, zero network/iframe dependency) instead of an empty stage — this is
  // the single-iframe-era revival of the `.avatar-frame__silhouette` idea from the old per-card iframe
  // (round 1; see avatar.ts's header comment), which got dropped when that merged into one iframe.
  const [ready, setReady] = useState(false);

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

  // New roster -> new iframe document -> wait for its own ready signal again.
  useEffect(() => setReady(false), [src]);

  useEffect(() => {
    const win = frameRef.current?.contentWindow;
    if (!win) return;
    win.postMessage({ type: "ddt-avatar-layout", focus }, "*");
  }, [focus, src]);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (frameRef.current?.contentWindow === e.source && (e.data as { type?: string } | null)?.type === "ddt-avatar-ready") {
        setReady(true);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return (
    <>
      {!ready && (
        <div className="avatar-stage__skeleton" aria-hidden>
          {cards.map((card, i) => (
            <div
              key={card.kind === "create" ? "create" : `${card.character.slot}-${card.character.gameUserName}`}
              className={cn("avatar-stage__skeleton-slot", i === focus && "avatar-stage__skeleton-slot--focused")}
              style={{ "--offset": i - focus } as React.CSSProperties}
            >
              <div className="avatar-stage__skeleton-silhouette" />
              {/* `data-text`/`::before` (CSS-rendered, not a real text node) rather than plain children: a
                  real "Canhoneiro" text node here would double up with `CharacterCarousel`'s own `sr-only`
                  copy of the same name (the ONE accessible copy, meant for screen readers/queries) — this
                  nameplate is purely decorative (`aria-hidden` on the wrapper above) and disappears the
                  moment the real one draws inside the iframe, so it has no accessible-name job of its own. */}
              {card.kind === "character" && (
                <div className="character-nameplate avatar-stage__skeleton-nameplate">
                  <p className="character-nameplate__nick" data-text={card.character.created ? card.character.nickname : pendingLabel} />
                  {card.character.created && <p className="character-nameplate__meta" data-text={`Nv. ${card.character.level}`} />}
                </div>
              )}
              {card.kind === "create" && (
                <div className="character-nameplate avatar-stage__skeleton-nameplate">
                  <p className="character-nameplate__nick" data-text={createLabel} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <iframe
        ref={frameRef}
        src={src}
        title="Carrossel de personagens"
        className={cn("avatar-stage__iframe", !ready && "avatar-stage__iframe--loading")}
        sandbox="allow-scripts allow-same-origin"
        loading="eager"
      />
    </>
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
