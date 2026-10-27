import { createApiClient } from "@ddtank/ui";
import { queryOptions } from "@tanstack/react-query";

export const api = createApiClient({ tokenKey: "ddtank.web.token" });

// ---- Contract with apps/api (public + account endpoints) ----

/** Socket proxy entry as understood by Ruffle: raw TCP host:port -> WebSocket URL. */
export interface SocketProxy {
  host: string;
  port: number;
  proxyUrl: string;
}

export interface GameConfig {
  /** URL of ruffle.js (self-hosted; the .wasm is loaded from the same directory). */
  rufflePath: string;
  /** URL of the client entry SWF (e.g. Loading.swf / 7road.swf). */
  swfUrl: string;
  /** FlashVars passed to the SWF (site, user, key, config URL...). */
  flashvars: Record<string, string>;
  socketProxy: SocketProxy[];
  /** Optional base URL used to resolve relative URLs inside the SWF. */
  base?: string;
  /** Cliente PixiJS (sem Flash). Quando vem, o GameFrame abre ele num iframe em vez do Ruffle. */
  pixiUrl?: string;
  /** Base URL of the original resource pack (icons etc., `apps/api/src/routes/static.ts` `/resource/*`) —
   *  task multi-char: the character carousel resolves each `EquippedIcon.iconRel` against this. */
  resourceUrl: string;
}

export interface PublicConfig {
  serverName: string;
  launcherUrl: string | null;
  game: GameConfig;
}

/** site-play: one row of `player."Server_List"` (same filter/source as ServerList.ashx), as plain JSON for
 *  the Play page's channel picker — see `apps/api/src/routes/public.ts` `ChannelInfo`/`channelList`. */
export interface Channel {
  id: number;
  name: string;
  /** `ddt/data/ServerInfo.as` enum: 1 manutenção, 2 aberto, 4 quase cheio, 5 cheio. */
  state: number;
  online: number;
  capacity: number;
  mustLevel: number;
  lowestLevel: number;
  pvpOnly: boolean;
  newerServer: boolean;
  /** WebSocket endpoint of this channel's `apps/game` — used as `?ws=` for the PixiJS client. */
  wsUrl: string;
}

export interface ServerStatus {
  online: boolean;
  maintenance: boolean;
  players: number;
  capacity: number;
  rooms: number;
  version: string;
  motd?: string;
}

export type NewsCategory = "update" | "event" | "maintenance" | "news";
export interface NewsItem {
  id: number;
  title: string;
  summary: string;
  category: NewsCategory;
  publishedAt: string;
  url?: string;
}

export type RankingType = "level" | "gp" | "offer" | "fight";
export interface RankingRow {
  rank: number;
  nickname: string;
  guild: string | null;
  level: number;
  value: number;
}

export interface User {
  id: number;
  username: string;
  email: string;
  role: "player" | "admin" | string;
}
export interface Character {
  id: number;
  nickname: string;
  level: number;
  gold: number;
  money: number;
  sex: "m" | "f";
  guild: string | null;
}
export interface Me {
  user: User;
  characters: Character[];
}
export interface AuthResponse {
  token: string;
  user: User;
}

// ---- task multi-char: character carousel (GET/POST /api/me/characters) ----

/** One equipped item's icon, resolved server-side (`apps/api/src/lib/item-icon.ts` `itemIconRel`, the same
 *  path logic the admin item preview uses — a faithful port of `PathManager.solveGoodsPath`). `place` is
 *  the EquipBag slot (see `apps/game/src/game/stats.ts` `styleFromEquip`'s header for the slot order);
 *  the carousel renderer uses it only to pick a z-order, not to know what the slot "means". */
export interface EquippedIcon {
  place: number;
  categoryId: number;
  strengthenLevel: number;
  isGold: boolean;
  /** Relative to `resourceUrl` (e.g. "image/equip/m/cloth/123/icon_1.png"). */
  iconRel: string;
}

/** A character that finished the client's own nickname/sex "Novato" flow. */
export interface CreatedCharacterSlot {
  slot: number;
  gameUserName: string;
  created: true;
  id: number;
  nickname: string;
  level: number;
  sex: "m" | "f";
  guild: string | null;
  /** Guild duty name (e.g. "Chairman") — the closest thing to a "title" this server has wired up today;
   *  shown next to the nickname like the room lobby's nameplate. */
  title: string | null;
  vip: { type: number; level: number };
  /** `GetUserNimbus`: strengthen/gilded aura tier (hundreds = armor, units = weapon), 0 = no aura. */
  nimbus: number;
  equip: EquippedIcon[];
}
/** A reserved slot whose Sys_Users_Detail row doesn't exist yet or has no nickname — the client's "Novato"
 *  flow hasn't run for it. The carousel shows this as "continue creating" rather than a filled character. */
export interface PendingCharacterSlot {
  slot: number;
  gameUserName: string;
  created: false;
}
export type CharacterSlot = CreatedCharacterSlot | PendingCharacterSlot;

export interface MyCharacters {
  characters: CharacterSlot[];
  maxCharacters: number;
  canCreate: boolean;
}

export const myCharactersQuery = queryOptions({
  queryKey: ["me", "characters"],
  queryFn: () => api.get<MyCharacters>("/api/me/characters"),
  enabled: !!api.getToken(),
});

export function createCharacterSlot() {
  return api.post<{ slot: number; gameUserName: string; created: false }>("/api/me/characters", {});
}

export interface AimTableRow {
  angle: number;
  /** force needed for distances[i]; null when unreachable */
  forces: (number | null)[];
}
export interface AimTableResult {
  distances: number[];
  distanceUnitPx: number;
  rows: AimTableRow[];
}

// ---- Query options ----

/** ?client=6600 na URL da página abre o cliente DDT-6600 (migração M1); sem nada, o 4.1. */
const clientParam = typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("client");

/** task multi-char: `slot` picks which of the account's characters the issued ticket opens
 *  (`flashvars.user`). Omitted = slot 1 (the account's original/only character), same as before this
 *  task — anonymous visitors and the pre-carousel demo config are unaffected. */
function configQueryFor(slot?: number) {
  const qs = new URLSearchParams();
  if (clientParam) qs.set("client", clientParam);
  if (slot) qs.set("slot", String(slot));
  const search = qs.toString();
  return queryOptions({
    queryKey: ["public", "config", clientParam, slot ?? null],
    queryFn: () => api.get<PublicConfig>(`/api/public/config${search ? `?${search}` : ""}`),
    staleTime: 5 * 60_000,
  });
}
export { configQueryFor };

export const configQuery = configQueryFor();

export const channelsQuery = queryOptions({
  queryKey: ["public", "channels"],
  queryFn: () => api.get<Channel[]>("/api/public/channels"),
  refetchInterval: 30_000,
});

export const statusQuery = queryOptions({
  queryKey: ["public", "status"],
  queryFn: () => api.get<ServerStatus>("/api/public/status"),
  refetchInterval: 30_000,
});

export const newsQuery = queryOptions({
  queryKey: ["public", "news"],
  queryFn: () => api.get<NewsItem[]>("/api/public/news"),
});

export const rankingQuery = (type: RankingType) =>
  queryOptions({
    queryKey: ["public", "ranking", type],
    queryFn: () => api.get<RankingRow[]>(`/api/public/ranking?type=${type}`),
  });

export const aimTablesQuery = queryOptions({
  queryKey: ["public", "aim-tables"],
  queryFn: () => api.get<AimTableResult>("/api/public/aim-tables"),
  staleTime: 10 * 60_000,
});

// ---- Doações via Pix (docs/features/doacao-pix.md) — nunca dá vantagem de jogo ----

export interface DonationCharge {
  id: number;
  status: "pending" | "paid" | "expired" | "canceled";
  amountCents: number;
  brCode: string;
  qrCodePngBase64: string;
  expiresAt: string;
}
export interface DonationStatus {
  id: number;
  status: DonationCharge["status"];
  amountCents: number;
  paidAt: string | null;
  expiresAt: string | null;
}
export interface Donor {
  name: string;
  amountCents: number;
  message?: string;
  paidAt: string;
}
export interface DonationSummary {
  enabled: boolean;
  monthTotalCents: number;
  goalCents: number;
  minAmountCents: number;
  maxAmountCents: number;
  /** pix-transparencia: custo mensal estimado do servidor, em centavos. 0 = dono não preencheu ainda. */
  monthlyCostCents: number;
  donors: Donor[];
}

export const donationSummaryQuery = queryOptions({
  queryKey: ["public", "donations", "summary"],
  queryFn: () => api.get<DonationSummary>("/api/donations/summary"),
  staleTime: 60_000,
});

export function createDonation(body: { amountCents: number; payerName?: string; message?: string; optIn?: boolean }) {
  return api.post<DonationCharge>("/api/donations", body);
}

export function donationStatusQuery(id: number) {
  return queryOptions({
    queryKey: ["donation", id],
    queryFn: () => api.get<DonationStatus>(`/api/donations/${id}`),
  });
}

export const meQuery = queryOptions({
  queryKey: ["account", "me"],
  queryFn: async () => {
    if (!api.getToken()) return null;
    try {
      return await api.get<Me>("/api/account/me");
    } catch {
      api.setToken(null);
      return null;
    }
  },
  staleTime: 60_000,
});
