import { createApiClient } from "@ddtank/ui";
import { queryOptions } from "@tanstack/react-query";

export const TOKEN_KEY = "ddtank.admin.token";

export const api = createApiClient({
  tokenKey: TOKEN_KEY,
  onUnauthorized: () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
    if (!location.pathname.startsWith("/login")) location.assign(`/login?redirect=${encodeURIComponent(location.pathname)}`);
  },
});

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  role: string;
}

export const meQuery = queryOptions({
  queryKey: ["auth", "me"],
  queryFn: async (): Promise<AdminUser | null> => {
    if (!api.getToken()) return null;
    try {
      const res = await api.get<{ user: AdminUser }>("/api/auth/me");
      return res.user;
    } catch {
      return null;
    }
  },
  staleTime: 5 * 60_000,
});

export interface Series {
  t: string;
  v: number;
}
export interface AdminStats {
  onlinePlayers: number;
  capacity: number;
  rooms: number;
  matchesInProgress: number;
  matchesToday: number;
  registeredToday: number;
  uptimeSec: number;
  cpu: Series[];
  mem: Series[];
  memTotalMb: number;
}

export const statsQuery = queryOptions({
  queryKey: ["admin", "stats"],
  queryFn: () => api.get<AdminStats>("/api/admin/stats"),
  refetchInterval: 5_000,
});

export async function uploadFile(file: File, folder?: string): Promise<{ url: string; key: string }> {
  const fd = new FormData();
  fd.append("file", file);
  if (folder) fd.append("folder", folder);
  return api.post<{ url: string; key: string }>("/api/admin/uploads", fd);
}
