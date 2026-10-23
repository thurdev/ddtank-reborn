package flash.filters
{
   [native(cls="BevelFilterClass",instance="BevelFilterObject",methods="auto")]
   public final class BevelFilter extends BitmapFilter
   {
      
      public function BevelFilter(distance:Number = 4, angle:Number = 45, highlightColor:uint = 16777215, highlightAlpha:Number = 1, shadowColor:uint = 0, shadowAlpha:Number = 1, blurX:Number = 4, blurY:Number = 4, strength:Number = 1, quality:int = 1, type:String = "inner", knockout:Boolean = false)
      {
         super();
         this.distance = distance;
         this.angle = angle;
         this.highlightColor = highlightColor;
         this.highlightAlpha = highlightAlpha;
         this.shadowColor = shadowColor;
         this.shadowAlpha = shadowAlpha;
         this.blurX = blurX;
         this.blurY = blurY;
         this.quality = quality;
         this.strength = strength;
         this.type = type;
         this.knockout = knockout;
      }
      
      public native function get distance() : Number;
      
      public native function set distance(param1:Number) : void;
      
      public native function get angle() : Number;
      
      public native function set angle(param1:Number) : void;
      
      public native function get highlightColor() : uint;
      
      public native function set highlightColor(param1:uint) : void;
      
      public native function get highlightAlpha() : Number;
      
      public native function set highlightAlpha(param1:Number) : void;
      
      public native function get shadowColor() : uint;
      
      public native function set shadowColor(param1:uint) : void;
      
      public native function get shadowAlpha() : Number;
      
      public native function set shadowAlpha(param1:Number) : void;
      
      public native function get blurX() : Number;
      
      public native function set blurX(param1:Number) : void;
      
      public native function get blurY() : Number;
      
      public native function set blurY(param1:Number) : void;
      
      public native function get knockout() : Boolean;
      
      public native function set knockout(param1:Boolean) : void;
      
      public native function get quality() : int;
      
      public native function set quality(param1:int) : void;
      
      public native function get strength() : Number;
      
      public native function set strength(param1:Number) : void;
      
      public native function get type() : String;
      
      public native function set type(param1:String) : void;
      
      override public function clone() : BitmapFilter
      {
         return new BevelFilter(this.distance,this.angle,this.highlightColor,this.highlightAlpha,this.shadowColor,this.shadowAlpha,this.blurX,this.blurY,this.strength,this.quality,this.type,this.knockout);
      }
   }
}

