package flash.events
{
   [API("674")]
   public class OutputProgressEvent extends Event
   {
      
      public static const OUTPUT_PROGRESS:String = "outputProgress";
      
      private var m_bytesPending:Number;
      
      private var m_bytesTotal:Number;
      
      public function OutputProgressEvent(type:String, bubbles:Boolean = false, cancelable:Boolean = false, bytesPending:Number = 0, bytesTotal:Number = 0)
      {
         super(type,bubbles,cancelable);
         this.m_bytesPending = bytesPending;
         this.m_bytesTotal = bytesTotal;
      }
      
      override public function clone() : Event
      {
         return new OutputProgressEvent(type,bubbles,cancelable,this.m_bytesPending,this.m_bytesTotal);
      }
      
      override public function toString() : String
      {
         return formatToString("OutputProgressEvent","type","bubbles","cancelable","eventPhase","bytesPending","bytesTotal");
      }
      
      public function get bytesPending() : Number
      {
         return this.m_bytesPending;
      }
      
      public function set bytesPending(value:Number) : void
      {
         this.m_bytesPending = value;
      }
      
      public function get bytesTotal() : Number
      {
         return this.m_bytesTotal;
      }
      
      public function set bytesTotal(value:Number) : void
      {
         this.m_bytesTotal = value;
      }
   }
}

