package com.adobe.tvsdk.mediacore
{
   [native(cls="PSDKDRMPolicyClass",instance="PSDKDRMPolicyObject",methods="auto")]
   [API("712")]
   public class DRMPolicy
   {
      
      public function DRMPolicy()
      {
         super();
      }
      
      final public native function get authenticationDomain() : String;
      
      final public native function get authenticationMethod() : int;
      
      final public native function get displayName() : String;
      
      final public native function get licenseDomain() : DRMLicenseDomain;
   }
}

