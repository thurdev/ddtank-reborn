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
   
   [native(cls="PSDKAdBreakPlaybackEventClass",instance="PSDKAdBreakPlaybackEventObject",methods="auto")]
   [API("712")]
   public class AdBreakPlaybackEvent extends PSDKEvent
   {
      
      public static const AD_BREAK_STARTED:int = 101;
      
      public static const AD_BREAK_COMPLETED:int = 102;
      
      public static const AD_BREAK_SKIPPED:int = 103;
      
      public function AdBreakPlaybackEvent(type:int, adBreak:AdBreak, target:PSDKEventTargetInterface = null)
      {
         super(type,target);
         this.ctor(type,adBreak,target);
      }
      
      private native function ctor(param1:int, param2:AdBreak, param3:PSDKEventTargetInterface = null) : void;
      
      final public native function get adBreak() : AdBreak;
   }
}

