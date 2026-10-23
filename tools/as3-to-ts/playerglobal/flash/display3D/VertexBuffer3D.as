package flash.display3D
{
   import flash.utils.ByteArray;
   
   [native(cls="VertexBuffer3DClass",instance="VertexBuffer3DObject",methods="auto",construct="native")]
   [API("674")]
   public class VertexBuffer3D
   {
      
      public function VertexBuffer3D()
      {
         super();
      }
      
      public native function uploadFromVector(param1:Vector.<Number>, param2:int, param3:int) : void;
      
      public native function uploadFromByteArray(param1:ByteArray, param2:int, param3:int, param4:int) : void;
      
      public native function dispose() : void;
   }
}

