/** "Recent items" for the command palette (Ctrl+K): last records opened across any resource, kept in
 * localStorage (per browser, not shared — same tradeoff as everything else this admin keeps client-side). */

const KEY = "ddtank.admin.recent";
const MAX = 12;

export interface RecentItem {
  resource: string;
  id: string;
  label: string;
  /** Resource label, shown as a small tag next to the record's own title (e.g. "Jogadores"). */
  resourceLabel: string;
  at: number;
}

function readAll(): RecentItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(arr) ? (arr as RecentItem[]) : [];
  } catch {
    return [];
  }
}

export function getRecent(): RecentItem[] {
  return readAll().sort((a, b) => b.at - a.at);
}

export function addRecent(item: Omit<RecentItem, "at">): void {
  try {
    const rest = readAll().filter((r) => !(r.resource === item.resource && r.id === item.id));
    const next = [{ ...item, at: Date.now() }, ...rest].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // localStorage indisponível (aba privada/bloqueada): só perde o histórico, não quebra a navegação.
  }
}
