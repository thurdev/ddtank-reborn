package flash.events
{
   import flash.net.drm.*;
   
   [API("690")]
   public class DRMReturnVoucherCompleteEvent extends Event
   {
      
      public static const RETURN_VOUCHER_COMPLETE:String = "returnVoucherComplete";
      
      private var m_serverURL:String;
      
      private var m_licenseID:String;
      
      private var m_policyID:String;
      
      private var m_numberOfVouchersReturned:int;
      
      public function DRMReturnVoucherCompleteEvent(type:String, bubbles:Boolean = false, cancelable:Boolean = false, inServerURL:String = null, inLicenseID:String = null, inPolicyID:String = null, inNumberOfVouchersReturned:int = 0)
      {
         super(type,bubbles,cancelable);
         this.m_serverURL = inServerURL;
         this.m_licenseID = inLicenseID;
         this.m_policyID = inPolicyID;
         this.m_numberOfVouchersReturned = inNumberOfVouchersReturned;
      }
      
      override public function clone() : Event
      {
         return new DRMReturnVoucherCompleteEvent(type,bubbles,cancelable,this.serverURL,this.licenseID,this.policyID,this.numberOfVouchersReturned);
      }
      
      public function get serverURL() : String
      {
         return this.m_serverURL;
      }
      
      public function set serverURL(value:String) : void
      {
         this.m_serverURL = value;
      }
      
      public function get licenseID() : String
      {
         return this.m_licenseID;
      }
      
      public function set licenseID(value:String) : void
      {
         this.m_licenseID = value;
      }
      
      public function get policyID() : String
      {
         return this.m_policyID;
      }
      
      public function set policyID(value:String) : void
      {
         this.m_policyID = value;
      }
      
      public function get numberOfVouchersReturned() : int
      {
         return this.m_numberOfVouchersReturned;
      }
      
      public function set numberOfVouchersReturned(value:int) : void
      {
         this.m_numberOfVouchersReturned = value;
      }
   }
}

