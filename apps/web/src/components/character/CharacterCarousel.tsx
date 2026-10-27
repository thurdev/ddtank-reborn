import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge, Button, Spinner, cn } from "@ddtank/ui";
import { ChevronLeft, ChevronRight, Plus, Sparkles } from "lucide-react";
import { createCharacterSlot, myCharactersQuery, type CharacterSlot } from "@/lib/api";
import { useI18n } from "@/i18n";
import { AvatarFrame } from "./AvatarFrame";
import { CharacterStage } from "./CharacterStage";
import { CharacterThumb } from "./CharacterThumb";
import "./character-carousel.css";

type Card = { kind: "character"; character: CharacterSlot } | { kind: "create" };

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/**
 * task multi-char: old-school character-select carousel, shown before the channel picker. Up to
 * `maxCharactersPerAccount` character cards + a trailing "create" card (hidden once the account is at the
 * limit). The focused (centered) card gets the REAL in-game character render: `AvatarFrame` (an iframe of
 * `apps/client`'s lightweight `avatar.html` entry — `ShowCharacter`, same class the bag/equip preview and
 * room lobby use) when the server has a PixiJS client configured (`pixiClientUrl`), falling back to
 * `CharacterStage` (a lighter icon-stack render) otherwise. The rest of the cards are flat
 * `CharacterThumb`s — only ONE live render (iframe or canvas) exists at a time, see those files' headers
 * for the CPU reasoning. Keyboard (←/→ to browse, Enter/Space to confirm), mouse (click a side card to
 * focus it, click the focused one or the confirm button to enter), and touch (swipe) all drive the same
 * `focus`/`confirm` pair. `onConfirm` is called with the chosen character's `slot` once the player
 * confirms — the Play page then fetches a ticket for that slot and shows the channel picker.
 */
export function CharacterCarousel({
  resourceUrl,
  pixiClientUrl,
  onConfirm,
}: {
  resourceUrl: string;
  /** `GameConfig.pixiUrl` — undefined/empty when the server only has the Ruffle/Flash client configured. */
  pixiClientUrl?: string;
  onConfirm: (slot: number) => void;
}) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { data, isLoading, error, refetch } = useQuery(myCharactersQuery);
  const reducedMotion = usePrefersReducedMotion();
  const [focus, setFocus] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const cards: Card[] = useMemo(() => {
    const chars = data?.characters ?? [];
    const out: Card[] = chars.map((character) => ({ kind: "character", character }));
    if (data?.canCreate) out.push({ kind: "create" });
    return out;
  }, [data]);

  useEffect(() => {
    setFocus((f) => Math.min(f, Math.max(0, cards.length - 1)));
  }, [cards.length]);

  const create = useMutation({
    mutationFn: createCharacterSlot,
    onSuccess: async (row) => {
      await qc.invalidateQueries({ queryKey: myCharactersQuery.queryKey });
      await refetch();
      setFocus(cards.length > 0 ? cards.length - 1 : 0); // land on the brand-new slot (now before "create", or the only card)
      onConfirm(row.slot);
    },
  });

  const move = (delta: number) => setFocus((f) => Math.min(Math.max(0, f + delta), Math.max(0, cards.length - 1)));

  const confirmCard = (card: Card) => {
    if (card.kind === "create") {
      if (!create.isPending) create.mutate();
      return;
    }
    onConfirm(card.character.slot);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") { e.preventDefault(); move(-1); }
    else if (e.key === "ArrowRight") { e.preventDefault(); move(1); }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); const c = cards[focus]; if (c) confirmCard(c); }
  };

  if (isLoading) {
    return (
      <div className="character-carousel-screen" role="status">
        <Spinner className="size-8" />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="character-carousel-screen">
        <p className="text-coral">{t("play.characters.error")}</p>
        <Button onClick={() => void refetch()}>{t("play.retry")}</Button>
      </div>
    );
  }

  return (
    <div
      className="character-carousel-screen"
      tabIndex={0}
      onKeyDown={onKeyDown}
      onTouchStart={(e) => (touchStartX.current = e.touches[0]?.clientX ?? null)}
      onTouchEnd={(e) => {
        const startX = touchStartX.current;
        touchStartX.current = null;
        if (startX == null) return;
        const dx = (e.changedTouches[0]?.clientX ?? startX) - startX;
        if (Math.abs(dx) > 40) move(dx < 0 ? 1 : -1);
      }}
    >
      <div className="flex flex-col items-center gap-2">
        <p className="title-plate text-3xl text-ink sm:text-4xl">{t("play.characters.title")}</p>
        <p className="max-w-md text-center text-sm text-muted">{t("play.characters.lead")}</p>
      </div>

      <div className="character-carousel-track" role="listbox" aria-label={t("play.characters.title")}>
        <Button
          variant="ghost"
          size="icon"
          className="character-carousel-arrow"
          onClick={() => move(-1)}
          disabled={focus === 0}
          aria-label={t("play.characters.prev")}
        >
          <ChevronLeft />
        </Button>

        <div className="character-carousel-stage">
          {cards.map((card, i) => {
            const offset = i - focus;
            const isFocused = offset === 0;
            return (
              <div
                key={card.kind === "create" ? "create" : `${card.character.slot}-${card.character.gameUserName}`}
                role="option"
                aria-selected={isFocused}
                className={cn(
                  "character-card",
                  isFocused && "character-card--focused",
                  Math.abs(offset) > 2 && "character-card--hidden",
                  reducedMotion && "character-card--static",
                )}
                style={{ "--offset": offset } as React.CSSProperties}
                onClick={() => (isFocused ? confirmCard(card) : setFocus(i))}
              >
                {card.kind === "create" ? (
                  <div className="character-card__create">
                    <Plus className="size-10" />
                    <span>{t("play.characters.create")}</span>
                  </div>
                ) : (
                  <CharacterCardContent
                    character={card.character}
                    resourceUrl={resourceUrl}
                    pixiClientUrl={pixiClientUrl}
                    focused={isFocused}
                    reducedMotion={reducedMotion}
                  />
                )}
              </div>
            );
          })}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="character-carousel-arrow"
          onClick={() => move(1)}
          disabled={focus >= cards.length - 1}
          aria-label={t("play.characters.next")}
        >
          <ChevronRight />
        </Button>
      </div>

      <Button size="lg" onClick={() => { const c = cards[focus]; if (c) confirmCard(c); }} disabled={create.isPending || cards.length === 0}>
        {create.isPending
          ? t("play.characters.creating")
          : cards[focus]?.kind === "create"
            ? t("play.characters.create")
            : cards[focus] && cards[focus]!.kind === "character" && !(cards[focus] as { kind: "character"; character: CharacterSlot }).character.created
              ? t("play.characters.continue")
              : t("play.characters.confirm")}
      </Button>
      {create.isError && <p className="text-coral text-sm">{t("play.characters.error")}</p>}
    </div>
  );
}

function CharacterCardContent({
  character,
  resourceUrl,
  pixiClientUrl,
  focused,
  reducedMotion,
}: {
  character: CharacterSlot;
  resourceUrl: string;
  pixiClientUrl?: string;
  focused: boolean;
  reducedMotion: boolean;
}) {
  const { t } = useI18n();
  if (!character.created) {
    return (
      <div className="character-card__inner">
        <div className="character-thumb character-thumb--pending" aria-hidden>
          <span>?</span>
        </div>
        <p className="character-card__pending">{t("play.characters.pending")}</p>
      </div>
    );
  }
  return (
    <div className="character-card__inner">
      {focused ? (
        pixiClientUrl ? (
          <AvatarFrame character={character} pixiClientUrl={pixiClientUrl} resourceUrl={resourceUrl} reducedMotion={reducedMotion} />
        ) : (
          <CharacterStage character={character} resourceUrl={resourceUrl} reducedMotion={reducedMotion} />
        )
      ) : (
        <CharacterThumb character={character} resourceUrl={resourceUrl} />
      )}
      <div className="character-nameplate">
        {character.vip.level > 0 && (
          <Badge tone="sun" className="character-nameplate__vip">
            <Sparkles className="size-3" /> VIP {character.vip.level}
          </Badge>
        )}
        <p className="character-nameplate__nick">{character.nickname}</p>
        <p className="character-nameplate__meta">
          {t("play.characters.level", { level: character.level })}
          {character.title ? ` · ${character.title}` : ""}
        </p>
        {character.guild && <p className="character-nameplate__guild">{character.guild}</p>}
      </div>
    </div>
  );
}
