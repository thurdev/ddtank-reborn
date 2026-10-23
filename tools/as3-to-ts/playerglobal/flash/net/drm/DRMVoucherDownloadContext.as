package flash.net.drm
{
   [native(cls="DRMVoucherDownloadContextClass",instance="DRMVoucherDownloadContextObject",methods="auto")]
   internal class DRMVoucherDownloadContext extends DRMManagerSession
   {
      
      public function DRMVoucherDownloadContext()
      {
         super();
      }
      
      public function download(inMetadata:DRMContentData, previewVoucher:Boolean = false) : void
      {
         var errorCode:uint = 0;
         if(!m_isInSession)
         {
            m_isInSession = true;
            metadata = inMetadata;
            errorCode = uint(this.downloadInner(metadata,previewVoucher));
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
         issueDRMStatusEvent(metadata,this.getVoucherInner());
      }
      
      override public function onSessionError() : void
      {
         issueDRMErrorEvent(metadata,getLastError(),getLastSubErrorID(),getLastServerErrorString());
      }
      
      public function get voucher() : DRMVoucher
      {
         return this.getVoucherInner();
      }
      
      private native function downloadInner(param1:DRMContentData, param2:Boolean) : uint;
      
      private native function getVoucherInner() : DRMVoucher;
   }
}

