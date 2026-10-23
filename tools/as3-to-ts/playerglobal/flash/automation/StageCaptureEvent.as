package flash.automation
{
   import flash.events.Event;
   
   [native(cls="StageCaptureEventClass",instance="StageCaptureEventObject",methods="auto")]
   [ExcludeClass]
   public class StageCaptureEvent extends Event
   {
      
      public static const CAPTURE:String = "capture";
      
      private var m_url:String;
      
      private var m_checksum:uint;
      
      private var m_pts:Number;
      
      public function StageCaptureEvent(type:String, bubbles:Boolean = false, cancelable:Boolean = false, url:String = "", checksum:uint = 0, pts:Number = 0)
      {
         super(type,bubbles,cancelable);
         this.m_url = url;
         this.m_checksum = checksum;
         this.m_pts = pts;
      }
      
      override public function clone() : Event
      {
         return new StageCaptureEvent(type,bubbles,cancelable,this.url,this.checksum);
      }
      
      override public function toString() : String
      {
         return formatToString("StageCaptureEvent","type","bubbles","cancelable","eventPhase","url","checksum");
      }
      
      public function get url() : String
      {
         return this.m_url;
      }
      
      public function get checksum() : uint
      {
         return this.m_checksum;
      }
      
      public function get pts() : Number
      {
         return this.m_pts;
      }
   }
}

