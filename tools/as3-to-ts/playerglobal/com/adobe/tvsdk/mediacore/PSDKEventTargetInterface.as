package com.adobe.tvsdk.mediacore
{
   [native(cls="PSDKPSDKEventTargetInterfaceClass",instance="PSDKPSDKEventTargetInterfaceObject",methods="auto",construct="native")]
   [API("712")]
   public class PSDKEventTargetInterface
   {
      
      public function PSDKEventTargetInterface()
      {
         super();
      }
      
      public native function get eventDispatcher() : PSDKEventDispatcher;
   }
}

