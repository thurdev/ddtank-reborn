package com.adobe.tvsdk.mediacore.timeline.advertising
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
   import com.adobe.tvsdk.mediacore.timeline.advertising.policy.*;
   import com.adobe.tvsdk.mediacore.timeline.generators.*;
   import com.adobe.tvsdk.mediacore.timeline.operations.*;
   import com.adobe.tvsdk.mediacore.timeline.resolvers.*;
   import com.adobe.tvsdk.mediacore.utils.*;
   import com.adobe.tvsdk.mediacore.view.*;
   import flash.display.*;
   import flash.events.*;
   import flash.media.*;
   
   [native(cls="PSDKAdBannerAssetClass",instance="PSDKAdBannerAssetObject",methods="auto")]
   [API("712")]
   public class AdBannerAsset extends AdAsset
   {
      
      public function AdBannerAsset(id:String, duration:Number, resource:MediaResource, staticUrl:String, adClick:AdClick, width:uint, height:uint, mimeType:String, metadata:Metadata, trackingClickUrls:Vector.<String>, impressionUrls:Vector.<String>)
      {
         super(id,duration,resource,adClick,metadata);
         this.ctor(id,duration,resource,staticUrl,adClick,width,height,mimeType,metadata,trackingClickUrls,impressionUrls);
      }
      
      private native function ctor(param1:String, param2:Number, param3:MediaResource, param4:String, param5:AdClick, param6:uint, param7:uint, param8:String, param9:Metadata, param10:Vector.<String>, param11:Vector.<String>) : void;
      
      final public native function get width() : uint;
      
      final public native function get height() : uint;
      
      final public native function get resourceType() : String;
      
      final public native function get staticUrl() : String;
      
      final public native function get bannerData() : String;
   }
}

