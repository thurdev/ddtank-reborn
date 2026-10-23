package flash.events
{
   [Version("10.1")]
   public class UncaughtErrorEvent extends ErrorEvent
   {
      
      public static const UNCAUGHT_ERROR:String = "uncaughtError";
      
      private var _error:*;
      
      public function UncaughtErrorEvent(type:String = "uncaughtError", bubbles:Boolean = true, cancelable:Boolean = true, error_in:* = null)
      {
         super(type,bubbles,cancelable);
         this._error = error_in;
      }
      
      override public function clone() : Event
      {
         return new UncaughtErrorEvent(type,bubbles,cancelable,this._error);
      }
      
      public function get error() : *
      {
         return this._error;
      }
      
      override public function toString() : String
      {
         return formatToString("UncaughtErrorEvent","type","bubbles","cancelable","eventPhase");
      }
   }
}

