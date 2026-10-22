package flash.system
{
   [native(cls="FSCommandClass",methods="auto",construct="none")]
   internal final class FSCommand
   {
      
      public function FSCommand()
      {
         super();
      }
      
      public static native function _fscommand(param1:String, param2:String) : void;
   }
}

