package com.adobe.tvsdk.mediacore
{
   import flash.utils.ByteArray;
   
   [native(cls="PSDKDRMLicenseClass",instance="PSDKDRMLicenseObject",methods="auto",construct="native")]
   [API("712")]
   public class DRMLicense
   {
      
      public function DRMLicense()
      {
         super();
      }
      
      final public native function toBytes() : ByteArray;
      
      final public native function get customProperties() : Object;
      
      final public native function get licenseStartDate() : Date;
      
      final public native function get licenseEndDate() : Date;
      
      final public native function get offlineStorageStartDate() : Date;
      
      final public native function get offlineStorageEndDate() : Date;
      
      final public native function get serverUrl() : String;
      
      final public native function get licenseID() : String;
      
      final public native function get policyID() : String;
      
      final public native function get playbackTimeWindow() : DRMPlaybackTimeWindow;
   }
}

