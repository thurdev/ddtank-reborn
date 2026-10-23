package com.adobe.tvsdk.mediacore.events
{
   import com.adobe.tvsdk.mediacore.*;
   import com.adobe.tvsdk.mediacore.info.*;
   import com.adobe.tvsdk.mediacore.metadata.*;
   import com.adobe.tvsdk.mediacore.notifications.*;
   import com.adobe.tvsdk.mediacore.qos.*;
   import com.adobe.tvsdk.mediacore.qos.metrics.*;
   import com.adobe.tvsdk.mediacore.system.*;
   import com.adobe.tvsdk.mediacore.systems.decoders.*;
   import com.adobe.tvsdk.mediacore.timeline.*;
   import com.adobe.tvsdk.mediacore.timeline.advertising.*;
   import com.adobe.tvsdk.mediacore.timeline.advertising.policy.*;
   import com.adobe.tvsdk.mediacore.timeline.generators.*;
   import com.adobe.tvsdk.mediacore.timeline.operations.*;
   import com.adobe.tvsdk.mediacore.timeline.resolvers.*;
   import com.adobe.tvsdk.mediacore.utils.*;
   import com.adobe.tvsdk.mediacore.view.*;
   import flash.display.*;
   import flash.events.*;
   import flash.media.*;
   
   [native(cls="PSDKLoadInformationEventClass",instance="PSDKLoadInformationEventObject",methods="auto")]
   [API("712")]
   public class LoadInformationEvent extends PSDKEvent
   {
      
      public static const LOAD_INFORMATION_AVAILABLE:int = 111;
      
      public function LoadInformationEvent(loadInfo:LoadInformation, target:PSDKEventTargetInterface = null)
      {
         super(PSDKEventType.LOAD_INFORMATION_AVAILABLE,target);
         this.ctor(loadInfo,target);
      }
      
      private native function ctor(param1:LoadInformation, param2:PSDKEventTargetInterface = null) : void;
      
      final public native function get loadInformation() : LoadInformation;
   }
}

