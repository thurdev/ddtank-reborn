package flash.text.engine
{
   import flash.events.EventDispatcher;
   
   [native(cls="GroupElementClass",instance="GroupElementObject",methods="auto")]
   [Version("10")]
   public final class GroupElement extends ContentElement
   {
      
      public function GroupElement(elements:Vector.<ContentElement> = null, elementFormat:ElementFormat = null, eventMirror:EventDispatcher = null, textRotation:String = "rotate0")
      {
         super(elementFormat,eventMirror,textRotation);
         this.setElements(elements);
      }
      
      public native function get elementCount() : int;
      
      public native function getElementAt(param1:int) : ContentElement;
      
      public native function setElements(param1:Vector.<ContentElement>) : void;
      
      public native function groupElements(param1:int, param2:int) : GroupElement;
      
      public native function ungroupElements(param1:int) : void;
      
      public native function mergeTextElements(param1:int, param2:int) : TextElement;
      
      public native function splitTextElement(param1:int, param2:int) : TextElement;
      
      public native function replaceElements(param1:int, param2:int, param3:Vector.<ContentElement>) : Vector.<ContentElement>;
      
      public native function getElementAtCharIndex(param1:int) : ContentElement;
      
      public function getElementIndex(element:ContentElement) : int
      {
         for(var i:int = 0; i < this.elementCount; i++)
         {
            if(element == this.getElementAt(i))
            {
               return i;
            }
         }
         return -1;
      }
   }
}

