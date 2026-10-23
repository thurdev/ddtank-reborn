package flash.events
{
   public class AVHTTPStatusEvent extends Event
   {
      
      public static const AV_HTTP_RESPONSE_STATUS:String = "avHttpResponseStatus";
      
      private var m_status:int;
      
      private var m_responseHeaders:Array;
      
      private var m_responseUrl:String;
      
      public function AVHTTPStatusEvent(type:String, bubbles:Boolean = false, cancelable:Boolean = false, status:int = 0, responseUrl:String = null, responseHeaders:Array = null)
      {
         super(type,bubbles,cancelable);
         this.m_status = status;
         this.m_responseUrl = responseUrl;
         this.m_responseHeaders = responseHeaders;
      }
      
      override public function clone() : Event
      {
         var result:AVHTTPStatusEvent = new AVHTTPStatusEvent(type,bubbles,cancelable,this.status);
         result.responseURL = this.responseURL;
         result.responseHeaders = this.responseHeaders;
         return result;
      }
      
      override public function toString() : String
      {
         return formatToString("AVHTTPStatusEvent","type","bubbles","cancelable","eventPhase","status","responseURL","responseHeaders");
      }
      
      public function get status() : int
      {
         return this.m_status;
      }
      
      public function get responseURL() : String
      {
         return this.m_responseUrl;
      }
      
      public function set responseURL(value:String) : void
      {
         this.m_responseUrl = value;
      }
      
      public function get responseHeaders() : Array
      {
         return this.m_responseHeaders;
      }
      
      public function set responseHeaders(value:Array) : void
      {
         this.m_responseHeaders = value;
      }
   }
}

