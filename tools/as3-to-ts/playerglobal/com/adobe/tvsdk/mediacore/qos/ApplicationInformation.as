package com.adobe.tvsdk.mediacore.qos
{
   [native(cls="PSDKApplicationInformationClass",instance="PSDKApplicationInformationObject",methods="auto",construct="native")]
   [API("712")]
   public class ApplicationInformation
   {
      
      public function ApplicationInformation()
      {
         super();
      }
      
      final public native function get publisherId() : String;
      
      final public native function get visitorId() : String;
   }
}

