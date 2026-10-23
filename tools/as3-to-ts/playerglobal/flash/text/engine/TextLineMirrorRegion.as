package flash.text.engine
{
   import flash.events.EventDispatcher;
   import flash.geom.Rectangle;
   
   [native(cls="TextLineMirrorRegionClass",instance="TextLineMirrorRegionObject",methods="auto",construct="none")]
   [Version("10")]
   public final class TextLineMirrorRegion
   {
      
      public function TextLineMirrorRegion()
      {
         super();
      }
      
      public native function get textLine() : TextLine;
      
      public native function get nextRegion() : TextLineMirrorRegion;
      
      public native function get previousRegion() : TextLineMirrorRegion;
      
      public native function get mirror() : EventDispatcher;
      
      public native function get element() : ContentElement;
      
      public native function get bounds() : Rectangle;
   }
}

