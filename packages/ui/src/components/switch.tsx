import { Switch as S } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "../cn";

export function Switch({ className, ...props }: ComponentProps<typeof S.Root>) {
  return (
    <S.Root
      className={cn(
        "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-line bg-night-deep transition-colors",
        "data-[state=checked]:border-mint-deep data-[state=checked]:bg-mint disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <S.Thumb className="block size-4 translate-x-0.5 rounded-full bg-ink shadow-toy-sm transition-transform data-[state=checked]:translate-x-[22px] data-[state=checked]:bg-night-deep" />
    </S.Root>
  );
}
