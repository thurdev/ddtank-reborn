package flash.display3D
{
   import flash.utils.ByteArray;
   
   [native(cls="Program3DClass",instance="Program3DObject",methods="auto",construct="native")]
   [API("674")]
   public final class Program3D
   {
      
      public function Program3D()
      {
         super();
      }
      
      public native function upload(param1:ByteArray, param2:ByteArray) : void;
      
      public native function dispose() : void;
   }
}

