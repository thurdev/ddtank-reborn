package flash.media
{
   import flash.events.EventDispatcher;
   
   [native(cls="SoundChannelClass",gc="exact",instance="SoundChannelObject",methods="auto")]
   [Event(name="soundComplete",type="flash.events.Event")]
   public final class SoundChannel extends EventDispatcher
   {
      
      public function SoundChannel()
      {
         super();
      }
      
      public native function get position() : Number;
      
      public native function get soundTransform() : SoundTransform;
      
      public native function set soundTransform(param1:SoundTransform) : void;
      
      public native function stop() : void;
      
      public native function get leftPeak() : Number;
      
      public native function get rightPeak() : Number;
   }
}

