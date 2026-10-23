package flash.filters
{
   import flash.display.Shader;
   import flash.geom.Rectangle;
   
   [native(cls="ShaderFilterClass",instance="ShaderFilterObject",methods="auto")]
   [Version("10")]
   public class ShaderFilter extends BitmapFilter
   {
      
      public function ShaderFilter(shader:Shader = null)
      {
         super();
         if(Boolean(shader))
         {
            this.shader = shader;
         }
      }
      
      public native function get shader() : Shader;
      
      public native function set shader(param1:Shader) : void;
      
      public function get leftExtension() : int
      {
         return int(this._extendBy.left);
      }
      
      public function set leftExtension(v:int) : void
      {
         var e:Rectangle = this._extendBy;
         e.left = Number(v);
         this._extendBy = e;
      }
      
      public function get topExtension() : int
      {
         return int(this._extendBy.top);
      }
      
      public function set topExtension(v:int) : void
      {
         var e:Rectangle = this._extendBy;
         e.top = Number(v);
         this._extendBy = e;
      }
      
      public function get rightExtension() : int
      {
         return int(this._extendBy.right);
      }
      
      public function set rightExtension(v:int) : void
      {
         var e:Rectangle = this._extendBy;
         e.right = Number(v);
         this._extendBy = e;
      }
      
      public function get bottomExtension() : int
      {
         return int(this._extendBy.bottom);
      }
      
      public function set bottomExtension(v:int) : void
      {
         var e:Rectangle = this._extendBy;
         e.bottom = Number(v);
         this._extendBy = e;
      }
      
      private native function get _extendBy() : Rectangle;
      
      private native function set _extendBy(param1:Rectangle) : void;
   }
}

