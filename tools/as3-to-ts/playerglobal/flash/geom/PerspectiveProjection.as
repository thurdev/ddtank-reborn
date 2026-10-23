package flash.geom
{
   [native(cls="PerspectiveProjectionClass",instance="PerspectiveProjectionObject",methods="auto")]
   [Version("10")]
   public class PerspectiveProjection
   {
      
      public function PerspectiveProjection()
      {
         super();
         this.ctor();
      }
      
      private native function ctor() : void;
      
      public native function get fieldOfView() : Number;
      
      public native function set fieldOfView(param1:Number) : void;
      
      public native function get projectionCenter() : Point;
      
      public native function set projectionCenter(param1:Point) : *;
      
      public native function get focalLength() : Number;
      
      public native function set focalLength(param1:Number) : void;
      
      public native function toMatrix3D() : Matrix3D;
   }
}

