package flash.system
{
   import flash.events.EventDispatcher;
   
   [native(cls="IMEClass",instance="IMEObject",methods="auto",construct="native")]
   [Event(name="imeComposition",type="flash.events.IMEEvent")]
   public final class IME extends EventDispatcher
   {
      
      public function IME()
      {
         super();
      }
      
      public static native function get enabled() : Boolean;
      
      public static native function set enabled(param1:Boolean) : void;
      
      public static native function get conversionMode() : String;
      
      public static native function set conversionMode(param1:String) : void;
      
      public static native function setCompositionString(param1:String) : void;
      
      public static native function doConversion() : void;
      
      public static native function compositionSelectionChanged(param1:int, param2:int) : void;
      
      public static native function compositionAbandoned() : void;
      
      [Version("10.1")]
      public static function get isSupported() : Boolean
      {
         return _checkSupported();
      }
      
      private static native function _checkSupported() : Boolean;
   }
}

