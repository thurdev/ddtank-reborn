package com.adobe.tvsdk.mediacore.info
{
   import com.adobe.tvsdk.mediacore.DRMMetadata;
   import com.adobe.tvsdk.mediacore.utils.TimeRange;
   
   [native(cls="PSDKDRMMetadataInfoClass",instance="PSDKDRMMetadataInfoObject",methods="auto")]
   [API("712")]
   public class DRMMetadataInfo
   {
      
      public function DRMMetadataInfo()
      {
         super();
      }
      
      final public native function get drmMetadata() : DRMMetadata;
      
      final public native function get prefetchTimestamp() : Number;
      
      final public native function get timeRange() : TimeRange;
   }
}

