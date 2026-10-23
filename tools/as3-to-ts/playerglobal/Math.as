package
{
   [native(cls="MathClass",classgc="exact",instance="double",methods="auto",construct="override")]
   public final class Math
   {
      
      public static const E:Number = 2.718281828459045;
      
      public static const LN10:Number = 2.302585092994046;
      
      public static const LN2:Number = 0.6931471805599453;
      
      public static const LOG10E:Number = 0.4342944819032518;
      
      public static const LOG2E:Number = 1.4426950408889634;
      
      public static const PI:Number = 3.141592653589793;
      
      public static const SQRT1_2:Number = 0.7071067811865476;
      
      public static const SQRT2:Number = 1.4142135623730951;
      
      private static const NegInfinity:Number = -1 / 0;
      
      public function Math()
      {
         super();
      }
      
      private static native function _min(param1:Number, param2:Number) : Number;
      
      private static native function _max(param1:Number, param2:Number) : Number;
      
      public static native function abs(param1:Number) : Number;
      
      public static native function acos(param1:Number) : Number;
      
      public static native function asin(param1:Number) : Number;
      
      public static native function atan(param1:Number) : Number;
      
      public static native function ceil(param1:Number) : Number;
      
      public static native function cos(param1:Number) : Number;
      
      public static native function exp(param1:Number) : Number;
      
      public static native function floor(param1:Number) : Number;
      
      public static native function log(param1:Number) : Number;
      
      public static native function round(param1:Number) : Number;
      
      public static native function sin(param1:Number) : Number;
      
      public static native function sqrt(param1:Number) : Number;
      
      public static native function tan(param1:Number) : Number;
      
      public static native function atan2(param1:Number, param2:Number) : Number;
      
      public static native function pow(param1:Number, param2:Number) : Number;
      
      public static native function max(param1:Number = -Infinity, param2:Number = -Infinity, ... rest) : Number;
      
      public static native function min(param1:Number = Infinity, param2:Number = Infinity, ... rest) : Number;
      
      public static native function random() : Number;
   }
}

