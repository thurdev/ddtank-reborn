package flash.display
{
   import flash.geom.Matrix;
   
   [Version("10")]
   public final class GraphicsBitmapFill implements IGraphicsFill, IGraphicsData
   {
      
      public var bitmapData:BitmapData;
      
      public var matrix:Matrix;
      
      public var repeat:Boolean;
      
      public var smooth:Boolean;
      
      public function GraphicsBitmapFill(bitmapData:BitmapData = null, matrix:Matrix = null, repeat:Boolean = true, smooth:Boolean = false)
      {
         super();
         this.bitmapData = bitmapData;
         this.matrix = matrix;
         this.repeat = repeat;
         this.smooth = smooth;
      }
   }
}

