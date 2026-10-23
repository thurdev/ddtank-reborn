package flash.media
{
   import flash.events.EventDispatcher;
   
   [native(cls="AudioDeviceManagerClass",instance="AudioDeviceManagerObject",methods="auto",construct="native")]
   [API("724")]
   [Event(name="audioOutputChange",type="flash.events.AudioOutputChangeEvent")]
   public final class AudioDeviceManager extends EventDispatcher
   {
      
      public function AudioDeviceManager()
      {
         super();
      }
      
      public static function get audioDeviceManager() : AudioDeviceManager
      {
         return getInstance();
      }
      
      private static native function getInstance() : AudioDeviceManager;
      
      public static native function get isSupported() : Boolean;
      
      public native function get deviceNames() : Array;
      
      public native function get selectedDeviceIndex() : int;
      
      public native function set selectedDeviceIndex(param1:int) : void;
   }
}

