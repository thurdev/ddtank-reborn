import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "../cn";

/**
 * Shared kit for the admin's "game preview" panels (site-admin-redesign): each visual editor (missões,
 * instâncias, eventos, itens, NPCs...) renders the entity like the in-game window using this kit, then a side
 * panel edits the fields. Clicking a `Hotspot` in the preview is how the side panel knows which field to focus.
 */

/** Window frame for a game-preview pane: same border/shadow language as `Card`, tuned to look like an
 *  in-game panel (gradient body, thicker border) instead of an admin list card. */
export function GamePanel({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border-2 border-line bg-gradient-to-b from-panel-2 to-panel shadow-panel",
        className,
      )}
      {...props}
    />
  );
}

export function GamePanelHeader({
  title,
  icon: Icon,
  actions,
  className,
}: {
  title: ReactNode;
  icon?: LucideIcon;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2 border-b-2 border-line bg-night-deep/40 px-4 py-2.5", className)}>
      {Icon && <Icon className="size-5 text-sun" aria-hidden />}
      <h3 className="title-plate flex-1 truncate text-lg text-sun">{title}</h3>
      {actions}
    </div>
  );
}

export function GamePanelBody({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("space-y-4 p-4", className)} {...props} />;
}

/**
 * Clickable region inside a game preview. `active` (the field it maps to is focused in the side panel) gets a
 * persistent ring; otherwise only a gated hover affordance — never an ungated `:hover` animation (see `animate`
 * skill: motion only on deliberate interaction, not ambient). Renders as a `<button>` so it's keyboard-reachable.
 */
export function Hotspot({
  active,
  className,
  children,
  label,
  ...props
}: ComponentProps<"button"> & { active?: boolean; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={!!active}
      className={cn(
        "rounded-lg text-left outline-none transition-[background-color,box-shadow] duration-150 ease-out",
        "focus-visible:ring-2 focus-visible:ring-sun hover:bg-sun/10",
        active ? "bg-sun/15 ring-2 ring-sun" : "ring-2 ring-transparent",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export const rewardToneVariants = cva("grid size-8 shrink-0 place-items-center rounded-lg border", {
  variants: {
    tone: {
      sun: "border-sun/40 bg-sun/15 text-sun",
      coral: "border-coral/40 bg-coral/15 text-coral",
      mint: "border-mint/40 bg-mint/15 text-mint",
      sky: "border-sky/40 bg-sky/15 text-sky",
      grape: "border-grape/40 bg-grape/15 text-grape",
      neutral: "border-line bg-night-deep/60 text-muted",
    },
  },
  defaultVariants: { tone: "neutral" },
});

export interface RewardChipProps extends VariantProps<typeof rewardToneVariants> {
  /** Real item art (e.g. `/api/admin/item-icons/:id.png`). Takes priority over `icon`. */
  iconUrl?: string;
  /** Fallback glyph for non-item rewards (exp, gold, honor...) when there's no mapped game art. */
  icon?: LucideIcon;
  /** Value/quantity text, e.g. "+120". */
  label: string;
  /** Full name for the tooltip (item name, "Experiência"...). */
  title?: string;
  className?: string;
}

/** One reward (currency or item) as shown in the quest/event reward row: icon + quantity. */
export function RewardChip({ iconUrl, icon: Icon, tone, label, title, className }: RewardChipProps) {
  return (
    <span
      title={title}
      className={cn("inline-flex items-center gap-1.5 rounded-xl border border-line bg-night-deep/40 py-1 pr-2.5 pl-1", className)}
    >
      <span className={rewardToneVariants({ tone })}>
        {iconUrl ? (
          <img src={iconUrl} alt="" loading="lazy" className="size-6 rounded object-contain" />
        ) : Icon ? (
          <Icon className="size-4" aria-hidden />
        ) : null}
      </span>
      <span className="font-mono text-sm text-ink">{label}</span>
    </span>
  );
}
