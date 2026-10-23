package flash.media
{
   import flash.events.*;
   
   [API("688")]
   [native(cls="AVSourceClass",instance="AVSourceObject",methods="auto")]
   public class AVSource extends EventDispatcher
   {
      
      public function AVSource()
      {
         super();
         this.ctor();
      }
      
      private native function ctor() : void;
      
      public native function dispose() : void;
   }
}

