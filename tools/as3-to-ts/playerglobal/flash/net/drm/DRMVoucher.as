package flash.net.drm
{
   import flash.utils.ByteArray;
   
   [native(cls="DRMVoucherClass",instance="DRMVoucherObject",methods="auto",construct="native")]
   [API("667")]
   public class DRMVoucher
   {
      
      private var m_licenseID:String;
      
      private var m_policyID:String;
      
      private var m_endDate:Date;
      
      private var m_startDate:Date;
      
      private var m_offlineLeaseStartDate:Date;
      
      private var m_offlineLeaseExpirationDate:Date;
      
      private var m_customPolicies:Object;
      
      private var m_playbackTimeWindow:DRMPlaybackTimeWindow;
      
      public function DRMVoucher()
      {
         super();
      }
      
      public function get serverURL() : String
      {
         return this.FMRMSURL;
      }
      
      private native function get FMRMSURL() : String;
      
      public function get voucherStartDate() : Date
      {
         var rawStartDate:Number = NaN;
         if(this.m_startDate == null)
         {
            rawStartDate = Number(this.getStartDateInner());
            if(rawStartDate > 0)
            {
               this.m_startDate = new Date(1000 * rawStartDate);
            }
         }
         return this.m_startDate;
      }
      
      public function get voucherEndDate() : Date
      {
         var rawEndDate:Number = NaN;
         if(this.m_endDate == null)
         {
            rawEndDate = Number(this.getEndDateInner());
            if(rawEndDate > 0)
            {
               this.m_endDate = new Date(1000 * rawEndDate);
            }
         }
         return this.m_endDate;
      }
      
      public function get offlineLeaseStartDate() : Date
      {
         var rawDate:Number = NaN;
         if(this.m_offlineLeaseStartDate == null)
         {
            rawDate = Number(this.getOfflineLeaseStartDateInner());
            if(rawDate > 0)
            {
               this.m_offlineLeaseStartDate = new Date(1000 * rawDate);
            }
         }
         return this.m_offlineLeaseStartDate;
      }
      
      public function get offlineLeaseEndDate() : Date
      {
         var rawDate:Number = NaN;
         if(this.m_offlineLeaseExpirationDate == null)
         {
            rawDate = Number(this.getOfflineLeaseExpirationDateInner());
            if(rawDate > 0)
            {
               this.m_offlineLeaseExpirationDate = new Date(1000 * rawDate);
            }
         }
         return this.m_offlineLeaseExpirationDate;
      }
      
      private native function getEndDateInner() : Number;
      
      private native function getStartDateInner() : Number;
      
      private native function getOfflineLeaseStartDateInner() : Number;
      
      private native function getOfflineLeaseExpirationDateInner() : Number;
      
      public function get policies() : Object
      {
         if(this.m_customPolicies == null)
         {
            this.createCustomPolicyObject();
         }
         return this.m_customPolicies;
      }
      
      public function get licenseID() : String
      {
         if(this.m_licenseID == null)
         {
            this.m_licenseID = this.getLicenseIDInner();
         }
         return this.m_licenseID;
      }
      
      private native function getLicenseIDInner() : String;
      
      public function get policyID() : String
      {
         if(this.m_policyID == null)
         {
            this.m_policyID = this.getPolicyIDInner();
         }
         return this.m_policyID;
      }
      
      private native function getPolicyIDInner() : String;
      
      private native function createCustomPolicyObject() : void;
      
      [cppcall]
      private function setCustomPolicyObject(customPolicyObject:Object) : void
      {
         this.m_customPolicies = customPolicyObject;
      }
      
      private native function get playStartTime() : Number;
      
      private native function get playbackEndTime() : Number;
      
      private native function get playbackWindow() : Number;
      
      public function get playbackTimeWindow() : DRMPlaybackTimeWindow
      {
         var playbackWindowLength:uint = 0;
         if(this.m_playbackTimeWindow == null || this.m_playbackTimeWindow.startDate == null && this.playStartTime > 0)
         {
            playbackWindowLength = uint(this.playbackWindow);
            if(this.playbackWindow > 0)
            {
               this.m_playbackTimeWindow = this.createDRMPlaybackTimeWindow(playbackWindowLength,this.playStartTime,this.playbackEndTime);
            }
         }
         return this.m_playbackTimeWindow;
      }
      
      public function toByteArray() : ByteArray
      {
         return this.toByteArrayInner();
      }
      
      private native function createDRMPlaybackTimeWindow(param1:Number, param2:Number, param3:Number) : DRMPlaybackTimeWindow;
      
      private native function toByteArrayInner() : ByteArray;
   }
}

