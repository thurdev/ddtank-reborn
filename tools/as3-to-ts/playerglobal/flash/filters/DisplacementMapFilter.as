package flash.filters
{
   import flash.display.BitmapData;
   import flash.geom.Point;
   
   [native(cls="DisplacementMapFilterClass",instance="DisplacementMapFilterObject",methods="auto")]
   public final class DisplacementMapFilter extends BitmapFilter
   {
      
      public function DisplacementMapFilter(mapBitmap:BitmapData = null, mapPoint:Point = null, componentX:uint = 0, componentY:uint = 0, scaleX:Number = 0, scaleY:Number = 0, mode:String = "wrap", color:uint = 0, alpha:Number = 0)
      {
         super();
         if(mapBitmap != null)
         {
            this.mapBitmap = mapBitmap;
         }
         if(mapPoint != null)
         {
            this.mapPoint = mapPoint;
         }
         this.componentX = componentX;
         this.componentY = componentY;
         this.scaleX = scaleX;
         this.scaleY = scaleY;
         this.mode = mode;
         this.color = color;
         this.alpha = alpha;
      }
      
      public native function get mapBitmap() : BitmapData;
      
      public native function set mapBitmap(param1:BitmapData) : void;
      
      public native function get mapPoint() : Point;
      
      public native function set mapPoint(param1:Point) : void;
      
      public native function get componentX() : uint;
      
      public native function set componentX(param1:uint) : void;
      
      public native function get componentY() : uint;
      
      public native function set componentY(param1:uint) : void;
      
      public native function get scaleX() : Number;
      
      public native function set scaleX(param1:Number) : void;
      
      public native function get scaleY() : Number;
      
      public native function set scaleY(param1:Number) : void;
      
      public native function get mode() : String;
      
      public native function set mode(param1:String) : void;
      
      public native function get color() : uint;
      
      public native function set color(param1:uint) : void;
      
      public native function get alpha() : Number;
      
      public native function set alpha(param1:Number) : void;
      
      override public function clone() : BitmapFilter
      {
         return new DisplacementMapFilter(this.mapBitmap,this.mapPoint,this.componentX,this.componentY,this.scaleX,this.scaleY,this.mode,this.color,this.alpha);
      }
   }
}

