package flash.events
{
   [API("688")]
   public class AVStreamSwitchEvent extends Event
   {
      
      public static const AV_STREAM_SWITCH:String = "avStreamSwitch";
      
      public static const ABR_SWITCH:int = 0;
      
      public static const PERIOD_SWITCH:int = 1;
      
      private var m_time:Number;
      
      private var m_switchType:int;
      
      private var m_bitrate:int;
      
      private var m_description:String;
      
      private var m_userData:int;
      
      public function AVStreamSwitchEvent(type:String = "avStreamSwitch", bubbles:Boolean = false, cancelable:Boolean = false, time:Number = 0, switchType:int = 0, bitrate:int = 0, description:String = "", userData:int = 0)
      {
         super(type,bubbles,cancelable);
         this.m_time = time;
         this.m_switchType = switchType;
         this.m_bitrate = bitrate;
         this.m_description = description;
         this.m_userData = userData;
      }
      
      public function get time() : Number
      {
         return this.m_time;
      }
      
      public function get switchType() : int
      {
         return this.m_switchType;
      }
      
      public function get bitrate() : int
      {
         return this.m_bitrate;
      }
      
      public function get description() : String
      {
         return this.m_description;
      }
      
      public function get userData() : int
      {
         return this.m_userData;
      }
   }
}

