package flash.events
{
   import flash.net.drm.*;
   import flash.utils.ByteArray;
   
   [API("667")]
   public class DRMAuthenticationCompleteEvent extends Event
   {
      
      public static const AUTHENTICATION_COMPLETE:String = "authenticationComplete";
      
      private var m_serverURL:String;
      
      private var m_domain:String;
      
      private var m_token:ByteArray;
      
      public function DRMAuthenticationCompleteEvent(type:String, bubbles:Boolean = false, cancelable:Boolean = false, inServerURL:String = null, inDomain:String = null, inToken:ByteArray = null)
      {
         super(type,bubbles,cancelable);
         this.m_serverURL = inServerURL;
         this.m_domain = inDomain;
         this.m_token = inToken;
      }
      
      override public function clone() : Event
      {
         return new DRMAuthenticationCompleteEvent(type,bubbles,cancelable,this.serverURL,this.domain,this.token);
      }
      
      public function get serverURL() : String
      {
         return this.m_serverURL;
      }
      
      public function set serverURL(value:String) : void
      {
         this.m_serverURL = value;
      }
      
      public function get domain() : String
      {
         return this.m_domain;
      }
      
      public function set domain(value:String) : void
      {
         this.m_domain = value;
      }
      
      public function get token() : ByteArray
      {
         return this.m_token;
      }
      
      public function set token(value:ByteArray) : void
      {
         this.m_token = value;
      }
   }
}

