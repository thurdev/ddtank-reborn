package flash.sensors
{
   import flash.events.EventDispatcher;
   
   [API("668")]
   [native(cls="GeolocationClass",instance="GeolocationObject",methods="auto")]
   [Event(name="permissionStatus",type="flash.events.PermissionEvent")]
   [Event(name="status",type="flash.events.StatusEvent")]
   [Event(name="update",type="flash.events.GeolocationEvent")]
   public class Geolocation extends EventDispatcher
   {
      
      public function Geolocation()
      {
         super();
      }
      
      public static native function get isSupported() : Boolean;
      
      public native function setRequestedUpdateInterval(param1:Number) : void;
      
      public native function get muted() : Boolean;
   }
}

