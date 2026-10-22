package flash.display3D.textures
{
   import flash.events.EventDispatcher;
   
   [native(cls="TextureBase3DClass",instance="TextureBase3DObject",methods="auto")]
   [API("674")]
   public class TextureBase extends EventDispatcher
   {
      
      public function TextureBase()
      {
         super();
      }
      
      public native function dispose() : void;
   }
}

