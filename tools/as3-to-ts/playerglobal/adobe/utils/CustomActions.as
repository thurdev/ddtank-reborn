package adobe.utils
{
   [native(cls="CustomActionsClass",methods="auto",construct="none")]
   public final class CustomActions
   {
      
      public function CustomActions()
      {
         super();
      }
      
      public static native function installActions(param1:String, param2:String) : void;
      
      public static native function uninstallActions(param1:String) : void;
      
      public static native function get actionsList() : Array;
      
      public static native function getActions(param1:String) : String;
   }
}

