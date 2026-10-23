package flash.net.drm
{
   import flash.events.*;
   
   [native(cls="DRMReturnVoucherContextClass",instance="DRMReturnVoucherContextObject",methods="auto")]
   internal class DRMReturnVoucherContext extends DRMManagerSession
   {
      
      private var m_serverURL:String;
      
      private var m_licenseID:String;
      
      private var m_policyID:String;
      
      private var m_immediateCommit:Boolean;
      
      public function DRMReturnVoucherContext()
      {
         super();
      }
      
      public function returnVoucher(inServerURL:String, immediateCommit:Boolean, licenseID:String, policyID:String) : void
      {
         var errorCode:uint = 0;
         if(!m_isInSession)
         {
            m_isInSession = true;
            this.m_serverURL = inServerURL;
            this.m_licenseID = licenseID;
            this.m_policyID = policyID;
            this.m_immediateCommit = immediateCommit;
            errorCode = uint(this.returnVoucherInner(inServerURL,immediateCommit,licenseID,policyID));
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
         var event:DRMReturnVoucherCompleteEvent = new DRMReturnVoucherCompleteEvent(DRMReturnVoucherCompleteEvent.RETURN_VOUCHER_COMPLETE);
         event.serverURL = this.m_serverURL;
         event.licenseID = this.m_licenseID;
         event.policyID = this.m_policyID;
         event.numberOfVouchersReturned = this.getResultInner();
         dispatchEvent(event);
      }
      
      override public function onSessionError() : void
      {
         var event:DRMReturnVoucherErrorEvent = new DRMReturnVoucherErrorEvent(DRMReturnVoucherErrorEvent.RETURN_VOUCHER_ERROR,false,false,getLastServerErrorString(),getLastError());
         event.serverURL = this.m_serverURL;
         event.licenseID = this.m_licenseID;
         event.policyID = this.m_policyID;
         event.subErrorID = getLastSubErrorID();
         dispatchEvent(event);
      }
      
      private native function returnVoucherInner(param1:String, param2:Boolean, param3:String, param4:String) : uint;
      
      private native function getResultInner() : int;
   }
}

