package
{
   use namespace AS3;
   
   [native(cls="IntClass",classgc="exact",instance="int32_t",methods="auto",construct="override")]
   public final class int
   {
      
      public static const MIN_VALUE:int = -2147483648;
      
      public static const MAX_VALUE:int = 2147483647;
      
      public static const length:int = 1;
      
      prototype.toLocaleString = prototype.toString = function toString(radix:* = 10):String
      {
         if(this === prototype)
         {
            return "0";
         }
         if(!(this is int))
         {
            Error.throwError(TypeError,1004,"int.prototype.toString");
         }
         return Number(this).toString(radix);
      };
      prototype.valueOf = function():*
      {
         if(this === prototype)
         {
            return 0;
         }
         if(!(this is int))
         {
            Error.throwError(TypeError,1004,"int.prototype.valueOf");
         }
         return this;
      };
      prototype.toExponential = function(p:* = 0):String
      {
         return Number(this).toExponential(p);
      };
      prototype.toPrecision = function(p:* = 0):String
      {
         return Number(this).toPrecision(p);
      };
      prototype.toFixed = function(p:* = 0):String
      {
         return Number(this).toFixed(p);
      };
      _dontEnumPrototype(prototype);
      
      public function int(value:* = 0)
      {
         super();
      }
      
      AS3 function toString(radix:* = 10) : String
      {
         return Number(this).toString(radix);
      }
      
      AS3 function valueOf() : int
      {
         return this;
      }
      
      AS3 function toExponential(p:* = 0) : String
      {
         return Number(this).toExponential(p);
      }
      
      AS3 function toPrecision(p:* = 0) : String
      {
         return Number(this).toPrecision(p);
      }
      
      AS3 function toFixed(p:* = 0) : String
      {
         return Number(this).toFixed(p);
      }
   }
}

