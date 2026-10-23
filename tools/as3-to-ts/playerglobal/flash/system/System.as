package flash.system
{
   [native(cls="SystemClass",methods="auto",construct="none")]
   public final class System
   {
      
      private static var theIME:IME = null;
      
      public function System()
      {
         super();
      }
      
      public static native function get ime() : IME;
      
      public static native function setClipboard(param1:String) : void;
      
      public static function get totalMemory() : uint
      {
         return totalMemoryNumber as uint;
      }
      
      public static native function get totalMemoryNumber() : Number;
      
      public static native function get freeMemory() : Number;
      
      public static native function get privateMemory() : Number;
      
      [API("674")]
      public static native function get processCPUUsage() : Number;
      
      public static native function get useCodePage() : Boolean;
      
      public static native function set useCodePage(param1:Boolean) : void;
      
      [Inspectable(environment="none")]
      public static native function get vmVersion() : String;
      
      public static native function pause() : void;
      
      public static native function resume() : void;
      
      public static native function exit(param1:uint) : void;
      
      public static native function gc() : void;
      
      public static native function pauseForGCIfCollectionImminent(param1:Number = 0.75) : void;
      
      [API("667")]
      public static native function disposeXML(param1:XML) : void;
   }
}

