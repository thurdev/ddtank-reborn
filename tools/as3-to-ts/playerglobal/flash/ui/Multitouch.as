package flash.ui
{
   [native(cls="MultitouchClass",methods="auto",construct="none")]
   [Version("10.1")]
   public final class Multitouch
   {
      
      public function Multitouch()
      {
         super();
      }
      
      public static native function get inputMode() : String;
      
      public static native function set inputMode(param1:String) : void;
      
      public static native function get supportsTouchEvents() : Boolean;
      
      public static native function get supportsGestureEvents() : Boolean;
      
      public static native function get supportedGestures() : Vector.<String>;
      
      public static native function get maxTouchPoints() : int;
      
      [API("675")]
      public static native function get mapTouchToMouse() : Boolean;
      
      [API("675")]
      public static native function set mapTouchToMouse(param1:Boolean) : void;
   }
}

