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

// ---- Query options ----

export const configQuery = queryOptions({
  queryKey: ["public", "config"],
  queryFn: () => api.get<PublicConfig>("/api/public/config"),
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
