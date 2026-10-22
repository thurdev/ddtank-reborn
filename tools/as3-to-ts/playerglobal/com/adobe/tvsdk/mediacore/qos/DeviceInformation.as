package com.adobe.tvsdk.mediacore.qos
{
   [native(cls="PSDKDeviceInformationClass",instance="PSDKDeviceInformationObject",methods="auto",construct="native")]
   [API("712")]
   public class DeviceInformation
   {
      
      public function DeviceInformation()
      {
         super();
      }
      
      final public native function get runtimeVersion() : String;
      
      final public native function get runtimeType() : String;
      
      final public native function get os() : String;
      
      final public native function get densityDPI() : int;
      
      final public native function get heightPixels() : int;
      
      final public native function get widthPixels() : int;
      
      final public native function get isSeekToKeyFrame() : Boolean;
   }
}

