package flash.sensors
{
   import flash.events.EventDispatcher;
   
   [native(cls="AccelerometerClass",instance="AccelerometerObject",methods="auto")]
   [Event(name="status",type="flash.events.StatusEvent")]
   [Event(name="update",type="flash.events.AccelerometerEvent")]
   [Version("10.1")]
   public class Accelerometer extends EventDispatcher
   {
      
      public function Accelerometer()
      {
         super();
      }
      
      public static native function get isSupported() : Boolean;
      
      public native function setRequestedUpdateInterval(param1:Number) : void;
      
      public native function get muted() : Boolean;
   }
}

