package flash.events
{
   import flash.net.NetStream;
   
   [API("661")]
   public class DRMAuthenticateEvent extends Event
   {
      
      public static const DRM_AUTHENTICATE:String = "drmAuthenticate";
      
      public static const AUTHENTICATION_TYPE_DRM:String = "drm";
      
      public static const AUTHENTICATION_TYPE_PROXY:String = "proxy";
      
      private var m_header:String;
      
      private var m_userPrompt:String;
      
      private var m_passPrompt:String;
      
      private var m_urlPrompt:String;
      
      private var m_authenticationType:String;
      
      private var m_netstream:NetStream;
      
      public function DRMAuthenticateEvent(type:String, bubbles:Boolean = false, cancelable:Boolean = false, header:String = "", userPrompt:String = "", passPrompt:String = "", urlPrompt:String = "", authenticationType:String = "", netstream:NetStream = null)
      {
         super(type,bubbles,cancelable);
         this.m_header = header;
         this.m_userPrompt = userPrompt;
         this.m_passPrompt = passPrompt;
         this.m_urlPrompt = urlPrompt;
         this.m_authenticationType = authenticationType;
         this.m_netstream = netstream;
      }
      
      override public function clone() : Event
      {
         return new DRMAuthenticateEvent(type,bubbles,cancelable,this.m_header,this.m_userPrompt,this.m_passPrompt,this.m_urlPrompt,this.m_authenticationType,this.m_netstream);
      }
      
      override public function toString() : String
      {
         return formatToString("DRMAuthenticateEvent","type","bubbles","cancelable","eventPhase","header","usernamePrompt","passwordPrompt","urlPrompt","authenticationType");
      }
      
      public function get header() : String
      {
         return this.m_header;
      }
      
      public function get usernamePrompt() : String
      {
         return this.m_userPrompt;
      }
      
      public function get passwordPrompt() : String
      {
         return this.m_passPrompt;
      }
      
      public function get urlPrompt() : String
      {
         return this.m_urlPrompt;
      }
      
      public function get authenticationType() : String
      {
         return this.m_authenticationType;
      }
      
      public function get netstream() : NetStream
      {
         return this.m_netstream;
      }
   }
}

