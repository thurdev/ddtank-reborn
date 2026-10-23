package flash.net.drm
{
   import flash.events.*;
   import flash.utils.*;
   
   [native(cls="DRMAuthenticationContextClass",instance="DRMAuthenticationContextObject",methods="auto")]
   internal class DRMAuthenticationContext extends DRMManagerSession
   {
      
      private var m_url:String;
      
      private var m_domain:String;
      
      public function DRMAuthenticationContext()
      {
         super();
      }
      
      public function authenticate(url:String, domain:String, username:String, password:String) : void
      {
         var errorCode:uint = 0;
         if(!m_isInSession)
         {
            m_isInSession = true;
            this.m_url = url;
            this.m_domain = domain;
            errorCode = uint(this.authenticateInner(url,domain,username,password));
            if(errorCode != 0)
            {
               m_isInSession = false;
               errorCodeToThrow(errorCode);
            }
            else
            {
               setTimerUp();
            }
         }
      }
      
      override public function onSessionComplete() : void
      {
         var event:DRMAuthenticationCompleteEvent = new DRMAuthenticationCompleteEvent(DRMAuthenticationCompleteEvent.AUTHENTICATION_COMPLETE);
         event.serverURL = this.m_url;
         event.domain = this.m_domain;
         event.token = this.authenticationToken;
         dispatchEvent(event);
      }
      
      override public function onSessionError() : void
      {
         var event:DRMAuthenticationErrorEvent = new DRMAuthenticationErrorEvent(DRMAuthenticationErrorEvent.AUTHENTICATION_ERROR,false,false,getLastServerErrorString(),getLastError());
         event.serverURL = this.m_url;
         event.domain = this.m_domain;
         event.subErrorID = getLastSubErrorID();
         dispatchEvent(event);
      }
      
      public function get authenticationToken() : ByteArray
      {
         var authToken:ByteArray = new ByteArray();
         this.getTokenInner(authToken);
         return authToken;
      }
      
      private native function authenticateInner(param1:String, param2:String, param3:String, param4:String) : uint;
      
      private native function getTokenInner(param1:ByteArray) : void;
   }
}

