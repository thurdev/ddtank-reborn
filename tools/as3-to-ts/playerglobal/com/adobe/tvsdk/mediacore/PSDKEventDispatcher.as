package com.adobe.tvsdk.mediacore
{
   [native(cls="PSDKPSDKEventDispatcherClass",instance="PSDKPSDKEventDispatcherObject",methods="auto",construct="native")]
   [API("712")]
   public class PSDKEventDispatcher
   {
      
      public static const AllEventWildcard:int = -1;
      
      public function PSDKEventDispatcher()
      {
         super();
      }
      
      final public native function dispatchEvent(param1:PSDKEvent) : void;
      
      final public native function validateThreadBinding() : void;
      
      final public native function addEventListener(param1:int, param2:Function) : Object;
      
      final public native function removeEventListener(param1:int, param2:Function) : void;
   }
}

