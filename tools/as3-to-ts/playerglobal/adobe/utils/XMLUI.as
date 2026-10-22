package adobe.utils
{
   [native(cls="XMLUIClass",methods="auto",construct="none")]
   public final class XMLUI
   {
      
      public function XMLUI()
      {
         super();
      }
      
      public static native function getProperty(param1:String) : String;
      
      public static native function setProperty(param1:String, param2:String) : void;
      
      public static native function accept() : void;
      
      public static native function cancel() : void;
   }
}

