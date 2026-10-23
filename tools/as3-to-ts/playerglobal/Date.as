package
{
   use namespace AS3;
   
   [native(cls="DateClass",gc="exact",instance="DateObject",methods="auto",construct="override")]
   public dynamic class Date
   {
      
      public static const length:int = 7;
      
      prototype.setTime = function(t:* = undefined):Number
      {
         var d:Date = this;
         return d._setTime(t);
      };
      prototype.valueOf = function():*
      {
         var d:Date = this;
         return d.valueOf();
      };
      prototype.toString = function():String
      {
         var d:Date = this;
         return d._toString(0);
      };
      prototype.toDateString = function():String
      {
         var d:Date = this;
         return d.toDateString();
      };
      prototype.toTimeString = function():String
      {
         var d:Date = this;
         return d.toTimeString();
      };
      prototype.toLocaleString = function():String
      {
         var d:Date = this;
         return d.toLocaleString();
      };
      prototype.toLocaleDateString = function():String
      {
         var d:Date = this;
         return d.toLocaleDateString();
      };
      prototype.toLocaleTimeString = function():String
      {
         var d:Date = this;
         return d.toLocaleTimeString();
      };
      prototype.toUTCString = function():String
      {
         var d:Date = this;
         return d.toUTCString();
      };
      prototype.toJSON = function(k:String):*
      {
         var d:Date = this;
         return d.toString();
      };
      prototype.getUTCFullYear = function():Number
      {
         var d:Date = this;
         return d.getUTCFullYear();
      };
      prototype.getUTCMonth = function():Number
      {
         var d:Date = this;
         return d.getUTCMonth();
      };
      prototype.getUTCDate = function():Number
      {
         var d:Date = this;
         return d.getUTCDate();
      };
      prototype.getUTCDay = function():Number
      {
         var d:Date = this;
         return d.getUTCDay();
      };
      prototype.getUTCHours = function():Number
      {
         var d:Date = this;
         return d.getUTCHours();
      };
      prototype.getUTCMinutes = function():Number
      {
         var d:Date = this;
         return d.getUTCMinutes();
      };
      prototype.getUTCSeconds = function():Number
      {
         var d:Date = this;
         return d.getUTCSeconds();
      };
      prototype.getUTCMilliseconds = function():Number
      {
         var d:Date = this;
         return d.getUTCMilliseconds();
      };
      prototype.getFullYear = function():Number
      {
         var d:Date = this;
         return d.getFullYear();
      };
      prototype.getMonth = function():Number
      {
         var d:Date = this;
         return d.getMonth();
      };
      prototype.getDate = function():Number
      {
         var d:Date = this;
         return d.getDate();
      };
      prototype.getDay = function():Number
      {
         var d:Date = this;
         return d.getDay();
      };
      prototype.getHours = function():Number
      {
         var d:Date = this;
         return d.getHours();
      };
      prototype.getMinutes = function():Number
      {
         var d:Date = this;
         return d.getMinutes();
      };
      prototype.getSeconds = function():Number
      {
         var d:Date = this;
         return d.getSeconds();
      };
      prototype.getMilliseconds = function():Number
      {
         var d:Date = this;
         return d.getMilliseconds();
      };
      prototype.getTimezoneOffset = function():Number
      {
         var d:Date = this;
         return d.getTimezoneOffset();
      };
      prototype.getTime = function():Number
      {
         var d:Date = this;
         return d.getTime();
      };
      prototype.setFullYear = function(year:* = undefined, month:* = undefined, date:* = undefined):Number
      {
         var d:Date = this;
         return d.setFullYear.apply(d,arguments);
      };
      prototype.setMonth = function(month:* = undefined, date:* = undefined):Number
      {
         var d:Date = this;
         return d.setMonth.apply(d,arguments);
      };
      prototype.setDate = function(date:* = undefined):Number
      {
         var d:Date = this;
         return d.setDate.apply(d,arguments);
      };
      prototype.setHours = function(hour:* = undefined, min:* = undefined, sec:* = undefined, ms:* = undefined):Number
      {
         var d:Date = this;
         return d.setHours.apply(d,arguments);
      };
      prototype.setMinutes = function(min:* = undefined, sec:* = undefined, ms:* = undefined):Number
      {
         var d:Date = this;
         return d.setMinutes.apply(d,arguments);
      };
      prototype.setSeconds = function(sec:* = undefined, ms:* = undefined):Number
      {
         var d:Date = this;
         return d.setSeconds.apply(d,arguments);
      };
      prototype.setMilliseconds = function(ms:* = undefined):Number
      {
         var d:Date = this;
         return d.setMilliseconds.apply(d,arguments);
      };
      prototype.setUTCFullYear = function(year:* = undefined, month:* = undefined, date:* = undefined):Number
      {
         var d:Date = this;
         return d.setUTCFullYear.apply(d,arguments);
      };
      prototype.setUTCMonth = function(month:* = undefined, date:* = undefined):Number
      {
         var d:Date = this;
         return d.setUTCMonth.apply(d,arguments);
      };
      prototype.setUTCDate = function(date:* = undefined):Number
      {
         var d:Date = this;
         return d.setUTCDate.apply(d,arguments);
      };
      prototype.setUTCHours = function(hour:* = undefined, min:* = undefined, sec:* = undefined, ms:* = undefined):Number
      {
         var d:Date = this;
         return d.setUTCHours.apply(d,arguments);
      };
      prototype.setUTCMinutes = function(min:* = undefined, sec:* = undefined, ms:* = undefined):Number
      {
         var d:Date = this;
         return d.setUTCMinutes.apply(d,arguments);
      };
      prototype.setUTCSeconds = function(sec:* = undefined, ms:* = undefined):Number
      {
         var d:Date = this;
         return d.setUTCSeconds.apply(d,arguments);
      };
      prototype.setUTCMilliseconds = function(ms:* = undefined):Number
      {
         var d:Date = this;
         return d.setUTCMilliseconds.apply(d,arguments);
      };
      _dontEnumPrototype(prototype);
      
      public function Date(year:* = undefined, month:* = undefined, date:* = undefined, hours:* = undefined, minutes:* = undefined, seconds:* = undefined, ms:* = undefined)
      {
         super();
      }
      
      public static native function parse(param1:*) : Number;
      
      public static native function UTC(param1:*, param2:*, param3:* = 1, param4:* = 0, param5:* = 0, param6:* = 0, param7:* = 0, ... rest) : Number;
      
      AS3 native function valueOf() : Number;
      
      private native function _toString(param1:int) : String;
      
      private native function _setTime(param1:Number) : Number;
      
      private native function _get(param1:int) : Number;
      
      AS3 function setTime(t:* = undefined) : Number
      {
         return this._setTime(t);
      }
      
      AS3 function toString() : String
      {
         return this._toString(0);
      }
      
      AS3 function toDateString() : String
      {
         return this._toString(1);
      }
      
      AS3 function toTimeString() : String
      {
         return this._toString(2);
      }
      
      AS3 function toLocaleString() : String
      {
         return this._toString(3);
      }
      
      AS3 function toLocaleDateString() : String
      {
         return this._toString(4);
      }
      
      AS3 function toLocaleTimeString() : String
      {
         return this._toString(5);
      }
      
      AS3 function toUTCString() : String
      {
         return this._toString(6);
      }
      
      AS3 native function getUTCFullYear() : Number;
      
      AS3 native function getUTCMonth() : Number;
      
      AS3 native function getUTCDate() : Number;
      
      AS3 native function getUTCDay() : Number;
      
      AS3 native function getUTCHours() : Number;
      
      AS3 native function getUTCMinutes() : Number;
      
      AS3 native function getUTCSeconds() : Number;
      
      AS3 native function getUTCMilliseconds() : Number;
      
      AS3 native function getFullYear() : Number;
      
      AS3 native function getMonth() : Number;
      
      AS3 native function getDate() : Number;
      
      AS3 native function getDay() : Number;
      
      AS3 native function getHours() : Number;
      
      AS3 native function getMinutes() : Number;
      
      AS3 native function getSeconds() : Number;
      
      AS3 native function getMilliseconds() : Number;
      
      AS3 native function getTimezoneOffset() : Number;
      
      AS3 native function getTime() : Number;
      
      private native function _setFullYear(... rest) : Number;
      
      private native function _setMonth(... rest) : Number;
      
      private native function _setDate(... rest) : Number;
      
      private native function _setHours(... rest) : Number;
      
      private native function _setMinutes(... rest) : Number;
      
      private native function _setSeconds(... rest) : Number;
      
      private native function _setMilliseconds(... rest) : Number;
      
      private native function _setUTCFullYear(... rest) : Number;
      
      private native function _setUTCMonth(... rest) : Number;
      
      private native function _setUTCDate(... rest) : Number;
      
      private native function _setUTCHours(... rest) : Number;
      
      private native function _setUTCMinutes(... rest) : Number;
      
      private native function _setUTCSeconds(... rest) : Number;
      
      private native function _setUTCMilliseconds(... rest) : Number;
      
      AS3 function setFullYear(year:* = undefined, month:* = undefined, date:* = undefined) : Number
      {
         return this._setFullYear.apply(this,arguments);
      }
      
      AS3 function setMonth(month:* = undefined, date:* = undefined) : Number
      {
         return this._setMonth.apply(this,arguments);
      }
      
      AS3 function setDate(date:* = undefined) : Number
      {
         return this._setDate.apply(this,arguments);
      }
      
      AS3 function setHours(hour:* = undefined, min:* = undefined, sec:* = undefined, ms:* = undefined) : Number
      {
         return this._setHours.apply(this,arguments);
      }
      
      AS3 function setMinutes(min:* = undefined, sec:* = undefined, ms:* = undefined) : Number
      {
         return this._setMinutes.apply(this,arguments);
      }
      
      AS3 function setSeconds(sec:* = undefined, ms:* = undefined) : Number
      {
         return this._setSeconds.apply(this,arguments);
      }
      
      AS3 function setMilliseconds(ms:* = undefined) : Number
      {
         return this._setMilliseconds.apply(this,arguments);
      }
      
      AS3 function setUTCFullYear(year:* = undefined, month:* = undefined, date:* = undefined) : Number
      {
         return this._setUTCFullYear.apply(this,arguments);
      }
      
      AS3 function setUTCMonth(month:* = undefined, date:* = undefined) : Number
      {
         return this._setUTCMonth.apply(this,arguments);
      }
      
      AS3 function setUTCDate(date:* = undefined) : Number
      {
         return this._setUTCDate.apply(this,arguments);
      }
      
      AS3 function setUTCHours(hour:* = undefined, min:* = undefined, sec:* = undefined, ms:* = undefined) : Number
      {
         return this._setUTCHours.apply(this,arguments);
      }
      
      AS3 function setUTCMinutes(min:* = undefined, sec:* = undefined, ms:* = undefined) : Number
      {
         return this._setUTCMinutes.apply(this,arguments);
      }
      
      AS3 function setUTCSeconds(sec:* = undefined, ms:* = undefined) : Number
      {
         return this._setUTCSeconds.apply(this,arguments);
      }
      
      AS3 function setUTCMilliseconds(ms:* = undefined) : Number
      {
         return this._setUTCMilliseconds.apply(this,arguments);
      }
      
      public function get fullYear() : Number
      {
         return this.getFullYear();
      }
      
      public function set fullYear(value:Number) : *
      {
         this.setFullYear(value);
      }
      
      public function get month() : Number
      {
         return this.getMonth();
      }
      
      public function set month(value:Number) : *
      {
         this.setMonth(value);
      }
      
      public function get date() : Number
      {
         return this.getDate();
      }
      
      public function set date(value:Number) : *
      {
         this.setDate(value);
      }
      
      public function get hours() : Number
      {
         return this.getHours();
      }
      
      public function set hours(value:Number) : *
      {
         this.setHours(value);
      }
      
      public function get minutes() : Number
      {
         return this.getMinutes();
      }
      
      public function set minutes(value:Number) : *
      {
         this.setMinutes(value);
      }
      
      public function get seconds() : Number
      {
         return this.getSeconds();
      }
      
      public function set seconds(value:Number) : *
      {
         this.setSeconds(value);
      }
      
      public function get milliseconds() : Number
      {
         return this.getMilliseconds();
      }
      
      public function set milliseconds(value:Number) : *
      {
         this.setMilliseconds(value);
      }
      
      public function get fullYearUTC() : Number
      {
         return this.getUTCFullYear();
      }
      
      public function set fullYearUTC(value:Number) : *
      {
         this.setUTCFullYear(value);
      }
      
      public function get monthUTC() : Number
      {
         return this.getUTCMonth();
      }
      
      public function set monthUTC(value:Number) : *
      {
         this.setUTCMonth(value);
      }
      
      public function get dateUTC() : Number
      {
         return this.getUTCDate();
      }
      
      public function set dateUTC(value:Number) : *
      {
         this.setUTCDate(value);
      }
      
      public function get hoursUTC() : Number
      {
         return this.getUTCHours();
      }
      
      public function set hoursUTC(value:Number) : *
      {
         this.setUTCHours(value);
      }
      
      public function get minutesUTC() : Number
      {
         return this.getUTCMinutes();
      }
      
      public function set minutesUTC(value:Number) : *
      {
         this.setUTCMinutes(value);
      }
      
      public function get secondsUTC() : Number
      {
         return this.getUTCSeconds();
      }
      
      public function set secondsUTC(value:Number) : *
      {
         this.setUTCSeconds(value);
      }
      
      public function get millisecondsUTC() : Number
      {
         return this.getUTCMilliseconds();
      }
      
      public function set millisecondsUTC(value:Number) : *
      {
         this.setUTCMilliseconds(value);
      }
      
      public function get time() : Number
      {
         return this.getTime();
      }
      
      public function set time(value:Number) : *
      {
         this.setTime(value);
      }
      
      public function get timezoneOffset() : Number
      {
         return this.getTimezoneOffset();
      }
      
      public function get day() : Number
      {
         return this.getDay();
      }
      
      public function get dayUTC() : Number
      {
         return this.getUTCDay();
      }
   }
}

