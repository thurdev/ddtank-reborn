package flash.automation
{
   import flash.display.BitmapData;
   import flash.events.EventDispatcher;
   import flash.geom.Rectangle;
   
   [native(cls="StageCaptureClass",instance="StageCaptureObject",methods="auto")]
   [ExcludeClass]
   public class StageCapture extends EventDispatcher
   {
      
      public static const CURRENT:String = "current";
      
      public static const NEXT:String = "next";
      
      public static const MULTIPLE:String = "multiple";
      
      public static const RASTER:String = "raster";
      
      public static const STAGE:String = "stage";
      
      public static const SCREEN:String = "screen";
      
      public function StageCapture()
      {
         super();
      }
      
      public native function capture(param1:String) : void;
      
      public native function cancel() : void;
      
      public native function set fileNameBase(param1:String) : void;
      
      public native function get fileNameBase() : String;
      
      public native function set clipRect(param1:Rectangle) : void;
      
      public native function get clipRect() : Rectangle;
      
      public native function captureBitmapData() : BitmapData;
      
      public native function set captureSource(param1:String) : void;
      
      public native function get captureSource() : String;
      
      public native function set capturePTS(param1:Number) : void;
      
      public native function get capturePTS() : Number;
   }
}

