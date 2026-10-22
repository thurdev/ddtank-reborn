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
   
   [native(cls="PSDKAdPlaybackEventClass",instance="PSDKAdPlaybackEventObject",methods="auto")]
   [API("712")]
   public class AdPlaybackEvent extends PSDKEvent
   {
      
      public static const AD_STARTED:int = 105;
      
      public static const AD_PROGRESS:int = 106;
      
      public static const AD_COMPLETED:int = 107;
      
      public function AdPlaybackEvent(type:int, adBreak:AdBreak, ad:Ad, progress:Number, rate:Number, time:Number, target:PSDKEventTargetInterface = null)
      {
         super(type,target);
         this.ctor(type,adBreak,ad,progress,rate,time,target);
      }
      
      private native function ctor(param1:int, param2:AdBreak, param3:Ad, param4:Number, param5:Number, param6:Number, param7:PSDKEventTargetInterface = null) : void;
      
      final public native function get adBreak() : AdBreak;
      
      final public native function get ad() : Ad;
      
      final public native function get progress() : Number;
      
      final public native function get rate() : Number;
      
      final public native function get time() : Number;
   }
}

