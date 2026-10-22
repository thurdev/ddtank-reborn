package flash.text
{
   [native(cls="TextRendererClass",methods="auto")]
   public final class TextRenderer
   {
      
      public function TextRenderer()
      {
         super();
      }
      
      [Inspectable(environment="none")]
      public static native function get antiAliasType() : String;
      
      public static native function set antiAliasType(param1:String) : void;
      
      public static native function setAdvancedAntiAliasingTable(param1:String, param2:String, param3:String, param4:Array) : void;
      
      public static native function get maxLevel() : int;
      
      public static native function set maxLevel(param1:int) : void;
      
      public static native function get displayMode() : String;
      
      public static native function set displayMode(param1:String) : void;
   }
}

