/** `System.Drawing.Rectangle` / `Point` semantics (value types; helpers return new objects). */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface Point {
  x: number;
  y: number;
}

export const EMPTY_POINT: Readonly<Point> = Object.freeze({ x: 0, y: 0 });
export const isEmptyPoint = (p: Point): boolean => p.x === 0 && p.y === 0;

export const rect = (x: number, y: number, width: number, height: number): Rect => ({ x, y, width, height });
export const offset = (r: Rect, dx: number, dy: number): Rect => ({ x: r.x + dx, y: r.y + dy, width: r.width, height: r.height });

/** `Rectangle.Intersect(a, b)`: empty result is `Rectangle.Empty` (0,0,0,0). */
export function intersect(a: Rect, b: Rect): Rect {
  const x1 = Math.max(a.x, b.x);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y1 = Math.max(a.y, b.y);
  const y2 = Math.min(a.y + a.height, b.y + b.height);
  if (x2 >= x1 && y2 >= y1) return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
  return { x: 0, y: 0, width: 0, height: 0 };
}

/** `Rectangle.IntersectsWith`. */
export function intersectsWith(a: Rect, b: Rect): boolean {
  return b.x < a.x + a.width && a.x < b.x + b.width && b.y < a.y + a.height && a.y < b.y + b.height;
}
