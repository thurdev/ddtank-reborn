package flash.events
{
   import flash.utils.ByteArray;
   
   [Version("10")]
   public class SampleDataEvent extends Event
   {
      
      public static const SAMPLE_DATA:String = "sampleData";
      
      private var m_position:Number;
      
      private var m_data:ByteArray;
      
      public function SampleDataEvent(type:String, bubbles:Boolean = false, cancelable:Boolean = false, theposition:Number = 0, thedata:ByteArray = null)
      {
         super(type,bubbles,cancelable);
         this.m_position = theposition;
         this.m_data = thedata;
      }
      
      override public function clone() : Event
      {
         return new SampleDataEvent(type,bubbles,cancelable,this.position,this.data);
      }
      
      override public function toString() : String
      {
         return formatToString("SampleDataEvent","type","bubbles","cancelable","eventPhase","position","data");
      }
      
      public function get position() : Number
      {
         return this.m_position;
      }
      
      public function set position(theposition:Number) : *
      {
         this.m_position = theposition;
      }
      
      public function get data() : ByteArray
      {
         return this.m_data;
      }
      
      public function set data(thedata:ByteArray) : *
      {
         this.m_data = thedata;
      }
   }
}

