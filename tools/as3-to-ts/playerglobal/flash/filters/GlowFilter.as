package flash.filters
{
   [native(cls="GlowFilterClass",instance="GlowFilterObject",methods="auto")]
   public final class GlowFilter extends BitmapFilter
   {
      
      public function GlowFilter(color:uint = 16711680, alpha:Number = 1, blurX:Number = 6, blurY:Number = 6, strength:Number = 2, quality:int = 1, inner:Boolean = false, knockout:Boolean = false)
      {
         super();
         this.color = color;
         this.alpha = alpha;
         this.blurX = blurX;
         this.blurY = blurY;
         this.quality = quality;
         this.strength = strength;
         this.inner = inner;
         this.knockout = knockout;
      }
      
      public native function get color() : uint;
      
      public native function set color(param1:uint) : void;
      
      public native function get alpha() : Number;
      
      public native function set alpha(param1:Number) : void;
      
      public native function get blurX() : Number;
      
      public native function set blurX(param1:Number) : void;
      
      public native function get blurY() : Number;
      
      public native function set blurY(param1:Number) : void;
      
      public native function get inner() : Boolean;
      
      public native function set inner(param1:Boolean) : void;
      
      public native function get knockout() : Boolean;
      
      public native function set knockout(param1:Boolean) : void;
      
      public native function get quality() : int;
      
      public native function set quality(param1:int) : void;
      
      public native function get strength() : Number;
      
      public native function set strength(param1:Number) : void;
      
      override public function clone() : BitmapFilter
      {
         return new GlowFilter(this.color,this.alpha,this.blurX,this.blurY,this.strength,this.quality,this.inner,this.knockout);
      }
   }
}

