package flash.accessibility
{
   import flash.display.DisplayObject;
   
   [native(cls="AccessibilityClass",methods="auto",construct="none")]
   public final class Accessibility
   {
      
      public function Accessibility()
      {
         super();
      }
      
      public static native function get active() : Boolean;
      
      [Inspectable(environment="none")]
      public static native function sendEvent(param1:DisplayObject, param2:uint, param3:uint, param4:Boolean = false) : void;
      
      public static native function updateProperties() : void;
   }
}

