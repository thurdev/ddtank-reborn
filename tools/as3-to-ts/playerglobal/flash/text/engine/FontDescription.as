package flash.text.engine
{
   [native(cls="FontDescriptionClass",instance="FontDescriptionObject",methods="auto")]
   [Version("10")]
   public final class FontDescription
   {
      
      public function FontDescription(fontName:String = "_serif", fontWeight:String = "normal", fontPosture:String = "normal", fontLookup:String = "device", renderingMode:String = "cff", cffHinting:String = "horizontalStem")
      {
         super();
         this.fontName = fontName;
         this.fontWeight = fontWeight;
         this.fontPosture = fontPosture;
         this.fontLookup = fontLookup;
         this.renderingMode = renderingMode;
         this.cffHinting = cffHinting;
      }
      
      public static native function isFontCompatible(param1:String, param2:String, param3:String) : Boolean;
      
      [Version("10.1")]
      public static native function isDeviceFontCompatible(param1:String, param2:String, param3:String) : Boolean;
      
      public native function get renderingMode() : String;
      
      public native function set renderingMode(param1:String) : void;
      
      public native function get fontLookup() : String;
      
      public native function set fontLookup(param1:String) : void;
      
      public native function get fontName() : String;
      
      public native function set fontName(param1:String) : void;
      
      public native function get fontPosture() : String;
      
      public native function set fontPosture(param1:String) : void;
      
      public native function get fontWeight() : String;
      
      public native function set fontWeight(param1:String) : void;
      
      public native function get cffHinting() : String;
      
      public native function set cffHinting(param1:String) : void;
      
      public native function get locked() : Boolean;
      
      public native function set locked(param1:Boolean) : void;
      
      public function clone() : FontDescription
      {
         return new FontDescription(this.fontName,this.fontWeight,this.fontPosture,this.fontLookup,this.renderingMode,this.cffHinting);
      }
   }
}

