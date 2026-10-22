package flash.ui
{
   [native(cls="MouseClass",gc="exact",methods="auto",construct="none")]
   public final class Mouse
   {
      
      public function Mouse()
      {
         super();
      }
      
      public static native function hide() : void;
      
      public static native function show() : void;
      
      [Version("10.1")]
      public static native function get supportsCursor() : Boolean;
      
      [Version("10")]
      public static native function get cursor() : String;
      
      [Version("10")]
      public static native function set cursor(param1:String) : void;
      
      [API("670")]
      public static native function registerCursor(param1:String, param2:MouseCursorData) : void;
      
      [API("670")]
      public static native function unregisterCursor(param1:String) : void;
      
      [API("670")]
      public static native function get supportsNativeCursor() : Boolean;
   }
}

