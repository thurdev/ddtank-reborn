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
   
   [native(cls="PSDKMediaPlayerItemConfigClass",instance="PSDKMediaPlayerItemConfigObject",methods="auto")]
   [API("712")]
   public class MediaPlayerItemConfig
   {
      
      public static const DEFAULT_AD_TAG:String = "#EXT-X-CUE";
      
      public static const SERVER_SIDE_AD_TAG:String = "#EXT-X-MARKER";
      
      public function MediaPlayerItemConfig(adTags:Vector.<String>, subscribeTags:Vector.<String>, factory:ContentFactory, networkConfiguration:NetworkConfiguration, advertisingMetadata:AdvertisingMetadata, customRangeMetadata:CustomRangeMetadata, adSignalingMode:int)
      {
         super();
         this.ctor(adTags,subscribeTags,factory,networkConfiguration,advertisingMetadata,customRangeMetadata,adSignalingMode);
      }
      
      private native function ctor(param1:Vector.<String>, param2:Vector.<String>, param3:ContentFactory, param4:NetworkConfiguration, param5:AdvertisingMetadata, param6:CustomRangeMetadata, param7:int) : void;
      
      final public native function get adSignalingMode() : int;
      
      final public native function set adSignalingMode(param1:int) : void;
      
      final public native function get advertisingMetadata() : AdvertisingMetadata;
      
      final public native function set advertisingMetadata(param1:AdvertisingMetadata) : void;
      
      final public native function get customRangeMetadata() : CustomRangeMetadata;
      
      final public native function set customRangeMetadata(param1:CustomRangeMetadata) : void;
      
      final public native function get advertisingFactory() : ContentFactory;
      
      final public native function set advertisingFactory(param1:ContentFactory) : void;
      
      final public native function get subscribeTags() : Vector.<String>;
      
      final public native function set subscribeTags(param1:Vector.<String>) : void;
      
      final public native function get adTags() : Vector.<String>;
      
      final public native function set adTags(param1:Vector.<String>) : void;
      
      final public native function get networkConfiguration() : NetworkConfiguration;
      
      final public native function set networkConfiguration(param1:NetworkConfiguration) : void;
      
      final public native function get billingMetricsConfiguration() : BillingMetricsConfiguration;
      
      final public native function set billingMetricsConfiguration(param1:BillingMetricsConfiguration) : void;
      
      final public native function get useHardwareDecoder() : Boolean;
      
      final public native function set useHardwareDecoder(param1:Boolean) : void;
   }
}

