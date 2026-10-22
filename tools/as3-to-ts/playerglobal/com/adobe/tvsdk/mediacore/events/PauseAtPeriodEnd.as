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
   
   [native(cls="PSDKPauseAtPeriodEndClass",instance="PSDKPauseAtPeriodEndObject",methods="auto")]
   [API("712")]
   public class PauseAtPeriodEnd extends PSDKEvent
   {
      
      public function PauseAtPeriodEnd(eventType:int, adId:uint, target:PSDKEventTargetInterface = null)
      {
         super(eventType,target);
         this.ctor(eventType,adId,target);
      }
      
      private native function ctor(param1:int, param2:uint, param3:PSDKEventTargetInterface = null) : void;
      
      final public native function get adId() : uint;
   }
}

