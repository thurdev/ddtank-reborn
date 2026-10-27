import { useEffect, useRef } from "react";
import type { Application } from "pixi.js";
import type { CreatedCharacterSlot } from "@/lib/api";

/** `GetUserNimbus` (apps/game/src/game/stats.ts): hundreds = armor tier, units = weapon tier, 0-5 each.
 *  The carousel only cares about the strongest of the two, to pick one aura color/intensity. */
function auraTier(nimbus: number): number {
  const armor = Math.floor(nimbus / 100);
  const weapon = nimbus % 100;
  return Math.max(armor, weapon);
}

const AURA_TIER_COLOR: Record<number, number> = {
  1: 0xffffff,
  2: 0x6ecbff,
  3: 0xb66bff,
  4: 0xffd84d,
  5: 0xff7a3d,
};

/**
 * task multi-char: FALLBACK render for the focused carousel card, used only when the server has no PixiJS
 * client configured (`GameConfig.pixiUrl` empty — see `CharacterCarousel`/`AvatarStage`, which renders the
 * REAL `ShowCharacter` via `apps/client/avatar.html` whenever one is). Equipped-item icons layered as
 * sprites (z-order by `categoryId`, same order `apps/api/src/lib/item-icon.ts` `TYPES` walks through
 * head→glass→hair→eff→cloth→face→arm→...→wing), a soft aura glow sized off the strengthen/gilded tier
 * (`Nimbus`), and a gentle idle bob/sway so the centered character doesn't look frozen — same spirit as
 * `ShowCharacter`'s idle "stand" loop, without needing that class's full SWF-frame runtime.
 * Side/background cards use the much cheaper `CharacterThumb` (plain `<img>` layers, no WebGL context) —
 * only ONE of these mounts at a time (the focused card), which is what keeps this CPU-cheap with up to
 * `maxCharactersPerAccount` cards in the carousel.
 *
 * pixi.js is imported dynamically (inside the effect, not at module scope): it's a large dependency the
 * Play page doesn't need until a character card is actually focused, so keeping it out of the route's
 * static import graph means a faster first paint and nothing a non-visual test environment has to pay for.
 */
export function CharacterStage({
  character,
  resourceUrl,
  size = 220,
  reducedMotion = false,
}: {
  character: CreatedCharacterSlot;
  resourceUrl: string;
  size?: number;
  reducedMotion?: boolean;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    let app: Application | undefined;
    let tick: (() => void) | null = null;

    void (async () => {
      const { Application, Assets, Container, Graphics, Sprite } = await import("pixi.js");
      if (cancelled) return;
      const a = new Application();
      try {
        await a.init({ width: size, height: size, backgroundAlpha: 0, antialias: true });
      } catch {
        return; // WebGL unavailable (e.g. headless test env) — the DOM fallback (nickname/VIP plate) still shows
      }
      if (cancelled) {
        a.destroy(true);
        return;
      }
      app = a;
      host.appendChild(a.canvas);

      const tier = Math.min(auraTier(character.nimbus), 5);
      if (tier > 0) {
        const color = AURA_TIER_COLOR[tier] ?? 0xffffff;
        const glow = new Graphics()
          .circle(size / 2, size / 2, size * 0.46)
          .fill({ color, alpha: 0.1 })
          .circle(size / 2, size / 2, size * 0.34)
          .fill({ color, alpha: 0.3 });
        a.stage.addChild(glow);
      }

      const group = new Container();
      group.x = size / 2;
      group.y = size * 0.58;
      a.stage.addChild(group);

      const layers = [...character.equip].sort((x, y) => x.categoryId - y.categoryId);
      for (const item of layers) {
        if (cancelled) break;
        let texture: import("pixi.js").Texture;
        try {
          texture = await Assets.load<import("pixi.js").Texture>(`${resourceUrl}${item.iconRel}`);
        } catch {
          continue; // a single missing/placeholder icon never breaks the whole card
        }
        if (cancelled) break;
        const sprite = new Sprite(texture);
        sprite.anchor.set(0.5, 1);
        const scale = Math.min(1, (size * 0.62) / Math.max(texture.width, texture.height, 1));
        sprite.scale.set(scale);
        group.addChild(sprite);
      }
      if (cancelled) {
        a.destroy(true);
        return;
      }

      if (!reducedMotion) {
        const baseY = group.y;
        let t = 0;
        tick = () => {
          t += 0.045;
          group.y = baseY + Math.sin(t) * (size * 0.015);
          group.rotation = Math.sin(t * 0.6) * 0.018;
        };
        a.ticker.add(tick);
      }
    })();

    return () => {
      cancelled = true;
      if (app) {
        if (tick) app.ticker.remove(tick);
        try {
          app.destroy(true, { children: true, texture: false });
        } catch {
          /* already destroyed */
        }
      }
      host.replaceChildren();
    };
  }, [character, resourceUrl, size, reducedMotion]);

  return <div ref={hostRef} className="character-stage" style={{ width: size, height: size }} aria-hidden />;
}
