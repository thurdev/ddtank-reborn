package flash.events
{
   import flash.net.drm.*;
   
   [API("667")]
   public class DRMAuthenticationErrorEvent extends ErrorEvent
   {
      
      public static const AUTHENTICATION_ERROR:String = "authenticationError";
      
      private var m_subErrorID:int;
      
      private var m_serverURL:String;
      
      private var m_domain:String;
      
      public function DRMAuthenticationErrorEvent(type:String, bubbles:Boolean = false, cancelable:Boolean = false, inDetail:String = "", inErrorID:int = 0, inSubErrorID:int = 0, inServerURL:String = null, inDomain:String = null)
      {
         super(type,bubbles,cancelable,inDetail,inErrorID);
         this.m_subErrorID = inSubErrorID;
         this.m_serverURL = inServerURL;
         this.m_domain = inDomain;
      }
      
      override public function clone() : Event
      {
         return new DRMAuthenticationErrorEvent(type,bubbles,cancelable,text,errorID,this.subErrorID,this.serverURL,this.domain);
      }
      
      public function get subErrorID() : int
      {
         return this.m_subErrorID;
      }
      
      public function set subErrorID(value:int) : void
      {
         this.m_subErrorID = value;
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
   }
}

