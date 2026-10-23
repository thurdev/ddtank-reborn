package flash.events
{
   [API("670")]
   public class VideoEvent extends Event
   {
      
      public static const RENDER_STATE:String = "renderState";
      
      public static const RENDER_STATUS_UNAVAILABLE:String = "unavailable";
      
      public static const RENDER_STATUS_SOFTWARE:String = "software";
      
      public static const RENDER_STATUS_ACCELERATED:String = "accelerated";
      
      private var m_status:String;
      
      public const codecInfo:String;
      
      public function VideoEvent(type:String, bubbles:Boolean = false, cancelable:Boolean = false, status:String = null)
      {
         super(type,bubbles,cancelable);
         this.m_status = status;
      }
      
      public function get status() : String
      {
         return this.m_status;
      }
   }
}

