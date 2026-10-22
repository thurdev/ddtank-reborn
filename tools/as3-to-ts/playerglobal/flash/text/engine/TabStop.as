package flash.text.engine
{
   [native(cls="TabStopClass",instance="TabStopObject",methods="auto")]
   [Version("10")]
   public final class TabStop
   {
      
      public function TabStop(alignment:String = "start", position:Number = 0, decimalAlignmentToken:String = "")
      {
         super();
         this.alignment = alignment;
         this.position = position;
         this.decimalAlignmentToken = decimalAlignmentToken;
      }
      
      public native function get alignment() : String;
      
      public native function set alignment(param1:String) : void;
      
      public native function get position() : Number;
      
      public native function set position(param1:Number) : void;
      
      public native function get decimalAlignmentToken() : String;
      
      public native function set decimalAlignmentToken(param1:String) : void;
   }
}

