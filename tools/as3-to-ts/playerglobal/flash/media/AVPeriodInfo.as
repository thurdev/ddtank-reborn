package flash.media
{
   [API("688")]
   public class AVPeriodInfo
   {
      
      private var m_localStartTime:Number;
      
      private var m_virtualStartTime:Number;
      
      private var m_duration:Number;
      
      private var m_firstCuePointIndex:int;
      
      private var m_lastCuePointIndex:int;
      
      private var m_firstSubscribedTagIndex:int;
      
      private var m_lastSubscribedTagIndex:int;
      
      private var m_userData:int;
      
      private var m_supportsTrickPlay:Boolean;
      
      private var m_targetDuration:Number;
      
      public function AVPeriodInfo(init_localStartTime:Number, init_virtualStartTime:Number, init_duration:Number, init_firstCuePointIndex:int, init_lastCuePointIndex:int, init_firstSubscribedTagIndex:int, init_lastSubscribedTagIndex:int, init_userData:int, init_supportsTrickPlay:Boolean, init_targetDuration:Number)
      {
         super();
         this.m_localStartTime = init_localStartTime;
         this.m_virtualStartTime = init_virtualStartTime;
         this.m_duration = init_duration;
         this.m_firstCuePointIndex = init_firstCuePointIndex;
         this.m_lastCuePointIndex = init_lastCuePointIndex;
         this.m_firstSubscribedTagIndex = init_firstSubscribedTagIndex;
         this.m_lastSubscribedTagIndex = init_lastSubscribedTagIndex;
         this.m_userData = init_userData;
         this.m_supportsTrickPlay = init_supportsTrickPlay;
         this.m_targetDuration = init_targetDuration;
      }
      
      public function get localStartTime() : Number
      {
         return this.m_localStartTime;
      }
      
      public function get virtualStartTime() : Number
      {
         return this.m_virtualStartTime;
      }
      
      public function get duration() : Number
      {
         return this.m_duration;
      }
      
      public function get firstCuePointIndex() : int
      {
         return this.m_firstCuePointIndex;
      }
      
      public function get lastCuePointIndex() : int
      {
         return this.m_lastCuePointIndex;
      }
      
      public function get firstSubscribedTagIndex() : int
      {
         return this.m_firstSubscribedTagIndex;
      }
      
      public function get lastSubscribedTagIndex() : int
      {
         return this.m_lastSubscribedTagIndex;
      }
      
      public function get userData() : int
      {
         return this.m_userData;
      }
      
      public function get supportsTrickPlay() : Boolean
      {
         return this.m_supportsTrickPlay;
      }
      
      public function get targetDuration() : Number
      {
         return this.m_targetDuration;
      }
   }
}

