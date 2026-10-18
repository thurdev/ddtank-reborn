import { CalendarDays, FolderOpen, Gauge, HeartHandshake, Mail, Settings2, type LucideIcon } from "lucide-react";
import { resources } from "@/resources";
import type { NavGroup } from "@/crud/types";
import type { TKey, Text } from "@/i18n";

export interface NavItem {
  to: string;
  label: Text | { key: TKey };
  icon: LucideIcon;
  group: NavGroup;
  order: number;
}

export const GROUPS: NavGroup[] = ["overview", "server", "players", "content", "site", "system"];

// Custom pages; resources are appended from the registry. `order` sorts inside a group.
const CUSTOM: NavItem[] = [
  { to: "/", label: { key: "nav.dashboard" }, icon: Gauge, group: "overview", order: 0 },
  { to: "/config", label: { key: "nav.config" }, icon: Settings2, group: "server", order: 0 },
  { to: "/assets", label: { key: "nav.assets" }, icon: FolderOpen, group: "server", order: 20 },
  { to: "/mail", label: { key: "nav.mail" }, icon: Mail, group: "players", order: 5 },
  { to: "/events", label: { key: "nav.events" }, icon: CalendarDays, group: "content", order: 45 },
  { to: "/donations", label: { key: "nav.donations" }, icon: HeartHandshake, group: "site", order: 5 },
];

/** Every navigable destination (custom pages + registered resources, hidden ones excluded), sorted for the sidebar. */
export const NAV: NavItem[] = [
  ...CUSTOM,
  ...resources
    .filter((r) => !r.hidden)
    .map((r, i) => ({ to: `/${r.name}`, label: r.label, icon: r.icon, group: r.group, order: 10 + i * 10 })),
].sort((a, b) => a.order - b.order);
