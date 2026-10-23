package flash.display3D
{
   import flash.utils.ByteArray;
   
   [native(cls="IndexBuffer3DClass",instance="IndexBuffer3DObject",methods="auto",construct="native")]
   [API("674")]
   public final class IndexBuffer3D
   {
      
      public function IndexBuffer3D()
      {
         super();
      }
      
      public native function uploadFromVector(param1:Vector.<uint>, param2:int, param3:int) : void;
      
      public native function uploadFromByteArray(param1:ByteArray, param2:int, param3:int, param4:int) : void;
      
      public native function dispose() : void;
   }
}

