package com.adobe.tvsdk.mediacore.events
{
   import com.adobe.tvsdk.mediacore.PSDKEvent;
   import com.adobe.tvsdk.mediacore.PSDKEventTargetInterface;
   
   [native(cls="PSDKTimedEventClass",instance="PSDKTimedEventObject",methods="auto")]
   [API("712")]
   public class TimedEvent extends PSDKEvent
   {
      
      public static const TIMED_EVENT:int = 133;
      
      public function TimedEvent(type:int, target:PSDKEventTargetInterface = null)
      {
         super(type,target);
      }
      
      final public native function get name() : String;
      
      final public native function get description() : String;
      
      final public native function get duration() : Number;
      
      final public native function get childsDuration() : Number;
      
      final public native function get id() : uint;
      
      final public native function get parent() : TimedEvent;
   }
}

