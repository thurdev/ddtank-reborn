package flash.geom
{
   [native(cls="Utils3DClass",methods="auto",construct="none")]
   [Version("10")]
   public class Utils3D
   {
      
      public function Utils3D()
      {
         super();
      }
      
      public static native function projectVector(param1:Matrix3D, param2:Vector3D) : Vector3D;
      
      public static native function projectVectors(param1:Matrix3D, param2:Vector.<Number>, param3:Vector.<Number>, param4:Vector.<Number>) : void;
      
      public static native function pointTowards(param1:Number, param2:Matrix3D, param3:Vector3D, param4:Vector3D = null, param5:Vector3D = null) : Matrix3D;
   }
}

