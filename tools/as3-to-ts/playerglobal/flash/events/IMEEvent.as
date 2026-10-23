package flash.events
{
   import flash.text.ime.IIMEClient;
   
   [native(friend="avmplus::EventDispatcherObject")]
   public class IMEEvent extends TextEvent
   {
      
      public static const IME_COMPOSITION:String = "imeComposition";
      
      [API("667")]
      public static const IME_START_COMPOSITION:String = "imeStartComposition";
      
      private var m_imeClient:IIMEClient;
      
      public function IMEEvent(type:String, bubbles:Boolean = false, cancelable:Boolean = false, text:String = "", imeClient:IIMEClient = null)
      {
         super(type,bubbles,cancelable,text);
         this.m_imeClient = imeClient;
      }
      
      override public function clone() : Event
      {
         return new IMEEvent(type,bubbles,cancelable,text,this.imeClient);
      }
      
      [API("667")]
      public function get imeClient() : IIMEClient
      {
         return this.m_imeClient;
      }
      
      [API("667")]
      public function set imeClient(value:IIMEClient) : void
      {
         this.m_imeClient = value;
      }
      
      override public function toString() : String
      {
         return formatToString("IMEEvent","type","bubbles","cancelable","eventPhase","text","imeClient");
      }
   }
}

