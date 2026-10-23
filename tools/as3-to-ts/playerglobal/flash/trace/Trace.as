package flash.trace
{
   [native(cls="TraceClass",methods="auto",construct="none")]
   public class Trace
   {
      
      public static const OFF:int = 0;
      
      public static const METHODS:int = 1;
      
      public static const METHODS_WITH_ARGS:int = 2;
      
      public static const METHODS_AND_LINES:int = 3;
      
      public static const METHODS_AND_LINES_WITH_ARGS:int = 4;
      
      public static const FILE:* = 1;
      
      public static const LISTENER:* = 2;
      
      public function Trace()
      {
         super();
      }
      
      public static native function setLevel(param1:int, param2:int = 2) : *;
      
      public static native function getLevel(param1:int = 2) : int;
      
      public static native function setListener(param1:Function) : *;
      
      public static native function getListener() : Function;
   }
}

