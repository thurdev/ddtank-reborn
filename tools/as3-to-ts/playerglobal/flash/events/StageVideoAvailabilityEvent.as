package flash.events
{
   [API("670")]
   public class StageVideoAvailabilityEvent extends Event
   {
      
      public static const STAGE_VIDEO_AVAILABILITY:String = "stageVideoAvailability";
      
      private var m_availability:String;
      
      public const reason:String;
      
      public const driver:String;
      
      public function StageVideoAvailabilityEvent(type:String, bubbles:Boolean = false, cancelable:Boolean = false, availability:String = null)
      {
         super(type,bubbles,cancelable);
         this.m_availability = availability;
      }
      
      public function get availability() : String
      {
         return this.m_availability;
      }
   }
}

