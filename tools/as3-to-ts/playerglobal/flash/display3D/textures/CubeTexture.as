package flash.display3D.textures
{
   import flash.display.BitmapData;
   import flash.utils.ByteArray;
   
   [native(cls="TextureCube3DClass",instance="TextureCube3DObject",methods="auto",construct="native")]
   public final class CubeTexture extends TextureBase
   {
      
      public function CubeTexture()
      {
         super();
      }
      
      [API("674")]
      public native function uploadFromBitmapData(param1:BitmapData, param2:uint, param3:uint = 0) : void;
      
      [API("674")]
      public native function uploadFromByteArray(param1:ByteArray, param2:uint, param3:uint, param4:uint = 0) : void;
      
      [API("674")]
      public native function uploadCompressedTextureFromByteArray(param1:ByteArray, param2:uint, param3:Boolean = false) : void;
   }
}

