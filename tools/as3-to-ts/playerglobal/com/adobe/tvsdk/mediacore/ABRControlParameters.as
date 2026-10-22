package com.adobe.tvsdk.mediacore
{
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
   
   [native(cls="PSDKABRControlParametersClass",instance="PSDKABRControlParametersObject",methods="auto")]
   [API("712")]
   public class ABRControlParameters
   {
      
      public static const DEFAULT_ABR_INITIAL_BITRATE:uint = 0;
      
      public static const DEFAULT_ABR_MIN_BITRATE:uint = 0;
      
      public static const DEFAULT_ABR_MAX_BITRATE:uint = 2147483647;
      
      public static const DEFAULT_ABR_POLICY:int = 1;
      
      public static const DEFAULT_MAX_PLAYOUT_RATE:Number = 1;
      
      public static const CONSERVATIVE_POLICY:int = 0;
      
      public static const MODERATE_POLICY:int = 1;
      
      public static const AGGRESSIVE_POLICY:int = 2;
      
      public function ABRControlParameters(nInitialBitRate:uint = 0, nMinBitRate:uint = 0, nMaxBitRate:uint = 2147483647, eABRPolicy:int = 1, nMinTrickPlayBitRate:uint = 0, nMaxTrickPlayBitRate:uint = 2147483647, nMaxTrickPlayBandwidthUsage:uint = 2147483647, dMaxPlayoutRate:Number = 1)
      {
         super();
         this.ctor(nInitialBitRate,nMinBitRate,nMaxBitRate,eABRPolicy,nMinTrickPlayBitRate,nMaxTrickPlayBitRate,nMaxTrickPlayBandwidthUsage,dMaxPlayoutRate);
      }
      
      private native function ctor(param1:uint = 0, param2:uint = 0, param3:uint = 2147483647, param4:int = 1, param5:uint = 0, param6:uint = 2147483647, param7:uint = 2147483647, param8:Number = 1) : void;
      
      final public native function set initialBitRate(param1:uint) : void;
      
      final public native function get initialBitRate() : uint;
      
      final public native function set minBitRate(param1:uint) : void;
      
      final public native function get minBitRate() : uint;
      
      final public native function set maxBitRate(param1:uint) : void;
      
      final public native function get maxBitRate() : uint;
      
      final public native function set minTrickPlayBitRate(param1:uint) : void;
      
      final public native function get minTrickPlayBitRate() : uint;
      
      final public native function set maxTrickPlayBitRate(param1:uint) : void;
      
      final public native function get maxTrickPlayBitRate() : uint;
      
      final public native function set maxTrickPlayBandwidthUsage(param1:uint) : void;
      
      final public native function get maxTrickPlayBandwidthUsage() : uint;
      
      final public native function set maxPlayoutRate(param1:Number) : void;
      
      final public native function get maxPlayoutRate() : Number;
      
      final public native function set policy(param1:int) : void;
      
      final public native function get policy() : int;
   }
}

