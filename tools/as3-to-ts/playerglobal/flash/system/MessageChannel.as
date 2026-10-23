package flash.system
{
   import flash.events.*;
   
   [native(cls="MessageChannelClass",instance="MessageChannelObject",gc="exact",methods="auto",construct="native")]
   [API("682")]
   [Event(name="channelState",type="flash.events.Event")]
   [Event(name="channelMessage",type="flash.events.Event")]
   public final class MessageChannel extends EventDispatcher
   {
      
      public function MessageChannel()
      {
         super();
      }
      
      public native function send(param1:*, param2:int = -1) : void;
      
      public native function get messageAvailable() : Boolean;
      
      public native function receive(param1:Boolean = false) : *;
      
      override public function addEventListener(type:String, listener:Function, useCapture:Boolean = false, priority:int = 0, useWeakReference:Boolean = false) : void
      {
         this.internalAddEventListener(type,listener,useCapture,priority,useWeakReference);
      }
      
      override public function removeEventListener(type:String, listener:Function, useCapture:Boolean = false) : void
      {
         this.internalRemoveEventListener(type,listener);
      }
      
      public native function close() : void;
      
      public native function get state() : String;
      
      override public function toString() : String
      {
         return "[object MessageChannel]";
      }
      
      private native function internalRemoveEventListener(param1:String, param2:Function, param3:Boolean = false) : void;
      
      private native function internalAddEventListener(param1:String, param2:Function, param3:Boolean = false, param4:int = 0, param5:Boolean = false) : void;
   }
}

