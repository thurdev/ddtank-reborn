package flash.globalization
{
   [native(cls="CurrencyParseResultClass",instance="CurrencyParseResultObject",methods="auto")]
   [Version("10.1")]
   public final class CurrencyParseResult
   {
      
      public function CurrencyParseResult(value:Number = NaN, symbol:String = "")
      {
         super();
         this.ctor(value,symbol);
      }
      
      private native function ctor(param1:Number, param2:String) : void;
      
      public native function get value() : Number;
      
      public native function get currencyString() : String;
   }
}

