package flash.net
{
   import flash.events.EventDispatcher;
   
   [native(cls="NetMonitorClass",instance="NetMonitorObject",methods="auto")]
   [API("672")]
   [Event(name="netStreamCreate",type="flash.events.NetMonitorEvent")]
   public class NetMonitor extends EventDispatcher
   {
      
      public function NetMonitor()
      {
         super();
      }
      
      public native function listStreams() : Vector.<NetStream>;
   }
}

