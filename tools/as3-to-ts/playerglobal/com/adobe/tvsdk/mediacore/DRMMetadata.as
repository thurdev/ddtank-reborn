package com.adobe.tvsdk.mediacore
{
   [native(cls="PSDKDRMMetadataClass",instance="PSDKDRMMetadataObject",methods="auto")]
   [API("712")]
   public class DRMMetadata
   {
      
      public function DRMMetadata()
      {
         super();
      }
      
      final public native function get serverUrl() : String;
      
      final public native function get licenseID() : String;
      
      final public native function get policies() : Vector.<DRMPolicy>;
   }
}

