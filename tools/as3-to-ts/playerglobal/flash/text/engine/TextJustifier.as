package flash.text.engine
{
   import flash.utils.*;
   
   [native(cls="TextJustifierClass",instance="TextJustifierObject",methods="auto")]
   [Version("10")]
   public class TextJustifier
   {
      
      public function TextJustifier(locale:String, lineJustification:String)
      {
         super();
         if(getQualifiedClassName(this) == "flash.text.engine::TextJustifier")
         {
            Error.throwError(ArgumentError,2012,"TextJustifier");
         }
         this.setLocale(locale);
         this.lineJustification = lineJustification;
      }
      
      public static function getJustifierForLocale(locale:String) : TextJustifier
      {
         if(locale == null || locale.length < 2)
         {
            Error.throwError(ArgumentError,2004,"previousLine");
         }
         var baseLocale:String = locale.substr(0,2);
         if(baseLocale == "zh" || baseLocale == "ja" || baseLocale == "ko")
         {
            return new EastAsianJustifier(locale);
         }
         return new SpaceJustifier(locale);
      }
      
      public native function get locale() : String;
      
      private native function setLocale(param1:String) : void;
      
      public native function get lineJustification() : String;
      
      public native function set lineJustification(param1:String) : void;
      
      public function clone() : TextJustifier
      {
         return null;
      }
   }
}

