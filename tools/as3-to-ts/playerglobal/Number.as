package
{
   use namespace AS3;
   
   [native(cls="NumberClass",classgc="exact",instance="double",methods="auto",construct="override")]
   public final class Number
   {
      
      public static const length:int = 1;
      
      public static const NaN:Number = 0 / 0;
      
      public static const NEGATIVE_INFINITY:Number = -1 / 0;
      
      public static const POSITIVE_INFINITY:Number = 1 / 0;
      
      public static const MIN_VALUE:Number = _minValue();
      
      public static const MAX_VALUE:Number = 1.7976931348623157e+308;
      
      [API("680")]
      public static const E:Number = 2.718281828459045;
      
      [API("680")]
      public static const LN10:Number = 2.302585092994046;
      
      [API("680")]
      public static const LN2:Number = 0.6931471805599453;
      
      [API("680")]
      public static const LOG10E:Number = 0.4342944819032518;
      
      [API("680")]
      public static const LOG2E:Number = 1.4426950408889634;
      
      [API("680")]
      public static const PI:Number = 3.141592653589793;
      
      [API("680")]
      public static const SQRT1_2:Number = 0.7071067811865476;
      
      [API("680")]
      public static const SQRT2:Number = 1.4142135623730951;
      
      private static const DTOSTR_FIXED:int = 1;
      
      private static const DTOSTR_PRECISION:int = 2;
      
      private static const DTOSTR_EXPONENTIAL:int = 3;
      
      prototype.toLocaleString = prototype.toString = function(radix:* = 10):String
      {
         if(this === prototype)
         {
            return "0";
         }
         if(!(this is Number))
         {
            Error.throwError(TypeError,1004,"Number.prototype.toString");
         }
         return _numberToString(this,radix);
      };
      prototype.valueOf = function():*
      {
         if(this === prototype)
         {
            return 0;
         }
         if(!(this is Number))
         {
            Error.throwError(TypeError,1004,"Number.prototype.valueOf");
         }
         return this;
      };
      prototype.toExponential = function(p:* = 0):String
      {
         return _convert(Number(this),int(p),DTOSTR_EXPONENTIAL);
      };
      prototype.toPrecision = function(p:* = 0):String
      {
         if(p == undefined)
         {
            return this.toString();
         }
         return _convert(Number(this),int(p),DTOSTR_PRECISION);
      };
      prototype.toFixed = function(p:* = 0):String
      {
         return _convert(Number(this),int(p),DTOSTR_FIXED);
      };
      _dontEnumPrototype(prototype);
      
      public function Number(value:* = 0)
      {
         super();
      }
      
      [API("680")]
      public static native function abs(param1:Number) : Number;
      
      [API("680")]
      public static native function acos(param1:Number) : Number;
      
      [API("680")]
      public static native function asin(param1:Number) : Number;
      
      [API("680")]
      public static native function atan(param1:Number) : Number;
      
      [API("680")]
      public static native function ceil(param1:Number) : Number;
      
      [API("680")]
      public static native function cos(param1:Number) : Number;
      
      [API("680")]
      public static native function exp(param1:Number) : Number;
      
      [API("680")]
      public static native function floor(param1:Number) : Number;
      
      [API("680")]
      public static native function log(param1:Number) : Number;
      
      [API("680")]
      public static native function round(param1:Number) : Number;
      
      [API("680")]
      public static native function sin(param1:Number) : Number;
      
      [API("680")]
      public static native function sqrt(param1:Number) : Number;
      
      [API("680")]
      public static native function tan(param1:Number) : Number;
      
      [API("680")]
      public static native function atan2(param1:Number, param2:Number) : Number;
      
      [API("680")]
      public static native function pow(param1:Number, param2:Number) : Number;
      
      [API("680")]
      public static native function max(param1:Number = -Infinity, param2:Number = -Infinity, ... rest) : Number;
      
      [API("680")]
      public static native function min(param1:Number = Infinity, param2:Number = Infinity, ... rest) : Number;
      
      [API("680")]
      public static native function random() : Number;
      
      private static native function _numberToString(param1:Number, param2:int) : String;
      
      private static native function _convert(param1:Number, param2:int, param3:int) : String;
      
      private static native function _minValue() : Number;
      
      AS3 function toString(radix:* = 10) : String
      {
         return _numberToString(this,radix);
      }
      
      AS3 function valueOf() : Number
      {
         return this;
      }
      
      AS3 function toExponential(p:* = 0) : String
      {
         return _convert(this,int(p),DTOSTR_EXPONENTIAL);
      }
      
      AS3 function toPrecision(p:* = 0) : String
      {
         if(p == undefined)
         {
            return this.toString();
         }
         return _convert(this,int(p),DTOSTR_PRECISION);
      }
      
      AS3 function toFixed(p:* = 0) : String
      {
         return _convert(this,int(p),DTOSTR_FIXED);
      }
   }
}

