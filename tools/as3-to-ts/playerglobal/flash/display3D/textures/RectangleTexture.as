package flash.display3D.textures
{
   import flash.display.BitmapData;
   import flash.utils.ByteArray;
   
   [native(cls="TextureRectangle3DClass",instance="TextureRectangle3DObject",methods="auto",construct="native")]
   public final class RectangleTexture extends TextureBase
   {
      
      public function RectangleTexture()
      {
         super();
      }
      
      [API("690")]
      public native function uploadFromBitmapData(param1:BitmapData) : void;
      
      [API("690")]
      public native function uploadFromByteArray(param1:ByteArray, param2:uint) : void;
   }
}

