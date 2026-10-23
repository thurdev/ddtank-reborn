package flash.globalization
{
   [native(cls="StringToolsClass",instance="StringToolsObject",methods="auto")]
   [Version("10.1")]
   public final class StringTools
   {
      
      public function StringTools(requestedLocaleIDName:String)
      {
         super();
         this.ctor(requestedLocaleIDName);
      }
      
      public static native function getAvailableLocaleIDNames() : Vector.<String>;
      
      private native function ctor(param1:String) : void;
      
      public native function get lastOperationStatus() : String;
      
      public native function get requestedLocaleIDName() : String;
      
      public native function get actualLocaleIDName() : String;
      
      public native function toLowerCase(param1:String) : String;
      
      public native function toUpperCase(param1:String) : String;
   }
}

