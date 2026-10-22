package
{
   use namespace AS3;
   
   [native(cls="ObjectClass",classgc="exact",methods="auto",construct="override")]
   public dynamic class Object
   {
      
      public static const length:int = 1;
      
      public function Object()
      {
      }
      
      private static native function _hasOwnProperty(param1:*, param2:String) : Boolean;
      
      private static native function _propertyIsEnumerable(param1:*, param2:String) : Boolean;
      
      protected static native function _setPropertyIsEnumerable(param1:*, param2:String, param3:Boolean) : void;
      
      private static native function _isPrototypeOf(param1:*, param2:*) : Boolean;
      
      private static native function _toString(param1:*) : String;
      
      protected static function _dontEnumPrototype(proto:Object) : void
      {
         var name:String = null;
         for(name in proto)
         {
            _setPropertyIsEnumerable(proto,name,false);
         }
      }
      
      internal static function init() : *
      {
      }
      
      [API("736")]
      public static function _init() : *
      {
         prototype.hasOwnProperty = function(V:* = undefined):Boolean
         {
            return this.hasOwnProperty(V);
         };
         prototype.propertyIsEnumerable = function(V:* = undefined):*
         {
            return this.propertyIsEnumerable(V);
         };
         prototype.setPropertyIsEnumerable = function(name:String, enumerable:Boolean):void
         {
            _setPropertyIsEnumerable(this,name,enumerable);
         };
         prototype.isPrototypeOf = function(V:* = undefined):Boolean
         {
            return this.isPrototypeOf(V);
         };
         prototype.toString = prototype.toLocaleString = function():String
         {
            return _toString(this);
         };
         prototype.valueOf = function():*
         {
            return this;
         };
         _dontEnumPrototype(prototype);
      }
      
      AS3 function isPrototypeOf(V:* = undefined) : Boolean
      {
         return _isPrototypeOf(this,V);
      }
      
      AS3 function hasOwnProperty(V:* = undefined) : Boolean
      {
         return _hasOwnProperty(this,V);
      }
      
      AS3 function propertyIsEnumerable(V:* = undefined) : Boolean
      {
         return _propertyIsEnumerable(this,V);
      }
   }
}

