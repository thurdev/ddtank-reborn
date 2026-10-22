package
{
   use namespace AS3;
   
   [native(cls="RegExpClass",gc="exact",instance="RegExpObject",methods="auto",construct="override")]
   public dynamic class RegExp
   {
      
      public static const length:int = 1;
      
      prototype.toString = function():String
      {
         var r:RegExp = this;
         var out:String = "/" + r.source + "/";
         if(r.global)
         {
            out += "g";
         }
         if(r.ignoreCase)
         {
            out += "i";
         }
         if(r.multiline)
         {
            out += "m";
         }
         if(r.dotall)
         {
            out += "s";
         }
         if(r.extended)
         {
            out += "x";
         }
         return out;
      };
      prototype.exec = function(s:* = ""):*
      {
         var r:RegExp = this;
         return r.exec(String(s));
      };
      prototype.test = function(s:* = ""):Boolean
      {
         var r:RegExp = this;
         return r.test(String(s));
      };
      _dontEnumPrototype(prototype);
      
      public function RegExp(pattern:* = undefined, options:* = undefined)
      {
         super();
      }
      
      public native function get source() : String;
      
      public native function get global() : Boolean;
      
      public native function get ignoreCase() : Boolean;
      
      public native function get multiline() : Boolean;
      
      public native function get lastIndex() : int;
      
      public native function set lastIndex(param1:int) : *;
      
      public native function get dotall() : Boolean;
      
      public native function get extended() : Boolean;
      
      AS3 native function exec(param1:String = "") : *;
      
      AS3 function test(s:String = "") : Boolean
      {
         return this.exec(s) != null;
      }
   }
}

