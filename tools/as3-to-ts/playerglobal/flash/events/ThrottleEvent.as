package flash.events
{
   [native(cls="ThrottleEventClass",gc="exact",instance="ThrottleEventObject",methods="auto")]
   [API("676")]
   public class ThrottleEvent extends Event
   {
      
      public static const THROTTLE:String = "throttle";
      
      private var m_targetFrameRate:Number;
      
      private var m_state:String;
      
      public function ThrottleEvent(type:String, bubbles:Boolean = false, cancelable:Boolean = false, state:String = null, targetFrameRate:Number = 0)
      {
         super(type,bubbles,cancelable);
         this.m_state = state;
         this.m_targetFrameRate = targetFrameRate;
      }
      
      public function get targetFrameRate() : Number
      {
         return this.m_targetFrameRate;
      }
      
      public function get state() : String
      {
         return this.m_state;
      }
      
      override public function clone() : Event
      {
         return new ThrottleEvent(type,bubbles,cancelable,this.m_state,this.m_targetFrameRate);
      }
      
      override public function toString() : String
      {
         return formatToString("ThrottleEvent","type","bubbles","cancelable","eventPhase","state","targetFrameRate");
      }
   }
}

