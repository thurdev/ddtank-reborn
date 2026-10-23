package flash.ui
{
   import flash.display.BitmapData;
   import flash.geom.Point;
   
   [native(cls="MouseCursorDataClass",instance="MouseCursorDataObject",methods="auto")]
   [API("670")]
   public final class MouseCursorData
   {
      
      public function MouseCursorData()
      {
         super();
      }
      
      public native function get data() : Vector.<BitmapData>;
      
      public native function set data(param1:Vector.<BitmapData>) : void;
      
      public native function get hotSpot() : Point;
      
      public native function set hotSpot(param1:Point) : void;
      
      public native function get frameRate() : Number;
      
      public native function set frameRate(param1:Number) : void;
   }
}

