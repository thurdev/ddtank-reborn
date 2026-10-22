package __AS3__.vec
{
   use namespace AS3;
   
   [native(cls="DoubleVectorClass",gc="exact",instance="DoubleVectorObject",methods="auto",construct="override")]
   internal final dynamic class Vector$double
   {
      
      prototype.push = function(... args):*
      {
         castToThisType(this);
         var v:Vector$double = this;
         if(v.fixed)
         {
            Error.throwError(RangeError,1126);
         }
         var n:uint = v.length;
         var i:uint = 0;
         var argc:uint = uint(args.length);
         while(i < argc)
         {
            v[n] = args[i];
            i++;
            n++;
         }
         v.length = n;
         return n;
      };
      prototype.toString = function():*
      {
         return castToThisType(this).toString();
      };
      prototype.toLocaleString = function():*
      {
         return castToThisType(this).toLocaleString();
      };
      prototype.join = function(separator:* = undefined):*
      {
         return castToThisType(this).join(separator == undefined ? "," : String(separator));
      };
      prototype.concat = function(... items):*
      {
         return castToThisType(this)._concat(items);
      };
      prototype.every = function(checker:*, thisObj:* = undefined):Boolean
      {
         return _every(castToThisType(this),checker,thisObj is Object ? thisObj : null);
      };
      prototype.filter = function(checker:*, thisObj:* = undefined):*
      {
         return castToThisType(this)._filter(checker,thisObj is Object ? thisObj : null);
      };
      prototype.forEach = function(eacher:*, thisObj:* = undefined):*
      {
         _forEach(castToThisType(this),eacher,thisObj is Object ? thisObj : null);
      };
      prototype.indexOf = function(value:*, from:* = undefined):*
      {
         return castToThisType(this).indexOf(value,Number(from));
      };
      prototype.lastIndexOf = function(value:*, from:* = undefined):*
      {
         return castToThisType(this).lastIndexOf(value,from == undefined ? Number(Infinity) : Number(from));
      };
      prototype.map = function(mapper:*, thisObj:* = undefined):*
      {
         return castToThisType(this)._map(mapper,thisObj is Object ? thisObj : null);
      };
      prototype.pop = function():*
      {
         return castToThisType(this).pop();
      };
      prototype.reverse = function():*
      {
         return castToThisType(this).reverse();
      };
      prototype.shift = function():*
      {
         return castToThisType(this).shift();
      };
      prototype.slice = function(start:* = undefined, end:* = undefined):*
      {
         return castToThisType(this)._slice(start == undefined ? 0 : Number(start),end == undefined ? 2147483647 : Number(end));
      };
      prototype.some = function(checker:*, thisObj:* = undefined):Boolean
      {
         return _some(castToThisType(this),checker,thisObj is Object ? thisObj : null);
      };
      prototype.sort = function(comparefn:*):*
      {
         var a:Array = [comparefn];
         return _sort(castToThisType(this),a);
      };
      prototype.splice = function(start:*, deleteCount:*, ... items):*
      {
         return castToThisType(this)._splice(Number(start),Number(deleteCount),items);
      };
      prototype.unshift = function(... items):*
      {
         return castToThisType(this).unshift.apply(this,items);
      };
      _dontEnumPrototype(prototype);
      
      public function Vector$double(length:uint = 0, fixed:Boolean = false)
      {
         super();
      }
      
      private static function castToThisType(item:*) : Vector$double
      {
         return item;
      }
      
      private static native function _every(param1:*, param2:Function, param3:*) : Boolean;
      
      private static native function _forEach(param1:*, param2:Function, param3:*) : void;
      
      private static native function _some(param1:*, param2:Function, param3:*) : Boolean;
      
      private static native function _sort(param1:*, param2:Array) : *;
      
      private native function newThisType() : Vector$double;
      
      public native function get length() : uint;
      
      public native function set length(param1:uint) : *;
      
      public native function set fixed(param1:Boolean) : *;
      
      public native function get fixed() : Boolean;
      
      AS3 function toString() : String
      {
         return this.join();
      }
      
      AS3 function toLocaleString() : String
      {
         var x:* = undefined;
         var limit:uint = this.length;
         var separator:String = ",";
         var s:String = "";
         var i:uint = 0;
         if(limit > 0)
         {
            while(true)
            {
               x = this[i];
               if(x !== undefined && x !== null)
               {
                  s += x.toLocaleString();
               }
               if(++i == limit)
               {
                  break;
               }
               s += separator;
            }
         }
         return s;
      }
      
      AS3 function join(separator:String = ",") : String
      {
         var y:uint = 0;
         var limit:uint = this.length;
         var s:String = "";
         var i:int = 0;
         if(limit > 0)
         {
            while(true)
            {
               y = uint(i);
               s += this[y];
               y = uint(++i);
               if(y == limit)
               {
                  break;
               }
               s += separator;
            }
         }
         return s;
      }
      
      private function _concat(items:Array) : *
      {
         var item:* = undefined;
         var insertPoint:uint = 0;
         var v:* = this.newThisType();
         v._spliceHelper(0,this.length,0,this,0);
         var bug504525:Boolean = Boolean(bugzilla(504525));
         var j:uint = 0;
         var limit:* = items.length;
         while(j < limit)
         {
            item = castToThisType(items[j]);
            insertPoint = bug504525 ? uint(v.length) : this.length;
            v._spliceHelper(insertPoint,item.length,0,item,0);
            j++;
         }
         return v;
      }
      
      AS3 function every(checker:Function, thisObj:Object = null) : Boolean
      {
         return _every(this,checker,thisObj is Object ? thisObj : null);
      }
      
      AS3 function forEach(eacher:Function, thisObj:Object = null) : void
      {
         _forEach(this,eacher,thisObj is Object ? thisObj : null);
      }
      
      AS3 function map(mapper:Function, thisObj:Object = null) : *
      {
         var result:* = this._map(mapper,thisObj is Object ? thisObj : null);
         return bugzilla(574600) ? result : undefined;
      }
      
      AS3 native function push(... rest) : uint;
      
      private native function _reverse() : void;
      
      AS3 function some(checker:*, thisObj:Object = null) : Boolean
      {
         return _some(this,checker,thisObj is Object ? thisObj : null);
      }
      
      private function _slice(start:Number = 0, end:Number = 2147483647) : *
      {
         var first:uint = uint(this.clamp(start,this.length));
         var limit:uint = uint(this.clamp(end,this.length));
         if(limit < first)
         {
            limit = first;
         }
         var result:* = this.newThisType();
         result._spliceHelper(0,limit - first,0,this,first);
         return result;
      }
      
      private function _splice(start:*, deleteCount:*, items:Array) : *
      {
         var first:uint = uint(this.clamp(start,this.length));
         var delcnt:uint = uint(this.clamp(deleteCount,this.length - first));
         var result:* = this.newThisType();
         result._spliceHelper(0,delcnt,0,this,first);
         this._spliceHelper(first,items.length,delcnt,items,0);
         return result;
      }
      
      private native function _spliceHelper(param1:uint, param2:uint, param3:uint, param4:Object, param5:uint) : void;
      
      AS3 native function unshift(... rest) : uint;
      
      private native function _filter(param1:Function, param2:*) : *;
      
      private native function _map(param1:Function, param2:*) : *;
      
      private function clamp(val:Number, len:uint) : uint
      {
         var result:uint = 0;
         if(val < 0)
         {
            if(val + len < 0)
            {
               result = 0;
            }
            else
            {
               result = uint(val + len);
            }
         }
         else if(val > len)
         {
            result = len;
         }
         else if(val != val)
         {
            result = 0;
         }
         else
         {
            result = uint(val);
         }
         return result;
      }
      
      AS3 function concat(... items) : Vector$double
      {
         return this._concat(items);
      }
      
      AS3 function filter(checker:Function, thisObj:Object = null) : Vector$double
      {
         return this._filter(checker,thisObj);
      }
      
      AS3 native function pop() : Number;
      
      AS3 function reverse() : Vector$double
      {
         this._reverse();
         return this;
      }
      
      AS3 native function shift() : Number;
      
      AS3 function slice(start:Number = 0, end:Number = 2147483647) : Vector$double
      {
         return this._slice(start,end);
      }
      
      AS3 function sort(comparefn:*) : Vector$double
      {
         var a:Array = [comparefn];
         _sort(this,a);
         return this;
      }
      
      AS3 function splice(start:Number, deleteCount:Number, ... items) : Vector$double
      {
         return this._splice(start,deleteCount,items);
      }
      
      [API("708")]
      AS3 native function insertAt(param1:int, param2:Number) : void;
      
      [API("708")]
      AS3 native function removeAt(param1:int) : Number;
      
      AS3 function indexOf(value:Number, from:Number = 0) : Number
      {
         var start:uint = uint(this.clamp(from,this.length));
         var i:uint = start;
         var limit:uint = this.length;
         while(i < limit)
         {
            if(this[i] === value)
            {
               return i;
            }
            i++;
         }
         return -1;
      }
      
      AS3 function lastIndexOf(value:Number, from:Number = 2147483647) : Number
      {
         var start:uint = uint(this.clamp(from,this.length));
         if(start == this.length)
         {
            start--;
         }
         for(var i:int = int(start); i >= 0; i--)
         {
            if(this[i] === value)
            {
               return i;
            }
         }
         return -1;
      }
   }
}

