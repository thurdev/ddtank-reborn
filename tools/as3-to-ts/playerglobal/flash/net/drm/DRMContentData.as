package flash.net.drm
{
   import flash.utils.*;
   
   [native(cls="DRMContentDataClass",instance="DRMContentDataObject",methods="auto")]
   [API("667")]
   public class DRMContentData
   {
      
      private static var m_internalOnly:ByteArray = new ByteArray();
      
      private var m_licenseID:String;
      
      private var m_domain:String;
      
      private var m_voucherAccessInfo:Vector.<VoucherAccessInfo>;
      
      public function DRMContentData(rawData:ByteArray = null)
      {
         super();
         var err:uint = uint(this.setRawMetadataInner(rawData));
         if(err != 0)
         {
            this.errorCodeToThrow(err);
         }
      }
      
      public function get serverURL() : String
      {
         return this.FMRMSURL;
      }
      
      private native function get FMRMSURL() : String;
      
      public native function get authenticationMethod() : String;
      
      public function get licenseID() : String
      {
         if(this.m_licenseID == null)
         {
            this.m_licenseID = this.getLicenseIDInner();
         }
         return this.m_licenseID;
      }
      
      public function get domain() : String
      {
         if(this.m_domain == null)
         {
            this.m_domain = this.getDomainInner();
         }
         return this.m_domain;
      }
      
      [API("667")]
      public function getVoucherAccessInfo() : Vector.<VoucherAccessInfo>
      {
         if(this.m_voucherAccessInfo == null)
         {
            this.populateVoucherAccessInfo();
         }
         return this.m_voucherAccessInfo;
      }
      
      private native function getLicenseIDInner() : String;
      
      private native function getDomainInner() : String;
      
      private native function setRawMetadataInner(param1:ByteArray) : uint;
      
      private native function errorCodeToThrow(param1:uint) : void;
      
      private native function populateVoucherAccessInfo() : void;
      
      [cppcall]
      private function addVoucherAccessInfo(newVoucherAccessInfo:VoucherAccessInfo) : void
      {
         if(this.m_voucherAccessInfo == null)
         {
            this.m_voucherAccessInfo = new Vector.<VoucherAccessInfo>();
         }
         this.m_voucherAccessInfo.push(newVoucherAccessInfo);
      }
   }
}

