package flash.net.drm
{
   [native(friend="DRMContentDataObject")]
   [API("667")]
   public final class VoucherAccessInfo
   {
      
      private var m_deviceGroup:DRMDeviceGroup;
      
      private var m_displayName:String;
      
      private var m_authMethod:String;
      
      private var m_domain:String;
      
      private var m_policyID:String;
      
      public function VoucherAccessInfo()
      {
         super();
      }
      
      public function get displayName() : String
      {
         return this.m_displayName;
      }
      
      public function get authenticationMethod() : String
      {
         return this.m_authMethod;
      }
      
      public function get domain() : String
      {
         return this.m_domain;
      }
      
      public function get policyID() : String
      {
         return this.m_policyID;
      }
      
      public function get deviceGroup() : DRMDeviceGroup
      {
         return this.m_deviceGroup;
      }
      
      [cppcall]
      private function setDeviceGroup(inDeviceGroup:DRMDeviceGroup) : *
      {
         this.m_deviceGroup = inDeviceGroup;
      }
      
      [cppcall]
      private function setFields(inDisplayName:String, inAuthMethod:String, inDomain:String, inPolicyID:String) : *
      {
         this.m_displayName = inDisplayName;
         this.m_authMethod = inAuthMethod;
         this.m_domain = inDomain;
         this.m_policyID = inPolicyID;
      }
   }
}

