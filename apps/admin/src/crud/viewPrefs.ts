/**
 * Per-viewer preferences for `ResourcePage` (admin-ux-2): which columns are visible, and named "saved views"
 * (column set + per-column filters + sort), both keyed by resource name. Stored in `localStorage` only — never
 * sent to the server, never shared between browsers/viewers. Every read/write is wrapped in try/catch: private
 * browsing, a full quota or a corrupted value must never break the page, just silently fall back to "no prefs".
 */

const COLS_PREFIX = "ddtank.admin.cols.";
const VIEWS_PREFIX = "ddtank.admin.views.";

/** `null` = not customized (show every `list` column, the resource's default). */
export function loadVisibleCols(resource: string): string[] | null {
  try {
    const raw = localStorage.getItem(COLS_PREFIX + resource);
    if (!raw) return null;
    const arr = JSON.parse(raw);
    return Array.isArray(arr) && arr.every((x) => typeof x === "string") ? (arr as string[]) : null;
  } catch {
    return null;
  }
}

export function saveVisibleCols(resource: string, cols: string[] | null): void {
  try {
    if (cols === null) localStorage.removeItem(COLS_PREFIX + resource);
    else localStorage.setItem(COLS_PREFIX + resource, JSON.stringify(cols));
  } catch {
    /* private mode / quota exceeded: ignore, the picker just won't persist this session */
  }
}

/** One per-column filter value (see `crud/ColumnFilters.tsx` for the UI and the `cf_*` query params it builds). */
export interface ColFilterValue {
  kind: "text" | "number" | "boolean" | "select" | "ref";
  /** text/boolean/select/ref: the single value (ref/select hold the target id as a string). */
  value?: string;
  /** ref only: the picked row's display label, so the control can show it without refetching. */
  label?: string;
  /** number only: range bounds. */
  min?: string;
  max?: string;
}

export interface SavedView {
  id: string;
  name: string;
  /** `null` = every column (no customization saved for this view). */
  columns: string[] | null;
  colFilters: Record<string, ColFilterValue>;
  sort?: string;
}

export function loadViews(resource: string): SavedView[] {
  try {
    const raw = localStorage.getItem(VIEWS_PREFIX + resource);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as SavedView[]) : [];
  } catch {
    return [];
  }
}

export function saveViews(resource: string, views: SavedView[]): void {
  try {
    localStorage.setItem(VIEWS_PREFIX + resource, JSON.stringify(views));
  } catch {
    /* ignore, same as above */
  }
}
