/**
 * `flash.geom.Transform` — `obj.transform`. Ler devolve cópias; atribuir
 * aplica no objeto (igual ao Flash: `obj.transform.matrix.tx = 5` não faz nada,
 * tem que reatribuir `obj.transform.matrix = m`).
 */
import { $class } from "../as3";
import { ColorTransform } from "./ColorTransform";
import { Matrix } from "./Matrix";
import { Rectangle } from "./Rectangle";

export class Transform {
  $obj: any;
  constructor(displayObject: any) {
    this.$obj = displayObject;
  }
  get matrix(): Matrix { return this.$obj.$m.clone(); }
  set matrix(m: Matrix) { if (m) this.$obj.$setMatrix(m); }
  get colorTransform(): ColorTransform { return this.$obj.$colorTransform.clone(); }
  set colorTransform(c: ColorTransform) {
    this.$obj.$colorTransform = c ? c.clone() : new ColorTransform();
    this.$obj.$applyColor();
  }
  get concatenatedMatrix(): Matrix { return this.$obj.$concatMatrix(); }
  get concatenatedColorTransform(): ColorTransform {
    const c = new ColorTransform();
    for (let o = this.$obj; o; o = o.$parent) if (o.$colorTransform) c.concat(o.$colorTransform);
    return c;
  }
  get pixelBounds(): Rectangle { return this.$obj.getBounds(this.$obj.$stage); }
  get matrix3D(): any { return null; }
  set matrix3D(_v: any) {}
  get perspectiveProjection(): any { return null; }
  set perspectiveProjection(_v: any) {}
  getRelativeMatrix3D(_relativeTo: any): any { return null; }
}
$class(Transform, "flash.geom.Transform");
