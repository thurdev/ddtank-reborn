package flash.text.engine
{
   [native(cls="EastAsianJustifierClass",instance="EastAsianJustifierObject",methods="auto")]
   [Version("10")]
   public final class EastAsianJustifier extends TextJustifier
   {
      
      public function EastAsianJustifier(locale:String = "ja", lineJustification:String = "allButLast", justificationStyle:String = "pushInKinsoku")
      {
         super(locale,lineJustification);
         this.justificationStyle = justificationStyle;
      }
      
      public native function get justificationStyle() : String;
      
      public native function set justificationStyle(param1:String) : void;
      
      [API("674")]
      public native function get composeTrailingIdeographicSpaces() : Boolean;
      
      [API("674")]
      public native function set composeTrailingIdeographicSpaces(param1:Boolean) : void;
      
      override public function clone() : TextJustifier
      {
         var eaj:EastAsianJustifier = new EastAsianJustifier(this.locale,this.lineJustification,this.justificationStyle);
         eaj.composeTrailingIdeographicSpaces = this.composeTrailingIdeographicSpaces;
         return eaj;
      }
   }
}

