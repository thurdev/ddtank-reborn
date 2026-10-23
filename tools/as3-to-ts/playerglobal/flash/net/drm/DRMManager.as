package flash.net.drm
{
   import flash.events.*;
   import flash.utils.ByteArray;
   
   [native(cls="DRMManagerClass",instance="DRMManagerObject",methods="auto",construct="native")]
   [API("667")]
   [Event(name="drmError",type="flash.events.DRMErrorEvent")]
   [Event(name="drmStatus",type="flash.events.DRMStatusEvent")]
   [Event(name="authenticationError",type="flash.events.DRMAuthenticationErrorEvent")]
   [Event(name="authenticationComplete",type="flash.events.DRMAuthenticationCompleteEvent")]
   public class DRMManager extends EventDispatcher
   {
      
      private static var theManager:DRMManager = null;
      
      private static var mNetworkIdleTimeoutInMS:Number = 120000;
      
      public function DRMManager()
      {
         super();
      }
      
      [cppcall]
      internal static function getDRMManagerInternal() : DRMManager
      {
         if(theManager == null)
         {
            theManager = createDRMManager();
         }
         return theManager;
      }
      
      public static function getDRMManager() : DRMManager
      {
         checkRemoteSWFInvocation();
         return getDRMManagerInternal();
      }
      
      private static native function createDRMManager() : DRMManager;
      
      public static function set networkIdleTimeout(timeoutInMS:Number) : void
      {
         mNetworkIdleTimeoutInMS = timeoutInMS;
      }
      
      public static function get networkIdleTimeout() : Number
      {
         return mNetworkIdleTimeoutInMS;
      }
      
      [API("667")]
      public static function get isSupported() : Boolean
      {
         return _checkSupported();
      }
      
      private static native function _checkSupported() : Boolean;
      
      private static function checkRemoteSWFInvocation() : void
      {
         if(isCalledFromRemoteSWF() == true)
         {
            throw new SecurityError();
         }
      }
      
      private static native function isCalledFromRemoteSWF() : Boolean;
      
      public function authenticate(serverURL:String, domain:String, username:String, password:String) : void
      {
         var context:DRMAuthenticationContext = new DRMAuthenticationContext();
         context.addEventListener(DRMAuthenticationCompleteEvent.AUTHENTICATION_COMPLETE,this.onAuthenticationComplete);
         context.addEventListener(DRMAuthenticationErrorEvent.AUTHENTICATION_ERROR,this.onAuthenticationError);
         context.authenticate(serverURL,domain,username,password);
      }
      
      public function setAuthenticationToken(serverUrl:String, domain:String, token:ByteArray) : void
      {
         var err:uint = uint(this.setSAMLTokenInner(serverUrl,domain,token));
         if(err != 0)
         {
            this.errorCodeToThrow(err);
         }
      }
      
      public function loadVoucher(contentData:DRMContentData, setting:String) : void
      {
         var context:DRMVoucherStoreContext = null;
         if(contentData == null)
         {
            throw new ArgumentError();
         }
         if(setting == LoadVoucherSetting.FORCE_REFRESH)
         {
            this.downloadVoucher(contentData,false);
         }
         else if(setting == LoadVoucherSetting.LOCAL_ONLY)
         {
            context = new DRMVoucherStoreContext();
            context.addEventListener(DRMStatusEvent.DRM_STATUS,this.onGetVoucherFromStoreComplete);
            context.addEventListener(DRMErrorEvent.DRM_ERROR,this.onGetVoucherFromStoreError);
            context.getVoucherFromStore(contentData);
         }
         else
         {
            if(setting != LoadVoucherSetting.ALLOW_SERVER)
            {
               throw new ArgumentError();
            }
            context = new DRMVoucherStoreContext();
            context.addEventListener(DRMStatusEvent.DRM_STATUS,this.onGetVoucherFromStoreWithAllowServerComplete);
            context.addEventListener(DRMErrorEvent.DRM_ERROR,this.onGetVoucherFromStoreWithAllowServerError);
            context.getVoucherFromStore(contentData);
         }
      }
      
      [API("667")]
      public function loadPreviewVoucher(contentData:DRMContentData) : void
      {
         if(contentData == null)
         {
            throw new ArgumentError();
         }
         this.downloadVoucher(contentData,true);
      }
      
      private function downloadVoucher(contentData:DRMContentData, previewVoucher:Boolean = false) : void
      {
         var context:DRMVoucherDownloadContext = new DRMVoucherDownloadContext();
         context.addEventListener(DRMStatusEvent.DRM_STATUS,this.onDownloadVoucherComplete);
         context.addEventListener(DRMErrorEvent.DRM_ERROR,this.onDownloadVoucherError);
         context.download(contentData,previewVoucher);
      }
      
      private native function resetDRMVouchersAllowed(param1:Boolean) : Boolean;
      
      [cppcall]
      internal function resetDRMVouchersInternal(isAutoReset:Boolean) : void
      {
         if(!this.resetDRMVouchersAllowed(isAutoReset))
         {
            return;
         }
         var context:DRMResetContext = new DRMResetContext(isAutoReset);
         context.addEventListener(DRMStatusEvent.DRM_STATUS,this.onResetComplete);
         context.addEventListener(DRMErrorEvent.DRM_ERROR,this.onResetError);
         context.doReset();
      }
      
      [API("690")]
      public function resetDRMVouchers() : void
      {
         this.resetDRMVouchersInternal(false);
      }
      
      [API("692")]
      public function addToDeviceGroup(deviceGroup:DRMDeviceGroup, forceRefresh:Boolean = false) : void
      {
         var context:DRMAddToDeviceGroupContext = new DRMAddToDeviceGroupContext();
         context.addEventListener(DRMDeviceGroupEvent.ADD_TO_DEVICE_GROUP_COMPLETE,this.onDeviceGroupOperationComplete);
         context.addEventListener(DRMDeviceGroupErrorEvent.ADD_TO_DEVICE_GROUP_ERROR,this.onDeviceGroupOperationError);
         context.addToDeviceGroup(deviceGroup,forceRefresh);
      }
      
      [API("692")]
      public function removeFromDeviceGroup(deviceGroup:DRMDeviceGroup) : void
      {
         var context:DRMRemoveFromDeviceGroupContext = new DRMRemoveFromDeviceGroupContext();
         context.addEventListener(DRMDeviceGroupEvent.REMOVE_FROM_DEVICE_GROUP_COMPLETE,this.onDeviceGroupOperationComplete);
         context.addEventListener(DRMDeviceGroupErrorEvent.REMOVE_FROM_DEVICE_GROUP_ERROR,this.onDeviceGroupOperationError);
         context.removeFromDeviceGroup(deviceGroup);
      }
      
      private function onDeviceGroupOperationComplete(theEvent:DRMDeviceGroupEvent) : void
      {
         var context:DRMRemoveFromDeviceGroupContext = null;
         var context2:DRMAddToDeviceGroupContext = null;
         var event:Event = theEvent.clone();
         dispatchEvent(event);
         if(event.type == DRMDeviceGroupEvent.REMOVE_FROM_DEVICE_GROUP_COMPLETE)
         {
            context = theEvent.target as DRMRemoveFromDeviceGroupContext;
            context.removeEventListener(DRMDeviceGroupEvent.REMOVE_FROM_DEVICE_GROUP_COMPLETE,this.onDeviceGroupOperationComplete);
            context.removeEventListener(DRMDeviceGroupErrorEvent.REMOVE_FROM_DEVICE_GROUP_ERROR,this.onDeviceGroupOperationError);
         }
         else
         {
            context2 = theEvent.target as DRMAddToDeviceGroupContext;
            context2.removeEventListener(DRMDeviceGroupEvent.ADD_TO_DEVICE_GROUP_COMPLETE,this.onDeviceGroupOperationComplete);
            context2.removeEventListener(DRMDeviceGroupErrorEvent.ADD_TO_DEVICE_GROUP_ERROR,this.onDeviceGroupOperationError);
         }
      }
      
      private function onDeviceGroupOperationError(theEvent:DRMDeviceGroupErrorEvent) : void
      {
         var context:DRMRemoveFromDeviceGroupContext = null;
         var context2:DRMAddToDeviceGroupContext = null;
         var event:Event = theEvent.clone();
         dispatchEvent(event);
         if(event.type == DRMDeviceGroupErrorEvent.REMOVE_FROM_DEVICE_GROUP_ERROR)
         {
            context = theEvent.target as DRMRemoveFromDeviceGroupContext;
            context.removeEventListener(DRMDeviceGroupEvent.REMOVE_FROM_DEVICE_GROUP_COMPLETE,this.onDeviceGroupOperationComplete);
            context.removeEventListener(DRMDeviceGroupErrorEvent.REMOVE_FROM_DEVICE_GROUP_ERROR,this.onDeviceGroupOperationError);
         }
         else
         {
            context2 = theEvent.target as DRMAddToDeviceGroupContext;
            context2.removeEventListener(DRMDeviceGroupEvent.ADD_TO_DEVICE_GROUP_COMPLETE,this.onDeviceGroupOperationComplete);
            context2.removeEventListener(DRMDeviceGroupErrorEvent.ADD_TO_DEVICE_GROUP_ERROR,this.onDeviceGroupOperationError);
         }
      }
      
      [API("674")]
      public function storeVoucher(voucher:ByteArray) : void
      {
         var context:DRMStoreVoucherContext = new DRMStoreVoucherContext(voucher);
         context.addEventListener(DRMStatusEvent.DRM_STATUS,this.onStoreVoucherComplete);
         context.addEventListener(DRMErrorEvent.DRM_ERROR,this.onStoreVoucherError);
         context.doStoreVoucher();
      }
      
      [API("690")]
      public function returnVoucher(inServerURL:String, immediateCommit:Boolean, licenseID:String, policyID:String) : void
      {
         if(inServerURL == null || licenseID == null && policyID == null)
         {
            throw new ArgumentError();
         }
         var context:DRMReturnVoucherContext = new DRMReturnVoucherContext();
         context.addEventListener(DRMReturnVoucherCompleteEvent.RETURN_VOUCHER_COMPLETE,this.onReturnVoucherComplete);
         context.addEventListener(DRMReturnVoucherErrorEvent.RETURN_VOUCHER_ERROR,this.onReturnVoucherError);
         context.returnVoucher(inServerURL,immediateCommit,licenseID,policyID);
      }
      
      private native function setSAMLTokenInner(param1:String, param2:String, param3:ByteArray) : uint;
      
      private function onAuthenticationComplete(theEvent:DRMAuthenticationCompleteEvent) : void
      {
         var event:Event = theEvent.clone();
         dispatchEvent(event);
         var context:DRMAuthenticationContext = theEvent.target as DRMAuthenticationContext;
         context.removeEventListener(DRMAuthenticationCompleteEvent.AUTHENTICATION_COMPLETE,this.onAuthenticationComplete);
         context.removeEventListener(DRMAuthenticationErrorEvent.AUTHENTICATION_ERROR,this.onAuthenticationError);
      }
      
      private function onAuthenticationError(theEvent:DRMAuthenticationErrorEvent) : void
      {
         var event:Event = theEvent.clone();
         dispatchEvent(event);
         var context:DRMAuthenticationContext = theEvent.target as DRMAuthenticationContext;
         context.removeEventListener(DRMAuthenticationCompleteEvent.AUTHENTICATION_COMPLETE,this.onAuthenticationComplete);
         context.removeEventListener(DRMAuthenticationErrorEvent.AUTHENTICATION_ERROR,this.onAuthenticationError);
      }
      
      private function onGetVoucherFromStoreComplete(theEvent:DRMStatusEvent) : void
      {
         this.issueDRMStatusEvent(theEvent.type,theEvent.contentData,theEvent.voucher,true);
         var context:DRMVoucherStoreContext = theEvent.target as DRMVoucherStoreContext;
         context.removeEventListener(DRMStatusEvent.DRM_STATUS,this.onGetVoucherFromStoreComplete);
         context.removeEventListener(DRMErrorEvent.DRM_ERROR,this.onDownloadVoucherError);
      }
      
      private function onGetVoucherFromStoreError(theEvent:DRMErrorEvent) : void
      {
         this.issueDRMErrorEvent(theEvent.contentData,theEvent.errorID,theEvent.subErrorID,theEvent.text);
         var context:DRMVoucherStoreContext = theEvent.target as DRMVoucherStoreContext;
         context.removeEventListener(DRMStatusEvent.DRM_STATUS,this.onGetVoucherFromStoreComplete);
         context.removeEventListener(DRMErrorEvent.DRM_ERROR,this.onDownloadVoucherError);
      }
      
      private function onDownloadVoucherComplete(theEvent:DRMStatusEvent) : void
      {
         this.issueDRMStatusEvent(theEvent.type,theEvent.contentData,theEvent.voucher,false);
         var context:DRMVoucherDownloadContext = theEvent.target as DRMVoucherDownloadContext;
         context.removeEventListener(DRMStatusEvent.DRM_STATUS,this.onDownloadVoucherComplete);
         context.removeEventListener(DRMErrorEvent.DRM_ERROR,this.onDownloadVoucherError);
      }
      
      private function onGetVoucherFromStoreWithAllowServerComplete(theEvent:DRMStatusEvent) : void
      {
         if(theEvent.voucher != null)
         {
            this.issueDRMStatusEvent(theEvent.type,theEvent.contentData,theEvent.voucher,true);
         }
         else
         {
            this.downloadVoucher(theEvent.contentData);
         }
         var context:DRMVoucherStoreContext = theEvent.target as DRMVoucherStoreContext;
         context.removeEventListener(DRMStatusEvent.DRM_STATUS,this.onGetVoucherFromStoreWithAllowServerComplete);
         context.removeEventListener(DRMErrorEvent.DRM_ERROR,this.onGetVoucherFromStoreWithAllowServerError);
      }
      
      private function onDownloadVoucherError(theEvent:DRMErrorEvent) : void
      {
         this.issueDRMErrorEvent(theEvent.contentData,theEvent.errorID,theEvent.subErrorID,theEvent.text);
         var context:DRMVoucherDownloadContext = theEvent.target as DRMVoucherDownloadContext;
         context.removeEventListener(DRMStatusEvent.DRM_STATUS,this.onDownloadVoucherComplete);
         context.removeEventListener(DRMErrorEvent.DRM_ERROR,this.onDownloadVoucherError);
      }
      
      private function onGetVoucherFromStoreWithAllowServerError(theEvent:DRMErrorEvent) : void
      {
         this.downloadVoucher(theEvent.contentData);
         var context:DRMVoucherStoreContext = theEvent.target as DRMVoucherStoreContext;
         context.removeEventListener(DRMStatusEvent.DRM_STATUS,this.onGetVoucherFromStoreWithAllowServerComplete);
         context.removeEventListener(DRMErrorEvent.DRM_ERROR,this.onGetVoucherFromStoreWithAllowServerError);
      }
      
      private function onResetComplete(theEvent:DRMStatusEvent) : void
      {
         var context:DRMResetContext = theEvent.target as DRMResetContext;
         context.removeEventListener(DRMStatusEvent.DRM_STATUS,this.onResetComplete);
         context.removeEventListener(DRMErrorEvent.DRM_ERROR,this.onResetError);
      }
      
      private function onResetError(theEvent:DRMErrorEvent) : void
      {
         var context:DRMResetContext = theEvent.target as DRMResetContext;
         context.removeEventListener(DRMStatusEvent.DRM_STATUS,this.onResetComplete);
         context.removeEventListener(DRMErrorEvent.DRM_ERROR,this.onResetError);
      }
      
      private function onStoreVoucherComplete(theEvent:DRMStatusEvent) : void
      {
         var context:DRMStoreVoucherContext = theEvent.target as DRMStoreVoucherContext;
         context.removeEventListener(DRMStatusEvent.DRM_STATUS,this.onResetComplete);
         context.removeEventListener(DRMErrorEvent.DRM_ERROR,this.onResetError);
      }
      
      private function onStoreVoucherError(theEvent:DRMErrorEvent) : void
      {
         var context:DRMStoreVoucherContext = theEvent.target as DRMStoreVoucherContext;
         context.removeEventListener(DRMStatusEvent.DRM_STATUS,this.onResetComplete);
         context.removeEventListener(DRMErrorEvent.DRM_ERROR,this.onResetError);
      }
      
      private function onReturnVoucherComplete(theEvent:DRMReturnVoucherCompleteEvent) : void
      {
         var event:Event = theEvent.clone();
         dispatchEvent(event);
         var context:DRMReturnVoucherContext = theEvent.target as DRMReturnVoucherContext;
         context.removeEventListener(DRMReturnVoucherCompleteEvent.RETURN_VOUCHER_COMPLETE,this.onReturnVoucherComplete);
         context.removeEventListener(DRMReturnVoucherErrorEvent.RETURN_VOUCHER_ERROR,this.onReturnVoucherError);
      }
      
      private function onReturnVoucherError(theEvent:DRMReturnVoucherErrorEvent) : void
      {
         var event:Event = theEvent.clone();
         dispatchEvent(event);
         var context:DRMReturnVoucherContext = theEvent.target as DRMReturnVoucherContext;
         context.removeEventListener(DRMReturnVoucherCompleteEvent.RETURN_VOUCHER_COMPLETE,this.onReturnVoucherComplete);
         context.removeEventListener(DRMReturnVoucherErrorEvent.RETURN_VOUCHER_ERROR,this.onReturnVoucherError);
      }
      
      private native function errorCodeToThrow(param1:uint) : void;
      
      private native function issueDRMStatusEvent(param1:String, param2:DRMContentData, param3:DRMVoucher, param4:Boolean) : void;
      
      private native function issueDRMErrorEvent(param1:DRMContentData, param2:int, param3:int, param4:String) : void;
   }
}

