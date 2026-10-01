import { Tabs as T } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "../cn";

export const Tabs = T.Root;

export function TabsList({ className, ...props }: ComponentProps<typeof T.List>) {
  return (
    <T.List
      className={cn("inline-flex flex-wrap gap-1 rounded-2xl border border-line bg-night-deep/60 p-1", className)}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: ComponentProps<typeof T.Trigger>) {
  return (
    <T.Trigger
      className={cn(
        "rounded-xl px-4 py-1.5 font-display text-muted transition-colors hover:text-ink",
        "data-[state=active]:bg-sun data-[state=active]:text-night-deep",
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: ComponentProps<typeof T.Content>) {
  return <T.Content className={cn("mt-4 focus-visible:outline-none", className)} {...props} />;
}
