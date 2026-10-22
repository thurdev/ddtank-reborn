package flash.text
{
   import flash.display.DisplayObject;
   
   [native(cls="StaticTextClass",gc="exact",instance="StaticTextObject",methods="auto",construct="restricted-check")]
   public final class StaticText extends DisplayObject
   {
      
      public function StaticText()
      {
         super();
      }
      
      public native function get text() : String;
   }
}

