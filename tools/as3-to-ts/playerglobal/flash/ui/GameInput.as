package flash.ui
{
   import flash.events.EventDispatcher;
   
   [native(cls="GameInputClass",instance="GameInputObject",methods="auto")]
   [API("688")]
   [Event(name="deviceUnusable",type="flash.events.GameInputEvent")]
   [Event(name="deviceRemoved",type="flash.events.GameInputEvent")]
   [Event(name="deviceAdded",type="flash.events.GameInputEvent")]
   public final class GameInput extends EventDispatcher
   {
      
      public function GameInput()
      {
         super();
      }
      
      public static native function getDeviceAt(param1:int) : GameInputDevice;
      
      public static native function get numDevices() : int;
      
      public static native function get isSupported() : Boolean;
   }
}

