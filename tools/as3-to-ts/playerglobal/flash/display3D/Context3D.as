package flash.display3D
{
   import flash.display.BitmapData;
   import flash.display3D.textures.*;
   import flash.events.EventDispatcher;
   import flash.geom.Matrix3D;
   import flash.geom.Rectangle;
   import flash.utils.ByteArray;
   
   [native(cls="Context3DClass",instance="Context3DObject",methods="auto",construct="native")]
   [API("674")]
   public final class Context3D extends EventDispatcher
   {
      
      public function Context3D()
      {
         super();
      }
      
      [API("706")]
      public static native function get supportsVideoTexture() : Boolean;
      
      public native function get driverInfo() : String;
      
      [API("712")]
      public native function get totalGPUMemory() : Number;
      
      public native function dispose(param1:Boolean = true) : void;
      
      public native function get enableErrorChecking() : Boolean;
      
      public native function set enableErrorChecking(param1:Boolean) : void;
      
      public native function configureBackBuffer(param1:int, param2:int, param3:int, param4:Boolean = true, param5:Boolean = false, param6:Boolean = false) : void;
      
      public native function clear(param1:Number = 0, param2:Number = 0, param3:Number = 0, param4:Number = 1, param5:Number = 1, param6:uint = 0, param7:uint = 4294967295) : void;
      
      public native function drawTriangles(param1:IndexBuffer3D, param2:int = 0, param3:int = -1) : void;
      
      public native function present() : void;
      
      public native function setProgram(param1:Program3D) : void;
      
      public native function setProgramConstantsFromVector(param1:String, param2:int, param3:Vector.<Number>, param4:int = -1) : void;
      
      public native function setProgramConstantsFromMatrix(param1:String, param2:int, param3:Matrix3D, param4:Boolean = false) : void;
      
      [API("676")]
      public native function setProgramConstantsFromByteArray(param1:String, param2:int, param3:int, param4:ByteArray, param5:uint) : void;
      
      public native function setVertexBufferAt(param1:int, param2:VertexBuffer3D, param3:int = 0, param4:String = "float4") : void;
      
      public native function setBlendFactors(param1:String, param2:String) : void;
      
      public native function setColorMask(param1:Boolean, param2:Boolean, param3:Boolean, param4:Boolean) : void;
      
      public native function setDepthTest(param1:Boolean, param2:String) : void;
      
      public function setTextureAt(sampler:int, texture:TextureBase) : void
      {
         if(texture == null)
         {
            this.setTextureInternal(sampler,null);
         }
         else if(texture is Texture)
         {
            this.setTextureInternal(sampler,texture as Texture);
         }
         else if(texture is CubeTexture)
         {
            this.setCubeTextureInternal(sampler,texture as CubeTexture);
         }
         else if(texture is RectangleTexture)
         {
            this.setRectangleTextureInternal(sampler,texture as RectangleTexture);
         }
         else if(texture is VideoTexture)
         {
            this.setVideoTextureInternal(sampler,texture as VideoTexture);
         }
      }
      
      public function setRenderToTexture(texture:TextureBase, enableDepthAndStencil:Boolean = false, antiAlias:int = 0, surfaceSelector:int = 0, colorOutputIndex:int = 0) : void
      {
         var targetType:uint = 0;
         if(texture is Texture)
         {
            targetType = 1;
         }
         else if(texture is CubeTexture)
         {
            targetType = 2;
         }
         else if(texture is RectangleTexture)
         {
            targetType = 3;
         }
         else if(texture != null)
         {
            throw new ArgumentError("texture argument not derived from TextureBase (can be Texture, CubeTexture, or if supported, RectangleTexture)");
         }
         this.setRenderToTextureInternal(texture,targetType,enableDepthAndStencil,antiAlias,surfaceSelector,colorOutputIndex);
      }
      
      public native function setRenderToBackBuffer() : void;
      
      private native function setRenderToTextureInternal(param1:TextureBase, param2:int, param3:Boolean, param4:int, param5:int, param6:int) : void;
      
      public native function setCulling(param1:String) : void;
      
      public native function setStencilActions(param1:String = "frontAndBack", param2:String = "always", param3:String = "keep", param4:String = "keep", param5:String = "keep") : void;
      
      public native function setStencilReferenceValue(param1:uint, param2:uint = 255, param3:uint = 255) : void;
      
      public native function setScissorRectangle(param1:Rectangle) : void;
      
      public native function createVertexBuffer(param1:int, param2:int, param3:String = "staticDraw") : VertexBuffer3D;
      
      public native function createIndexBuffer(param1:int, param2:String = "staticDraw") : IndexBuffer3D;
      
      public native function createTexture(param1:int, param2:int, param3:String, param4:Boolean, param5:int = 0) : Texture;
      
      public native function createCubeTexture(param1:int, param2:String, param3:Boolean, param4:int = 0) : CubeTexture;
      
      [API("690")]
      public native function createRectangleTexture(param1:int, param2:int, param3:String, param4:Boolean) : RectangleTexture;
      
      public native function createProgram() : Program3D;
      
      [API("686")]
      public native function setSamplerStateAt(param1:int, param2:String, param3:String, param4:String) : void;
      
      [API("692")]
      public native function get profile() : String;
      
      private native function setTextureInternal(param1:int, param2:Texture) : void;
      
      private native function setCubeTextureInternal(param1:int, param2:CubeTexture) : void;
      
      private native function setRectangleTextureInternal(param1:int, param2:RectangleTexture) : void;
      
      private native function setVideoTextureInternal(param1:int, param2:VideoTexture) : void;
      
      [API("700")]
      public native function get backBufferWidth() : int;
      
      [API("700")]
      public native function get backBufferHeight() : int;
      
      [API("700")]
      public native function get maxBackBufferWidth() : int;
      
      [API("700")]
      public native function set maxBackBufferWidth(param1:int) : void;
      
      [API("700")]
      public native function get maxBackBufferHeight() : int;
      
      [API("700")]
      public native function set maxBackBufferHeight(param1:int) : void;
      
      [API("706")]
      public native function createVideoTexture() : VideoTexture;
      
      public native function drawToBitmapData(param1:BitmapData) : void;
   }
}

