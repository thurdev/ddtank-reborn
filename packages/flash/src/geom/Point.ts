/** `flash.geom.Point` */
import { $class } from "../as3";

export class Point {
  constructor(public x = 0, public y = 0) {}

  get length(): number { return Math.sqrt(this.x * this.x + this.y * this.y); }

  static distance(a: Point, b: Point): number { return Math.hypot(a.x - b.x, a.y - b.y); }
  static interpolate(a: Point, b: Point, f: number): Point { return new Point(b.x + f * (a.x - b.x), b.y + f * (a.y - b.y)); }
  static polar(len: number, angle: number): Point { return new Point(len * Math.cos(angle), len * Math.sin(angle)); }

  add(p: Point): Point { return new Point(this.x + p.x, this.y + p.y); }
  subtract(p: Point): Point { return new Point(this.x - p.x, this.y - p.y); }
  clone(): Point { return new Point(this.x, this.y); }
  copyFrom(p: Point): void { this.x = p.x; this.y = p.y; }
  equals(p: Point): boolean { return !!p && p.x === this.x && p.y === this.y; }
  normalize(thickness: number): void {
    const l = this.length;
    if (l > 0) { const f = thickness / l; this.x *= f; this.y *= f; }
  }
  offset(dx: number, dy: number): void { this.x += dx; this.y += dy; }
  setTo(x: number, y: number): void { this.x = x; this.y = y; }
  toString(): string { return `(x=${this.x}, y=${this.y})`; }
}
$class(Point, "flash.geom.Point");
