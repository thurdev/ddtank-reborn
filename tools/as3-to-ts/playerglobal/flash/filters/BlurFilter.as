package flash.filters
{
   [native(cls="BlurFilterClass",instance="BlurFilterObject",methods="auto")]
   public final class BlurFilter extends BitmapFilter
   {
      
      public function BlurFilter(blurX:Number = 4, blurY:Number = 4, quality:int = 1)
      {
         super();
         this.blurX = blurX;
         this.blurY = blurY;
         this.quality = quality;
      }
      
      public native function get blurX() : Number;
      
      public native function set blurX(param1:Number) : void;
      
      public native function get blurY() : Number;
      
      public native function set blurY(param1:Number) : void;
      
      public native function get quality() : int;
      
      public native function set quality(param1:int) : void;
      
      override public function clone() : BitmapFilter
      {
         return new BlurFilter(this.blurX,this.blurY,this.quality);
      }
   }
}

