package flash.text.engine
{
   import flash.events.EventDispatcher;
   
   [native(cls="TextElementClass",instance="TextElementObject",methods="auto")]
   [Version("10")]
   public final class TextElement extends ContentElement
   {
      
      public function TextElement(text:String = null, elementFormat:ElementFormat = null, eventMirror:EventDispatcher = null, textRotation:String = "rotate0")
      {
         super(elementFormat,eventMirror,textRotation);
         this.text = text;
      }
      
      public native function set text(param1:String) : void;
      
      public native function replaceText(param1:int, param2:int, param3:String) : void;
   }
}

