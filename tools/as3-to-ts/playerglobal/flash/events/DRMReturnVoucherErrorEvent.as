package flash.events
{
   import flash.net.drm.*;
   
   [API("690")]
   public class DRMReturnVoucherErrorEvent extends ErrorEvent
   {
      
      public static const RETURN_VOUCHER_ERROR:String = "returnVoucherError";
      
      private var m_subErrorID:int;
      
      private var m_serverURL:String;
      
      private var m_licenseID:String;
      
      private var m_policyID:String;
      
      public function DRMReturnVoucherErrorEvent(type:String, bubbles:Boolean = false, cancelable:Boolean = false, inDetail:String = "", inErrorID:int = 0, inSubErrorID:int = 0, inServerURL:String = null, inLicenseID:String = null, inPolicyID:String = null)
      {
         super(type,bubbles,cancelable,inDetail,inErrorID);
         this.m_subErrorID = inSubErrorID;
         this.m_serverURL = inServerURL;
         this.m_licenseID = inLicenseID;
         this.m_policyID = inPolicyID;
      }
      
      override public function clone() : Event
      {
         return new DRMReturnVoucherErrorEvent(type,bubbles,cancelable,text,errorID,this.subErrorID,this.serverURL,this.licenseID,this.policyID);
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
   }
}

