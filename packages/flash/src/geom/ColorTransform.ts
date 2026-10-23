/** `flash.geom.ColorTransform` — cor final = cor * multiplicador + offset (por canal). */
import { $class } from "../as3";

export class ColorTransform {
  constructor(
    public redMultiplier = 1, public greenMultiplier = 1, public blueMultiplier = 1, public alphaMultiplier = 1,
    public redOffset = 0, public greenOffset = 0, public blueOffset = 0, public alphaOffset = 0,
  ) {}

  /** cor sólida: zera multiplicadores e usa o offset */
  get color(): number { return (this.redOffset << 16) | (this.greenOffset << 8) | this.blueOffset; }
  set color(v: number) {
    this.redMultiplier = this.greenMultiplier = this.blueMultiplier = 0;
    this.redOffset = (v >> 16) & 255;
    this.greenOffset = (v >> 8) & 255;
    this.blueOffset = v & 255;
  }

  concat(s: ColorTransform): void {
    this.redOffset += s.redOffset * this.redMultiplier;
    this.greenOffset += s.greenOffset * this.greenMultiplier;
    this.blueOffset += s.blueOffset * this.blueMultiplier;
    this.alphaOffset += s.alphaOffset * this.alphaMultiplier;
    this.redMultiplier *= s.redMultiplier;
    this.greenMultiplier *= s.greenMultiplier;
    this.blueMultiplier *= s.blueMultiplier;
    this.alphaMultiplier *= s.alphaMultiplier;
  }

  /** é identidade (nada a aplicar)? */
  get $isIdentity(): boolean {
    return this.redMultiplier === 1 && this.greenMultiplier === 1 && this.blueMultiplier === 1 && this.alphaMultiplier === 1 &&
      !this.redOffset && !this.greenOffset && !this.blueOffset && !this.alphaOffset;
  }

  clone(): ColorTransform {
    return new ColorTransform(this.redMultiplier, this.greenMultiplier, this.blueMultiplier, this.alphaMultiplier,
      this.redOffset, this.greenOffset, this.blueOffset, this.alphaOffset);
  }

  toString(): string {
    return `(redMultiplier=${this.redMultiplier}, greenMultiplier=${this.greenMultiplier}, blueMultiplier=${this.blueMultiplier}, alphaMultiplier=${this.alphaMultiplier}, redOffset=${this.redOffset}, greenOffset=${this.greenOffset}, blueOffset=${this.blueOffset}, alphaOffset=${this.alphaOffset})`;
  }
}
$class(ColorTransform, "flash.geom.ColorTransform");
