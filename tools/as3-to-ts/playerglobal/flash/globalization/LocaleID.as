package flash.globalization
{
   [native(cls="LocaleIDClass",instance="LocaleIDObject",methods="auto")]
   [Version("10.1")]
   public final class LocaleID
   {
      
      public static const DEFAULT:String = "i-default";
      
      public function LocaleID(name:String)
      {
         super();
         this.ctor(name);
      }
      
      public static native function determinePreferredLocales(param1:Vector.<String>, param2:Vector.<String>, param3:String = "userinterface") : Vector.<String>;
      
      private native function ctor(param1:String) : void;
      
      public native function getLanguage() : String;
      
      public native function getRegion() : String;
      
      public native function getScript() : String;
      
      public native function getVariant() : String;
      
      public native function get name() : String;
      
      public native function getKeysAndValues() : Object;
      
      public native function get lastOperationStatus() : String;
      
      public native function isRightToLeft() : Boolean;
   }
}

