package flash.events
{
   [API("672")]
   public class NetDataEvent extends Event
   {
      
      public static const MEDIA_TYPE_DATA:String = "mediaTypeData";
      
      private var m_info:Object;
      
      private var m_timestamp:Number;
      
      public function NetDataEvent(type:String, bubbles:Boolean = false, cancelable:Boolean = false, timestamp:Number = 0, info:Object = null)
      {
         super(type,bubbles,cancelable);
         this.m_timestamp = timestamp;
         this.m_info = info;
      }
      
      override public function clone() : Event
      {
         return new NetDataEvent(type,bubbles,cancelable,this.timestamp,this.info);
      }
      
      override public function toString() : String
      {
         return formatToString("NetDataEvent","type","bubbles","cancelable","eventPhase","timestamp");
      }
      
      public function get timestamp() : Number
      {
         return this.m_timestamp;
      }
      
      public function get info() : Object
      {
         return this.m_info;
      }
   }
}

