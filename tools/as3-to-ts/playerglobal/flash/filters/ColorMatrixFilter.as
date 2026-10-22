package flash.filters
{
   [native(cls="ColorMatrixFilterClass",instance="ColorMatrixFilterObject",methods="auto")]
   public final class ColorMatrixFilter extends BitmapFilter
   {
      
      public function ColorMatrixFilter(matrix:Array = null)
      {
         super();
         if(matrix != null)
         {
            this.matrix = matrix;
         }
      }
      
      public native function get matrix() : Array;
      
      public native function set matrix(param1:Array) : void;
      
      override public function clone() : BitmapFilter
      {
         return new ColorMatrixFilter(this.matrix);
      }
   }
}

