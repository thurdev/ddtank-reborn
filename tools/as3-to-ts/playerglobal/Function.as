package
{
   use namespace AS3;
   
   [native(cls="FunctionClass",gc="exact",instance="FunctionObject",methods="auto",construct="instance")]
   public dynamic class Function
   {
      
      public static const length:int = 1;
      
      prototype.toLocaleString = prototype.toString = function():String
      {
         var f:* = this;
         return "function Function() {}";
      };
      prototype.call = function(thisArg:* = undefined, ... args):*
      {
         var f:Function = this;
         return f.apply(thisArg,args);
      };
      prototype.apply = function(thisArg:* = undefined, argArray:* = undefined):*
      {
         var f:Function = this;
         return f.apply(thisArg,argArray);
      };
      _dontEnumPrototype(prototype);
      
      public function Function()
      {
         super();
      }
      
      [cppcall]
      [API("736")]
      public static function createEmptyFunction() : Function
      {
         return function():*
         {
         };
      }
      
      public native function get prototype() : *;
      
      public native function set prototype(param1:*) : *;
      
      public native function get length() : int;
      
      AS3 native function call(param1:* = undefined, ... rest) : *;
      
      AS3 native function apply(param1:* = undefined, param2:* = undefined) : *;
   }
}

[native(cls="MethodClosureClass",gc="exact",instance="MethodClosure",methods="auto",construct="instance")]
final class MethodClosure extends Function
{
   
   public function MethodClosure()
   {
      super();
   }
   
   override public function get prototype() : *
   {
      return null;
   }
   
   override public function set prototype(p:*) : *
   {
      Error.throwError(ReferenceError,1074,"prototype","MethodClosure");
   }
}
