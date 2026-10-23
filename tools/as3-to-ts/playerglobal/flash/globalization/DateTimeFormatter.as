package flash.globalization
{
   [native(cls="DateTimeFormatterClass",instance="DateTimeFormatterObject",methods="auto")]
   [Version("10.1")]
   public final class DateTimeFormatter
   {
      
      public function DateTimeFormatter(requestedLocaleIDName:String, dateStyle:String = "long", timeStyle:String = "long")
      {
         super();
         this.ctor(requestedLocaleIDName,dateStyle,timeStyle);
      }
      
      public static native function getAvailableLocaleIDNames() : Vector.<String>;
      
      private native function ctor(param1:String, param2:String, param3:String) : void;
      
      public native function setDateTimeStyles(param1:String, param2:String) : void;
      
      public native function getTimeStyle() : String;
      
      public native function getDateStyle() : String;
      
      public native function get lastOperationStatus() : String;
      
      public native function get requestedLocaleIDName() : String;
      
      public native function get actualLocaleIDName() : String;
      
      public function format(dateTime:Date) : String
      {
         return this.formatImplementation(dateTime,false);
      }
      
      private native function formatImplementation(param1:Date, param2:Boolean) : String;
      
      public function formatUTC(dateTime:Date) : String
      {
         return this.formatImplementation(dateTime,true);
      }
      
      public native function getMonthNames(param1:String = "full", param2:String = "standalone") : Vector.<String>;
      
      public native function getWeekdayNames(param1:String = "full", param2:String = "standalone") : Vector.<String>;
      
      public native function getFirstWeekday() : int;
      
      public native function getDateTimePattern() : String;
      
      public native function setDateTimePattern(param1:String) : void;
   }
}

