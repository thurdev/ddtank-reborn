package
{
   use namespace AS3;
   
   [native(cls="ArrayClass",gc="exact",instance="ArrayObject",methods="auto")]
   public dynamic class Array
   {
      
      public static const CASEINSENSITIVE:uint = 1;
      
      public static const DESCENDING:uint = 2;
      
      public static const UNIQUESORT:uint = 4;
      
      public static const RETURNINDEXEDARRAY:uint = 8;
      
      public static const NUMERIC:uint = 16;
      
      public static const length:int = 1;
      
      prototype.join = function(sep:* = undefined):String
      {
         return _join(this,sep);
      };
      prototype.pop = function():*
      {
         return _pop(this);
      };
      prototype.toString = function():String
      {
         var a:Array = this;
         return _join(a,",");
      };
      prototype.toLocaleString = function():String
      {
         var x:* = undefined;
         var a:Array = this;
         var out:String = "";
         var i:uint = 0;
         var n:uint = a.length;
         while(i < n)
         {
            x = a[i];
            if(x != null)
            {
               out += x.toLocaleString();
            }
            if(i + 1 < n)
            {
               out += ",";
            }
            i++;
         }
         return out;
      };
      prototype.push = function(... args):uint
      {
         var n:uint = uint(this.length);
         var i:uint = 0;
         var argc:uint = uint(args.length);
         while(i < argc)
         {
            this[n++] = args[i];
            i++;
         }
         this.length = n;
         return n;
      };
      prototype.reverse = function():*
      {
         return _reverse(this);
      };
      prototype.concat = function(... args):Array
      {
         return _concat(this,args);
      };
      prototype.shift = function():*
      {
         return _shift(this);
      };
      prototype.slice = function(A:* = 0, B:* = 4294967295):Array
      {
         return _slice(this,Number(A),Number(B));
      };
      prototype.unshift = function(... args):uint
      {
         var k:uint = 0;
         var d:uint = 0;
         if(this is Array)
         {
            return _unshift(this,args);
         }
         var len:uint = uint(this.length);
         var argc:uint = uint(args.length);
         for(k = len; k > 0; )
         {
            k--;
            d = k + argc;
            if(k in this)
            {
               this[d] = this[k];
            }
            else
            {
               delete this[d];
            }
         }
         for(var i:uint = 0; i < argc; i++)
         {
            this[k++] = args[i];
         }
         len += argc;
         this.length = len;
         return len;
      };
      prototype.splice = function(... args):*
      {
         if(!args.length)
         {
            return undefined;
         }
         return _splice(this,args);
      };
      prototype.sort = function(... args):*
      {
         return _sort(this,args);
      };
      prototype.sortOn = function(names:*, options:* = 0, ... ignored):*
      {
         return _sortOn(this,names,options);
      };
      prototype.indexOf = function(searchElement:*, fromIndex:* = 0):int
      {
         return _indexOf(this,searchElement,int(fromIndex));
      };
      prototype.lastIndexOf = function(searchElement:*, fromIndex:* = 2147483647):int
      {
         return _lastIndexOf(this,searchElement,int(fromIndex));
      };
      prototype.every = function(callback:Function, thisObject:* = null):Boolean
      {
         return _every(this,callback,thisObject);
      };
      prototype.filter = function(callback:Function, thisObject:* = null):Array
      {
         return _filter(this,callback,thisObject);
      };
      prototype.forEach = function(callback:Function, thisObject:* = null):void
      {
         _forEach(this,callback,thisObject);
      };
      prototype.map = function(callback:Function, thisObject:* = null):Array
      {
         return _map(this,callback,thisObject);
      };
      prototype.some = function(callback:Function, thisObject:* = null):Boolean
      {
         return _some(this,callback,thisObject);
      };
      _dontEnumPrototype(prototype);
      
      public function Array(... args)
      {
         var dlen:Number = NaN;
         var ulen:uint = 0;
         var i:uint = 0;
         super();
         var n:uint = uint(args.length);
         if(n == 1 && args[0] is Number)
         {
            dlen = Number(args[0]);
            ulen = dlen;
            if(ulen != dlen)
            {
               Error.throwError(RangeError,1005,dlen);
            }
            this.length = ulen;
         }
         else
         {
            this.length = n;
            for(i = 0; i < n; i++)
            {
               this[i] = args[i];
            }
         }
      }
      
      private static function _join(o:*, sep:*) : String
      {
         var x:* = undefined;
         var s:String = sep === undefined ? "," : String(sep);
         var out:String = "";
         var i:uint = 0;
         var n:uint = uint(o.length);
         while(i < n)
         {
            x = o[i];
            if(x != null)
            {
               out += x;
            }
            if(i + 1 < n)
            {
               out += s;
            }
            i++;
         }
         return out;
      }
      
      private static native function _pop(param1:*) : *;
      
      private static native function _reverse(param1:*) : *;
      
      private static native function _concat(param1:*, param2:Array) : Array;
      
      private static native function _shift(param1:*) : *;
      
      private static native function _slice(param1:*, param2:Number, param3:Number) : Array;
      
      private static native function _unshift(param1:*, param2:Array) : uint;
      
      private static native function _splice(param1:*, param2:Array) : Array;
      
      private static native function _sort(param1:*, param2:Array) : *;
      
      private static native function _sortOn(param1:*, param2:*, param3:*) : *;
      
      private static native function _indexOf(param1:*, param2:*, param3:int) : int;
      
      private static native function _lastIndexOf(param1:*, param2:*, param3:int = 0) : int;
      
      private static native function _every(param1:*, param2:Function, param3:*) : Boolean;
      
      private static native function _filter(param1:*, param2:Function, param3:*) : Array;
      
      private static native function _forEach(param1:*, param2:Function, param3:*) : void;
      
      private static native function _map(param1:*, param2:Function, param3:*) : Array;
      
      private static native function _some(param1:*, param2:Function, param3:*) : Boolean;
      
      [API("708")]
      AS3 native function insertAt(param1:int, param2:*) : void;
      
      [API("708")]
      AS3 native function removeAt(param1:int) : *;
      
      public native function get length() : uint;
      
      public native function set length(param1:uint) : *;
      
      private function set_length(newLength:*, altLength:uint) : *
      {
         if(newLength is uint)
         {
            this.length = newLength;
         }
         else if(bugzilla(661330))
         {
            Error.throwError(RangeError,2108,newLength);
         }
         else
         {
            this.length = altLength;
         }
      }
      
      AS3 function join(sep:* = undefined) : String
      {
         return _join(this,sep);
      }
      
      AS3 native function pop() : *;
      
      AS3 native function push(... rest) : uint;
      
      AS3 function reverse() : Array
      {
         return _reverse(this);
      }
      
      AS3 function concat(... args) : Array
      {
         return _concat(this,args);
      }
      
      AS3 function shift() : *
      {
         return _shift(this);
      }
      
      AS3 function slice(A:* = 0, B:* = 4294967295) : Array
      {
         return _slice(this,Number(A),Number(B));
      }
      
      AS3 native function unshift(... rest) : uint;
      
      AS3 function splice(... args) : *
      {
         if(!args.length)
         {
            return undefined;
         }
         return _splice(this,args);
      }
      
      AS3 function sort(... args) : *
      {
         return _sort(this,args);
      }
      
      AS3 function sortOn(names:*, options:* = 0, ... ignored) : *
      {
         return _sortOn(this,names,options);
      }
      
      AS3 function indexOf(searchElement:*, fromIndex:* = 0) : int
      {
         return _indexOf(this,searchElement,int(fromIndex));
      }
      
      AS3 function lastIndexOf(searchElement:*, fromIndex:* = 2147483647) : int
      {
         return _lastIndexOf(this,searchElement,int(fromIndex));
      }
      
      AS3 function every(callback:Function, thisObject:* = null) : Boolean
      {
         return _every(this,callback,thisObject);
      }
      
      AS3 function filter(callback:Function, thisObject:* = null) : Array
      {
         return _filter(this,callback,thisObject);
      }
      
      AS3 function forEach(callback:Function, thisObject:* = null) : void
      {
         _forEach(this,callback,thisObject);
      }
      
      AS3 function map(callback:Function, thisObject:* = null) : Array
      {
         return _map(this,callback,thisObject);
      }
      
      AS3 function some(callback:Function, thisObject:* = null) : Boolean
      {
         return _some(this,callback,thisObject);
      }
   }
}

