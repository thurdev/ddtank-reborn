package com.adobe.tvsdk.mediacore
{
   [native(cls="PSDKCustomAdHandlerClientClass",instance="PSDKCustomAdHandlerClientObject",methods="auto",construct="native")]
   [API("712")]
   public class CustomAdHandlerClient
   {
      
      public function CustomAdHandlerClient()
      {
         super();
      }
      
      final public native function onAdBegin() : void;
      
      final public native function onAdPaused() : void;
      
      final public native function onAdResumed() : void;
      
      final public native function onAdError() : void;
      
      final public native function onAdEnd() : void;
      
      final public native function onAdProgress(param1:Number, param2:Number) : void;
      
      final public native function onAdClickThru(param1:String) : void;
   }
}

