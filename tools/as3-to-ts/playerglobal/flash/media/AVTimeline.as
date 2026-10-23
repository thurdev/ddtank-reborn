package flash.media
{
   [API("688")]
   public class AVTimeline
   {
      
      private var m_type:String;
      
      private var m_virtualStartTime:Number;
      
      private var m_virtualDuration:Number;
      
      private var m_firstPeriodIndex:int;
      
      private var m_lastPeriodIndex:int;
      
      private var m_firstSubscribedTagIndex:int;
      
      private var m_lastSubscribedTagIndex:int;
      
      private var m_complete:Boolean;
      
      public function AVTimeline(init_type:String, init_virtualStartTime:Number, init_virtualDuration:Number, init_firstPeriodIndex:int, init_lastPeriodIndex:int, init_firstSubscribedIndex:int, init_lastSubscribedIndex:int, init_complete:Boolean)
      {
         super();
         this.m_type = init_type;
         this.m_virtualStartTime = init_virtualStartTime;
         this.m_virtualDuration = init_virtualDuration;
         this.m_firstPeriodIndex = init_firstPeriodIndex;
         this.m_lastPeriodIndex = init_lastPeriodIndex;
         this.m_firstSubscribedTagIndex = init_firstSubscribedIndex;
         this.m_lastSubscribedTagIndex = init_lastSubscribedIndex;
         this.m_complete = init_complete;
      }
      
      public function get type() : String
      {
         return this.m_type;
      }
      
      public function get virtualStartTime() : Number
      {
         return this.m_virtualStartTime;
      }
      
      public function get virtualDuration() : Number
      {
         return this.m_virtualDuration;
      }
      
      public function get firstPeriodIndex() : int
      {
         return this.m_firstPeriodIndex;
      }
      
      public function get lastPeriodIndex() : int
      {
         return this.m_lastPeriodIndex;
      }
      
      public function get firstSubscribedTagIndex() : int
      {
         return this.m_firstSubscribedTagIndex;
      }
      
      public function get lastSubscribedTagIndex() : int
      {
         return this.m_lastSubscribedTagIndex;
      }
      
      public function get complete() : Boolean
      {
         return this.m_complete;
      }
   }
}

