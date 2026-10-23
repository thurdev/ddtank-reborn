package
{
   [native(cls="ErrorClass",gc="exact",instance="ErrorObject",methods="auto")]
   public dynamic class Error
   {
      
      public static const length:int = 1;
      
      prototype.name = "Error";
      prototype.message = "Error";
      prototype.toString = function():String
      {
         var e:Object = this;
         return e.message !== "" ? e.name + ": " + e.message : e.name;
      };
      _setPropertyIsEnumerable(prototype,"toString",false);
      
      public var message:*;
      
      public var name:*;
      
      private var _errorID:int;
      
      public function Error(message:* = "", id:* = 0)
      {
         super();
         this.message = message;
         this._errorID = id;
         this.name = prototype.name;
      }
      
      public static native function getErrorMessage(param1:int) : String;
      
      public static function throwError(type:Class, index:uint, ... rest) : *
      {
         var i:* = 0;
         var f:* = function(match:*, pos:*, string:*):*
         {
            var arg_num:* = -1;
            switch(match.charAt(1))
            {
               case "1":
                  arg_num = 0;
                  break;
               case "2":
                  arg_num = 1;
                  break;
               case "3":
                  arg_num = 2;
                  break;
               case "4":
                  arg_num = 3;
                  break;
               case "5":
                  arg_num = 4;
                  break;
               case "6":
                  arg_num = 5;
            }
            if(arg_num > -1 && rest.length > arg_num)
            {
               return rest[arg_num];
            }
            return "";
         };
         throw new type(Error.getErrorMessage(index).replace(/%[0-9]/g,f),index);
      }
      
      public native function getStackTrace() : String;
      
      public function get errorID() : int
      {
         return this._errorID;
      }
   }
}

