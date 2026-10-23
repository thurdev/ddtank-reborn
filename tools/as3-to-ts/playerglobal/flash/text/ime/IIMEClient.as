package flash.text.ime
{
   import flash.geom.Rectangle;
   
   [API("667")]
   [Event(name="textInput",type="flash.events.TextEvent")]
   [Event(name="imeStartComposition",type="flash.events.IMEEvent")]
   public interface IIMEClient
   {
      
      [cppcall]
      function updateComposition(param1:String, param2:Vector.<CompositionAttributeRange>, param3:int, param4:int) : void;
      
      [cppcall]
      function confirmComposition(param1:String = null, param2:Boolean = false) : void;
      
      [cppcall]
      function getTextBounds(param1:int, param2:int) : Rectangle;
      
      [cppcall]
      function get compositionStartIndex() : int;
      
      [cppcall]
      function get compositionEndIndex() : int;
      
      [cppcall]
      function get verticalTextLayout() : Boolean;
      
      [cppcall]
      function get selectionAnchorIndex() : int;
      
      [cppcall]
      function get selectionActiveIndex() : int;
      
      [cppcall]
      function selectRange(param1:int, param2:int) : void;
      
      [cppcall]
      function getTextInRange(param1:int, param2:int) : String;
   }
}

