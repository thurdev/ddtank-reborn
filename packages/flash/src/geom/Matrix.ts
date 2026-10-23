/** `flash.geom.Matrix` — matriz afim 2D (a, b, c, d, tx, ty), mesma convenção do Flash. */
import { $class } from "../as3";
import { Point } from "./Point";

export class Matrix {
  a: number; b: number; c: number; d: number; tx: number; ty: number;
  constructor(a: number = 1, b: number = 0, c: number = 0, d: number = 1, tx: number = 0, ty: number = 0) {
    this.a = +a; this.b = +b; this.c = +c; this.d = +d; this.tx = +tx; this.ty = +ty;
  }

  clone(): Matrix { return new Matrix(this.a, this.b, this.c, this.d, this.tx, this.ty); }
  copyFrom(m: Matrix): void { this.a = m.a; this.b = m.b; this.c = m.c; this.d = m.d; this.tx = m.tx; this.ty = m.ty; }
  setTo(a: number, b: number, c: number, d: number, tx: number, ty: number): void {
    this.a = a; this.b = b; this.c = c; this.d = d; this.tx = tx; this.ty = ty;
  }
  identity(): void { this.setTo(1, 0, 0, 1, 0, 0); }

  /** this = this * m (aplica m depois) */
  concat(m: Matrix): void {
    const { a, b, c, d, tx, ty } = this;
    this.a = a * m.a + b * m.c;
    this.b = a * m.b + b * m.d;
    this.c = c * m.a + d * m.c;
    this.d = c * m.b + d * m.d;
    this.tx = tx * m.a + ty * m.c + m.tx;
    this.ty = tx * m.b + ty * m.d + m.ty;
  }
  invert(): void {
    const { a, b, c, d, tx, ty } = this;
    const det = a * d - b * c;
    if (det === 0) { this.setTo(0, 0, 0, 0, -tx, -ty); return; }
    this.a = d / det;
    this.b = -b / det;
    this.c = -c / det;
    this.d = a / det;
    this.tx = (c * ty - d * tx) / det;
    this.ty = (b * tx - a * ty) / det;
  }
  rotate(angle: number): void {
    const cos = Math.cos(angle), sin = Math.sin(angle);
    this.concat(new Matrix(cos, sin, -sin, cos, 0, 0));
  }
  scale(sx: number, sy: number): void { this.concat(new Matrix(sx, 0, 0, sy, 0, 0)); }
  translate(dx: number, dy: number): void { this.tx += dx; this.ty += dy; }
  createBox(sx: number, sy: number, rotation = 0, tx = 0, ty = 0): void {
    const cos = Math.cos(rotation), sin = Math.sin(rotation);
    this.setTo(sx * cos, sy * sin, -sx * sin, sy * cos, tx, ty);
  }
  createGradientBox(width: number, height: number, rotation = 0, tx = 0, ty = 0): void {
    this.createBox(width / 1638.4, height / 1638.4, rotation, tx + width / 2, ty + height / 2);
  }
  transformPoint(p: Point): Point { return new Point(this.a * p.x + this.c * p.y + this.tx, this.b * p.x + this.d * p.y + this.ty); }
  deltaTransformPoint(p: Point): Point { return new Point(this.a * p.x + this.c * p.y, this.b * p.x + this.d * p.y); }
  toString(): string { return `(a=${this.a}, b=${this.b}, c=${this.c}, d=${this.d}, tx=${this.tx}, ty=${this.ty})`; }
}
$class(Matrix, "flash.geom.Matrix");
