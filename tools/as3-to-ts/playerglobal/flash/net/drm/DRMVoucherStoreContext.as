package flash.net.drm
{
   [native(cls="DRMVoucherStoreContextClass",instance="DRMVoucherStoreContextObject",methods="auto")]
   internal class DRMVoucherStoreContext extends DRMManagerSession
   {
      
      public function DRMVoucherStoreContext()
      {
         super();
      }
      
      public function getVoucherFromStore(inMetadata:DRMContentData) : void
      {
         var errorCode:uint = 0;
         if(!m_isInSession)
         {
            m_isInSession = true;
            metadata = inMetadata;
            errorCode = uint(this.getVoucherFromStoreInner(metadata));
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
      
      public function get voucher() : DRMVoucher
      {
         return this.getVoucherInner();
      }
      
      override public function onSessionComplete() : void
      {
         issueDRMStatusEvent(metadata,this.getVoucherInner());
      }
      
      override public function onSessionError() : void
      {
         issueDRMErrorEvent(metadata,getLastError(),getLastSubErrorID(),getLastServerErrorString());
      }
      
      private native function getVoucherFromStoreInner(param1:DRMContentData) : uint;
      
      private native function getVoucherInner() : DRMVoucher;
   }
}

