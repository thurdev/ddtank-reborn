package flash.text.ime
{
   [Version("10.1")]
   public final class CompositionAttributeRange
   {
      
      public var relativeStart:int;
      
      public var relativeEnd:int;
      
      public var selected:Boolean;
      
      public var converted:Boolean;
      
      public function CompositionAttributeRange(relativeStart:int, relativeEnd:int, selected:Boolean, converted:Boolean)
      {
         super();
         this.relativeStart = relativeStart;
         this.relativeEnd = relativeEnd;
         this.selected = selected;
         this.converted = converted;
      }
   }
}

