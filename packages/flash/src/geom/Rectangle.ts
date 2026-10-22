/** `flash.geom.Rectangle` */
import { $class } from "../as3";
import { Point } from "./Point";

export class Rectangle {
  constructor(public x = 0, public y = 0, public width = 0, public height = 0) {}

  get left(): number { return this.x; }
  set left(v: number) { this.width += this.x - v; this.x = v; }
  get right(): number { return this.x + this.width; }
  set right(v: number) { this.width = v - this.x; }
  get top(): number { return this.y; }
  set top(v: number) { this.height += this.y - v; this.y = v; }
  get bottom(): number { return this.y + this.height; }
  set bottom(v: number) { this.height = v - this.y; }
  get topLeft(): Point { return new Point(this.x, this.y); }
  set topLeft(p: Point) { this.left = p.x; this.top = p.y; }
  get bottomRight(): Point { return new Point(this.right, this.bottom); }
  set bottomRight(p: Point) { this.right = p.x; this.bottom = p.y; }
  get size(): Point { return new Point(this.width, this.height); }
  set size(p: Point) { this.width = p.x; this.height = p.y; }

  clone(): Rectangle { return new Rectangle(this.x, this.y, this.width, this.height); }
  contains(x: number, y: number): boolean { return x >= this.x && x < this.right && y >= this.y && y < this.bottom; }
  containsPoint(p: Point): boolean { return this.contains(p.x, p.y); }
  containsRect(r: Rectangle): boolean {
    if (r.isEmpty()) return false;
    return r.x >= this.x && r.y >= this.y && r.right <= this.right && r.bottom <= this.bottom;
  }
  copyFrom(r: Rectangle): void { this.x = r.x; this.y = r.y; this.width = r.width; this.height = r.height; }
  equals(r: Rectangle): boolean { return !!r && r.x === this.x && r.y === this.y && r.width === this.width && r.height === this.height; }
  inflate(dx: number, dy: number): void { this.x -= dx; this.width += 2 * dx; this.y -= dy; this.height += 2 * dy; }
  inflatePoint(p: Point): void { this.inflate(p.x, p.y); }
  intersection(r: Rectangle): Rectangle {
    const x = Math.max(this.x, r.x), y = Math.max(this.y, r.y);
    const R = Math.min(this.right, r.right), B = Math.min(this.bottom, r.bottom);
    if (R <= x || B <= y) return new Rectangle();
    return new Rectangle(x, y, R - x, B - y);
  }
  intersects(r: Rectangle): boolean { return !this.intersection(r).isEmpty(); }
  isEmpty(): boolean { return this.width <= 0 || this.height <= 0; }
  offset(dx: number, dy: number): void { this.x += dx; this.y += dy; }
  offsetPoint(p: Point): void { this.offset(p.x, p.y); }
  setEmpty(): void { this.x = this.y = this.width = this.height = 0; }
  setTo(x: number, y: number, w: number, h: number): void { this.x = x; this.y = y; this.width = w; this.height = h; }
  union(r: Rectangle): Rectangle {
    if (this.isEmpty()) return r.clone();
    if (r.isEmpty()) return this.clone();
    const x = Math.min(this.x, r.x), y = Math.min(this.y, r.y);
    return new Rectangle(x, y, Math.max(this.right, r.right) - x, Math.max(this.bottom, r.bottom) - y);
  }
  toString(): string { return `(x=${this.x}, y=${this.y}, w=${this.width}, h=${this.height})`; }
}
$class(Rectangle, "flash.geom.Rectangle");
