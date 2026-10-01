import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "../cn";

export const buttonVariants = cva(
  [
    "relative inline-flex items-center justify-center gap-2 whitespace-nowrap select-none",
    "font-display tracking-wide rounded-xl transition-[transform,box-shadow,filter] duration-100",
    "shadow-toy active:translate-y-[3px] active:shadow-toy-sm hover:brightness-110",
    "disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-[1.1em] [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        primary: "bg-sun text-night-deep border-b-2 border-sun-deep",
        danger: "bg-coral text-white border-b-2 border-coral-deep",
        success: "bg-mint text-night-deep border-b-2 border-mint-deep",
        info: "bg-sky text-night-deep border-b-2 border-sky-deep",
        secondary: "bg-panel-2 text-ink border border-line",
        ghost: "bg-transparent text-ink shadow-none active:translate-y-0 active:shadow-none hover:bg-panel-2",
        outline: "bg-transparent text-ink border-2 border-line shadow-none active:shadow-none hover:border-sun",
      },
      size: {
        sm: "h-8 px-3 text-sm",
        md: "h-10 px-4 text-base",
        lg: "h-12 px-6 text-lg",
        xl: "h-16 px-9 text-2xl rounded-2xl",
        icon: "size-9 p-0",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps extends ComponentProps<"button">, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({ className, variant, size, asChild, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
