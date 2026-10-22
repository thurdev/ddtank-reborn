package flash.ui
{
   import flash.utils.ByteArray;
   
   [native(cls="GameInputDeviceClass",instance="GameInputDeviceObject",methods="auto",construct="native")]
   [API("688")]
   public final class GameInputDevice
   {
      
      public static const MAX_BUFFER_SIZE:int = 32000;
      
      public function GameInputDevice()
      {
         super();
      }
      
      public native function getControlAt(param1:int) : GameInputControl;
      
      public native function get numControls() : int;
      
      public native function startCachingSamples(param1:int, param2:Vector.<String>) : void;
      
      public native function get sampleInterval() : int;
      
      public native function set sampleInterval(param1:int) : void;
      
      public native function stopCachingSamples() : void;
      
      public native function getCachedSamples(param1:ByteArray, param2:Boolean = false) : int;
      
      public native function get enabled() : Boolean;
      
      public native function set enabled(param1:Boolean) : void;
      
      public native function get id() : String;
      
      public native function get name() : String;
   }
}

