package flash.filters
{
   [native(cls="GradientGlowFilterClass",instance="GradientGlowFilterObject",methods="auto")]
   public final class GradientGlowFilter extends BitmapFilter
   {
      
      public function GradientGlowFilter(distance:Number = 4, angle:Number = 45, colors:Array = null, alphas:Array = null, ratios:Array = null, blurX:Number = 4, blurY:Number = 4, strength:Number = 1, quality:int = 1, type:String = "inner", knockout:Boolean = false)
      {
         super();
         this.distance = distance;
         this.angle = angle;
         if(colors != null)
         {
            this.colors = colors;
         }
         if(alphas != null)
         {
            this.alphas = alphas;
         }
         if(ratios != null)
         {
            this.ratios = ratios;
         }
         this.blurX = blurX;
         this.blurY = blurY;
         this.quality = quality;
         this.strength = strength;
         this.type = type;
         this.knockout = knockout;
      }
      
      public native function get angle() : Number;
      
      public native function set angle(param1:Number) : void;
      
      public native function get alphas() : Array;
      
      public native function set alphas(param1:Array) : void;
      
      public native function get blurX() : Number;
      
      public native function set blurX(param1:Number) : void;
      
      public native function get blurY() : Number;
      
      public native function set blurY(param1:Number) : void;
      
      public native function get colors() : Array;
      
      public native function set colors(param1:Array) : void;
      
      public native function get distance() : Number;
      
      public native function set distance(param1:Number) : void;
      
      public native function get knockout() : Boolean;
      
      public native function set knockout(param1:Boolean) : void;
      
      public native function get quality() : int;
      
      public native function set quality(param1:int) : void;
      
      public native function get ratios() : Array;
      
      public native function set ratios(param1:Array) : void;
      
      public native function get strength() : Number;
      
      public native function set strength(param1:Number) : void;
      
      public native function get type() : String;
      
      public native function set type(param1:String) : void;
      
      override public function clone() : BitmapFilter
      {
         return new GradientGlowFilter(this.distance,this.angle,this.colors,this.alphas,this.ratios,this.blurX,this.blurY,this.strength,this.quality,this.type,this.knockout);
      }
   }
}

