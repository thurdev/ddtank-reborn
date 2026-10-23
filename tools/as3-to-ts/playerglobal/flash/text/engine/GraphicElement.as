package flash.text.engine
{
   import flash.display.DisplayObject;
   import flash.events.EventDispatcher;
   
   [native(cls="GraphicElementClass",instance="GraphicElementObject",methods="auto")]
   [Version("10")]
   public final class GraphicElement extends ContentElement
   {
      
      public function GraphicElement(graphic:DisplayObject = null, elementWidth:Number = 15, elementHeight:Number = 15, elementFormat:ElementFormat = null, eventMirror:EventDispatcher = null, textRotation:String = "rotate0")
      {
         super(elementFormat,eventMirror,textRotation);
         this.elementWidth = elementWidth;
         this.elementHeight = elementHeight;
         this.graphic = graphic;
      }
      
      public native function get graphic() : DisplayObject;
      
      public native function set graphic(param1:DisplayObject) : void;
      
      public native function get elementHeight() : Number;
      
      public native function set elementHeight(param1:Number) : void;
      
      public native function get elementWidth() : Number;
      
      public native function set elementWidth(param1:Number) : void;
   }
}

