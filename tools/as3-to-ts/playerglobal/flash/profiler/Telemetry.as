package flash.profiler
{
   [native(cls="TelemetryClass",gc="exact",instance="TelemetryObject",methods="auto")]
   [API("678")]
   public final class Telemetry
   {
      
      public function Telemetry()
      {
         super();
      }
      
      public static native function get spanMarker() : Number;
      
      public static native function get connected() : Boolean;
      
      public static native function sendMetric(param1:String, param2:*) : void;
      
      public static native function sendSpanMetric(param1:String, param2:Number, param3:* = null) : void;
      
      public static native function registerCommandHandler(param1:String, param2:Function) : Boolean;
      
      public static native function unregisterCommandHandler(param1:String) : Boolean;
   }
}

