package flash.display
{
   import flash.events.EventDispatcher;
   
   [native(cls="FrameLabelClass",gc="exact",instance="FrameLabelObject",methods="auto")]
   [Event(name="frameLabel",type="flash.events.Event")]
   public final class FrameLabel extends EventDispatcher
   {
      
      public function FrameLabel(name:String, frame:int)
      {
         super();
         this.ctor(name,frame);
      }
      
      private native function ctor(param1:String, param2:int) : void;
      
      public native function get name() : String;
      
      public native function get frame() : int;
   }
}

