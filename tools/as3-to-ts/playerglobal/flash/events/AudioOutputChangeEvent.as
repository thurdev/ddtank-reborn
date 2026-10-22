package flash.events
{
   [API("724")]
   public class AudioOutputChangeEvent extends Event
   {
      
      public static const AUDIO_OUTPUT_CHANGE:String = "audioOutputChange";
      
      private var m_reason:String;
      
      public function AudioOutputChangeEvent(type:String, bubbles:Boolean = false, cancelable:Boolean = false, reason:String = null)
      {
         super(type,bubbles,cancelable);
         this.m_reason = reason;
      }
      
      public function get reason() : String
      {
         return this.m_reason;
      }
   }
}

