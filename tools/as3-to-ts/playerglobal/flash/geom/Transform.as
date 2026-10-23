package flash.geom
{
   import flash.display.DisplayObject;
   
   [native(cls="TransformClass",gc="exact",instance="TransformObject",methods="auto")]
   public class Transform
   {
      
      public function Transform(displayObject:DisplayObject)
      {
         super();
         this.ctor(displayObject);
      }
      
      public native function get matrix() : Matrix;
      
      public native function set matrix(param1:Matrix) : void;
      
      public native function get colorTransform() : ColorTransform;
      
      public native function set colorTransform(param1:ColorTransform) : void;
      
      public native function get concatenatedMatrix() : Matrix;
      
      public native function get concatenatedColorTransform() : ColorTransform;
      
      public native function get pixelBounds() : Rectangle;
      
      private native function ctor(param1:DisplayObject) : void;
      
      [Version("10")]
      public native function get matrix3D() : Matrix3D;
      
      [Version("10")]
      public native function set matrix3D(param1:Matrix3D) : *;
      
      [Version("10")]
      public native function getRelativeMatrix3D(param1:DisplayObject) : Matrix3D;
      
      [Version("10")]
      public native function get perspectiveProjection() : PerspectiveProjection;
      
      [Version("10")]
      public native function set perspectiveProjection(param1:PerspectiveProjection) : void;
   }
}

