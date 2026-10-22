package flash.globalization
{
   [native(cls="CollatorClass",instance="CollatorObject",methods="auto")]
   [Version("10.1")]
   public final class Collator
   {
      
      public function Collator(requestedLocaleIDName:String, initialMode:String = "sorting")
      {
         super();
         this.ctor(requestedLocaleIDName,initialMode);
      }
      
      public static native function getAvailableLocaleIDNames() : Vector.<String>;
      
      private native function ctor(param1:String, param2:String) : void;
      
      public native function get ignoreCase() : Boolean;
      
      public native function set ignoreCase(param1:Boolean) : void;
      
      public native function get ignoreDiacritics() : Boolean;
      
      public native function set ignoreDiacritics(param1:Boolean) : void;
      
      public native function get ignoreKanaType() : Boolean;
      
      public native function set ignoreKanaType(param1:Boolean) : void;
      
      public native function get ignoreSymbols() : Boolean;
      
      public native function set ignoreSymbols(param1:Boolean) : void;
      
      public native function get ignoreCharacterWidth() : Boolean;
      
      public native function set ignoreCharacterWidth(param1:Boolean) : void;
      
      public native function get numericComparison() : Boolean;
      
      public native function set numericComparison(param1:Boolean) : void;
      
      public native function compare(param1:String, param2:String) : int;
      
      public native function equals(param1:String, param2:String) : Boolean;
      
      public native function get lastOperationStatus() : String;
      
      public native function get actualLocaleIDName() : String;
      
      public native function get requestedLocaleIDName() : String;
   }
}

