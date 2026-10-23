package flash.text
{
   [native(cls="FontClass",instance="FontObject",methods="auto")]
   public class Font
   {
      
      public function Font()
      {
         super();
      }
      
      public static native function enumerateFonts(param1:Boolean = false) : Array;
      
      public static native function registerFont(param1:Class) : void;
      
      public native function get fontName() : String;
      
      public native function get fontStyle() : String;
      
      public native function get fontType() : String;
      
      public native function hasGlyphs(param1:String) : Boolean;
   }
}

