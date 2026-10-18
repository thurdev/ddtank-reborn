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
}

export interface PublicConfig {
  serverName: string;
  launcherUrl: string | null;
  game: GameConfig;
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

export const configQuery = queryOptions({
  queryKey: ["public", "config", clientParam],
  queryFn: () => api.get<PublicConfig>(clientParam ? `/api/public/config?client=${encodeURIComponent(clientParam)}` : "/api/public/config"),
  staleTime: 5 * 60_000,
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
