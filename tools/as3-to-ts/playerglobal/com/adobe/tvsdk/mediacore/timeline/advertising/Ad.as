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
   
   [native(cls="PSDKAdClass",instance="PSDKAdObject",methods="auto")]
   [API("712")]
   public class Ad
   {
      
      public function Ad(id:String, adType:int, duration:Number, isCustomAdMarker:Boolean, primaryAsset:AdAsset, companionAssets:Vector.<AdBannerAsset>, tracker:ContentTracker, adInsertionType:int, isClickable:Boolean, isCustomAd:Boolean)
      {
         super();
         this.ctor(id,adType,duration,isCustomAdMarker,primaryAsset,companionAssets,tracker,adInsertionType,isClickable,isCustomAd);
      }
      
      private native function ctor(param1:String, param2:int, param3:Number, param4:Boolean, param5:AdAsset, param6:Vector.<AdBannerAsset>, param7:ContentTracker, param8:int, param9:Boolean, param10:Boolean) : void;
      
      final public native function equals(param1:Ad) : Boolean;
      
      final public native function get primaryAsset() : AdAsset;
      
      final public native function get companionAssets() : Vector.<AdBannerAsset>;
      
      final public native function get duration() : Number;
      
      final public native function get id() : String;
      
      final public native function get adType() : int;
      
      final public native function get isCustomAd() : Boolean;
      
      final public native function get adInsertionType() : int;
      
      final public native function get tracker() : ContentTracker;
      
      final public native function get isClickable() : Boolean;
      
      final public native function get isVPAIDAd() : Boolean;
   }
}

