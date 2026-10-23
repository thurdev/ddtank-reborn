package flash.net.drm
{
   [native(cls="DRMResetContextClass",instance="DRMResetContextObject",methods="auto")]
   internal class DRMResetContext extends DRMManagerSession
   {
      
      public var m_isAutoReset:Boolean;
      
      public function DRMResetContext(isAutoReset:Boolean)
      {
         super();
         this.m_isAutoReset = isAutoReset;
      }
      
      override public function onSessionComplete() : void
      {
         issueDRMStatusEvent(metadata,null);
      }
      
      override public function onSessionError() : void
      {
         issueDRMErrorEvent(metadata,getLastError(),getLastSubErrorID(),getLastServerErrorString());
      }
      
      public function doReset() : void
      {
         var errorCode:uint = 0;
         if(!m_isInSession)
         {
            m_isInSession = true;
            errorCode = uint(this.resetInner(this.m_isAutoReset));
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
      
      private native function resetInner(param1:Boolean) : uint;
   }
}

