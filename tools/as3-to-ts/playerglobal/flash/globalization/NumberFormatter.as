package flash.globalization
{
   [native(cls="NumberFormatterClass",instance="NumberFormatterObject",methods="auto")]
   [Version("10.1")]
   public final class NumberFormatter
   {
      
      public function NumberFormatter(requestedLocaleIDName:String)
      {
         super();
         this.ctor(requestedLocaleIDName);
      }
      
      public static native function getAvailableLocaleIDNames() : Vector.<String>;
      
      private native function ctor(param1:String) : void;
      
      public native function get lastOperationStatus() : String;
      
      public native function get requestedLocaleIDName() : String;
      
      public native function get actualLocaleIDName() : String;
      
      public native function get fractionalDigits() : int;
      
      public native function set fractionalDigits(param1:int) : void;
      
      public native function get useGrouping() : Boolean;
      
      public native function set useGrouping(param1:Boolean) : void;
      
      public native function get groupingPattern() : String;
      
      public native function set groupingPattern(param1:String) : void;
      
      public native function get digitsType() : uint;
      
      public native function set digitsType(param1:uint) : void;
      
      public native function get decimalSeparator() : String;
      
      public native function set decimalSeparator(param1:String) : void;
      
      public native function get groupingSeparator() : String;
      
      public native function set groupingSeparator(param1:String) : void;
      
      public native function get negativeSymbol() : String;
      
      public native function set negativeSymbol(param1:String) : void;
      
      public native function get negativeNumberFormat() : uint;
      
      public native function set negativeNumberFormat(param1:uint) : void;
      
      public native function get leadingZero() : Boolean;
      
      public native function set leadingZero(param1:Boolean) : void;
      
      public native function get trailingZeros() : Boolean;
      
      public native function set trailingZeros(param1:Boolean) : void;
      
      public native function parse(param1:String) : NumberParseResult;
      
      public native function parseNumber(param1:String) : Number;
      
      public native function formatInt(param1:int) : String;
      
      public native function formatUint(param1:uint) : String;
      
      public native function formatNumber(param1:Number) : String;
   }
}

