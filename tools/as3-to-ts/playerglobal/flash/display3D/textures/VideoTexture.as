package flash.display3D.textures
{
   import flash.media.Camera;
   import flash.net.NetStream;
   
   [native(cls="TextureVideo3DClass",instance="TextureVideo3DObject",methods="auto",construct="native")]
   [Event(name="renderState",type="flash.events.TextureVideoEvent")]
   public final class VideoTexture extends TextureBase
   {
      
      public function VideoTexture()
      {
         super();
      }
      
      [API("706")]
      public native function attachNetStream(param1:NetStream) : void;
      
      [API("706")]
      public native function attachCamera(param1:Camera) : void;
      
      [API("706")]
      public native function get videoWidth() : int;
      
      [API("706")]
      public native function get videoHeight() : int;
   }
}

