package flash.globalization
{
   [native(cls="CurrencyFormatterClass",instance="CurrencyFormatterObject",methods="auto")]
   [Version("10.1")]
   public final class CurrencyFormatter
   {
      
      public function CurrencyFormatter(requestedLocaleIDName:String)
      {
         super();
         this.ctor(requestedLocaleIDName);
      }
      
      public static native function getAvailableLocaleIDNames() : Vector.<String>;
      
      private native function ctor(param1:String) : void;
      
      public native function get currencyISOCode() : String;
      
      public native function get currencySymbol() : String;
      
      public native function setCurrency(param1:String, param2:String) : void;
      
      public function format(value:Number, withCurrencySymbol:Boolean = false) : String
      {
         return this.formatImplementation(value,withCurrencySymbol);
      }
      
      private native function formatImplementation(param1:Number, param2:Boolean) : String;
      
      public native function formattingWithCurrencySymbolIsSafe(param1:String) : Boolean;
      
      public native function parse(param1:String) : CurrencyParseResult;
      
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
      
      public native function get negativeCurrencyFormat() : uint;
      
      public native function set negativeCurrencyFormat(param1:uint) : void;
      
      public native function get positiveCurrencyFormat() : uint;
      
      public native function set positiveCurrencyFormat(param1:uint) : void;
      
      public native function get leadingZero() : Boolean;
      
      public native function set leadingZero(param1:Boolean) : void;
      
      public native function get trailingZeros() : Boolean;
      
      public native function set trailingZeros(param1:Boolean) : void;
   }
}

