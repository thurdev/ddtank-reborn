package flash.display
{
   [native(cls="BitmapClass",gc="exact",instance="BitmapObject",methods="auto")]
   public class Bitmap extends DisplayObject
   {
      
      public function Bitmap(bitmapData:BitmapData = null, pixelSnapping:String = "auto", smoothing:Boolean = false)
      {
         super();
         this.ctor(bitmapData,pixelSnapping,smoothing);
      }
      
      private native function ctor(param1:BitmapData, param2:String, param3:Boolean) : void;
      
      public native function get pixelSnapping() : String;
      
      public native function set pixelSnapping(param1:String) : void;
      
      public native function get smoothing() : Boolean;
      
      public native function set smoothing(param1:Boolean) : void;
      
      public native function get bitmapData() : BitmapData;
      
      public native function set bitmapData(param1:BitmapData) : void;
   }
}

