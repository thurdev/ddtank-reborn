package com.adobe.tvsdk.mediacore
{
   import com.adobe.tvsdk.mediacore.info.DRMMetadataInfo;
   import com.adobe.tvsdk.mediacore.metadata.AdvertisingMetadata;
   import com.adobe.tvsdk.mediacore.metadata.AuditudeSettings;
   import com.adobe.tvsdk.mediacore.metadata.Metadata;
   import com.adobe.tvsdk.mediacore.metadata.TimedMetadata;
   import com.adobe.tvsdk.mediacore.qos.ApplicationInformation;
   import com.adobe.tvsdk.mediacore.qos.DeviceInformation;
   import com.adobe.tvsdk.mediacore.qos.QOSProvider;
   import com.adobe.tvsdk.mediacore.system.NetworkConfiguration;
   import com.adobe.tvsdk.mediacore.systems.decoders.TagDecoder;
   import com.adobe.tvsdk.mediacore.timeline.ContentTracker;
   import com.adobe.tvsdk.mediacore.timeline.Opportunity;
   import com.adobe.tvsdk.mediacore.timeline.Placement;
   import com.adobe.tvsdk.mediacore.timeline.advertising.Ad;
   import com.adobe.tvsdk.mediacore.timeline.advertising.AdAsset;
   import com.adobe.tvsdk.mediacore.timeline.advertising.AdBannerAsset;
   import com.adobe.tvsdk.mediacore.timeline.advertising.AdBreak;
   import com.adobe.tvsdk.mediacore.timeline.advertising.AdClick;
   import com.adobe.tvsdk.mediacore.timeline.advertising.policy.AdPolicySelector;
   import com.adobe.tvsdk.mediacore.timeline.generators.OpportunityGenerator;
   import com.adobe.tvsdk.mediacore.timeline.operations.AdBreakPlacement;
   import com.adobe.tvsdk.mediacore.timeline.operations.DeleteRangeTimelineOperation;
   import com.adobe.tvsdk.mediacore.timeline.resolvers.ContentResolver;
   import flash.utils.ByteArray;
   
   [native(cls="PSDKPSDKClass",instance="PSDKPSDKObject",methods="auto",construct="native")]
   [API("712")]
   public class PSDK
   {
      
      public function PSDK()
      {
         super();
      }
      
      public static native function get pSDK() : PSDK;
      
      final public native function createDispatcher() : PSDKEventDispatcher;
      
      final public native function createMediaPlayer(param1:PSDKEventDispatcher) : MediaPlayer;
      
      final public native function createMediaPlayerItemLoader(param1:PSDKEventDispatcher) : MediaPlayerItemLoader;
      
      final public native function createTagDecoder(param1:int) : TagDecoder;
      
      final public native function createAdAsset(param1:String, param2:Number, param3:MediaResource, param4:AdClick, param5:Metadata) : AdAsset;
      
      final public native function createAd(param1:String, param2:int, param3:Number, param4:Boolean, param5:AdAsset, param6:Vector.<AdBannerAsset>, param7:ContentTracker, param8:int, param9:Boolean, param10:Boolean) : Ad;
      
      final public native function createAdBreak(param1:Vector.<Ad>, param2:ContentTracker) : AdBreak;
      
      final public native function createAdBreakEx(param1:Vector.<Ad>, param2:ContentTracker, param3:int) : AdBreak;
      
      final public native function createAdBreakPlacement(param1:AdBreak, param2:Placement) : AdBreakPlacement;
      
      final public native function createDeleteRangeTimelineOperation(param1:Placement) : DeleteRangeTimelineOperation;
      
      final public native function createMetadata() : Metadata;
      
      final public native function createContentResolver(param1:int) : ContentResolver;
      
      final public native function createOpportunityGenerator(param1:int) : OpportunityGenerator;
      
      final public native function createAdPolicySelector(param1:int, param2:MediaPlayerItem) : AdPolicySelector;
      
      final public native function createDRMMetadataInfo(param1:DRMManager, param2:ByteArray, param3:Number, param4:DRMErrorListener) : DRMMetadataInfo;
      
      final public native function createMediaPlayerItemConfig(param1:Vector.<String>, param2:Vector.<String>, param3:ContentFactory, param4:NetworkConfiguration, param5:AdvertisingMetadata, param6:CustomRangeMetadata, param7:int) : MediaPlayerItemConfig;
      
      final public native function createDefaultMediaPlayerItemConfig() : MediaPlayerItemConfig;
      
      final public native function createQOSProvider() : QOSProvider;
      
      final public native function createDefaultContentFactory() : ContentFactory;
      
      final public native function pSDKErrorToString(param1:int) : String;
      
      final public native function createOpportunity(param1:String, param2:Placement, param3:Metadata, param4:Metadata) : Opportunity;
      
      final public native function createTimedMetadata(param1:int, param2:Number, param3:String, param4:String, param5:String, param6:Metadata) : TimedMetadata;
      
      final public native function createAuditudeSettings() : AuditudeSettings;
      
      final public native function createAdvertisingMetadata() : AdvertisingMetadata;
      
      final public native function createCustomRangeMetadata() : CustomRangeMetadata;
      
      final public native function createDefaultBillingMetricsConfiguration() : BillingMetricsConfiguration;
      
      final public native function createDefaultNetworkConfiguration() : NetworkConfiguration;
      
      final public native function get deviceInformation() : DeviceInformation;
      
      final public native function set deviceInformation(param1:DeviceInformation) : void;
      
      final public native function get applicationInformation() : ApplicationInformation;
      
      final public native function set applicationInformation(param1:ApplicationInformation) : void;
      
      final public native function get currentTime() : Number;
      
      final public native function set localStoragePath(param1:String) : void;
   }
}

