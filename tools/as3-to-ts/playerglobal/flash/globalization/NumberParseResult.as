package flash.globalization
{
   [native(cls="NumberParseResultClass",instance="NumberParseResultObject",methods="auto")]
   [Version("10.1")]
   public final class NumberParseResult
   {
      
      public function NumberParseResult(value:Number = NaN, startIndex:int = 2147483647, endIndex:int = 2147483647)
      {
         super();
         this.ctor(value,startIndex,endIndex);
      }
      
      private native function ctor(param1:Number, param2:int, param3:int) : void;
      
      public native function get value() : Number;
      
      public native function get startIndex() : int;
      
      public native function get endIndex() : int;
   }
}

