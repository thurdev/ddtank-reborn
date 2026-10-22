package flash.text.engine
{
   [native(cls="SpaceJustifierClass",instance="SpaceJustifierObject",methods="auto")]
   [Version("10")]
   public final class SpaceJustifier extends TextJustifier
   {
      
      public function SpaceJustifier(locale:String = "en", lineJustification:String = "unjustified", letterSpacing:Boolean = false)
      {
         super(locale,lineJustification);
         this.letterSpacing = letterSpacing;
      }
      
      public native function get letterSpacing() : Boolean;
      
      public native function set letterSpacing(param1:Boolean) : void;
      
      [Version("10.1")]
      public native function get minimumSpacing() : Number;
      
      [Version("10.1")]
      public native function set minimumSpacing(param1:Number) : void;
      
      [Version("10.1")]
      public native function get optimumSpacing() : Number;
      
      [Version("10.1")]
      public native function set optimumSpacing(param1:Number) : void;
      
      [Version("10.1")]
      public native function get maximumSpacing() : Number;
      
      [Version("10.1")]
      public native function set maximumSpacing(param1:Number) : void;
      
      override public function clone() : TextJustifier
      {
         var sp:SpaceJustifier = new SpaceJustifier(this.locale,this.lineJustification,this.letterSpacing);
         sp.cloneSpacing(this);
         return sp;
      }
      
      private native function cloneSpacing(param1:SpaceJustifier) : void;
   }
}

