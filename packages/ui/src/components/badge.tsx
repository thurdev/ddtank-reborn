import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "../cn";

export const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
  {
    variants: {
      tone: {
        sun: "bg-sun/15 text-sun",
        coral: "bg-coral/15 text-coral",
        mint: "bg-mint/15 text-mint",
        sky: "bg-sky/15 text-sky",
        grape: "bg-grape/15 text-grape",
        neutral: "bg-panel-2 text-muted",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export function Badge({ className, tone, ...props }: ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

/** Small pulsing dot for live status (online/offline). */
export function StatusDot({ online, className }: { online: boolean; className?: string }) {
  return (
    <span className={cn("relative inline-flex size-2.5", className)} aria-hidden>
      {online && <span className="absolute inset-0 animate-ping rounded-full bg-mint opacity-60" />}
      <span className={cn("relative inline-flex size-2.5 rounded-full", online ? "bg-mint" : "bg-coral")} />
    </span>
  );
}
