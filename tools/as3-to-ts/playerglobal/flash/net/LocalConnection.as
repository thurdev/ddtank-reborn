package flash.net
{
   import flash.events.EventDispatcher;
   
   [native(cls="LocalConnectionClass",gc="exact",instance="LocalConnectionObject",methods="auto")]
   [Event(name="status",type="flash.events.StatusEvent")]
   [Event(name="securityError",type="flash.events.SecurityErrorEvent")]
   [Event(name="asyncError",type="flash.events.AsyncErrorEvent")]
   public class LocalConnection extends EventDispatcher
   {
      
      public function LocalConnection()
      {
         super();
      }
      
      [API("667")]
      public static function get isSupported() : Boolean
      {
         return true;
      }
      
      public native function close() : void;
      
      public native function connect(param1:String) : void;
      
      public native function get domain() : String;
      
      public native function send(param1:String, param2:String, ... rest) : void;
      
      public native function get client() : Object;
      
      public native function set client(param1:Object) : void;
      
      public native function get isPerUser() : Boolean;
      
      public native function set isPerUser(param1:Boolean) : void;
      
      public native function allowDomain(... rest) : void;
      
      public native function allowInsecureDomain(... rest) : void;
   }
}

