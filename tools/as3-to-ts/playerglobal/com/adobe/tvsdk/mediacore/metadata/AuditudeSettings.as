package com.adobe.tvsdk.mediacore.metadata
{
   import com.adobe.tvsdk.mediacore.*;
   import com.adobe.tvsdk.mediacore.info.*;
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
   
   [native(cls="PSDKAuditudeSettingsClass",instance="PSDKAuditudeSettingsObject",methods="auto")]
   [API("712")]
   public class AuditudeSettings extends AdvertisingMetadata
   {
      
      public function AuditudeSettings()
      {
         super();
         this.ctor();
      }
      
      private native function ctor() : void;
      
      final public native function enableVPAIDAdsOnLive(param1:Boolean) : void;
      
      final override public native function clone() : Metadata;
      
      final public native function get zoneId() : String;
      
      final public native function set zoneId(param1:String) : void;
      
      final public native function get mediaId() : String;
      
      final public native function set mediaId(param1:String) : void;
      
      final public native function get defaultMediaId() : String;
      
      final public native function set defaultMediaId(param1:String) : void;
      
      final public native function get domain() : String;
      
      final public native function set domain(param1:String) : void;
      
      final public native function get adRequestDomain() : String;
      
      final public native function set adRequestDomain(param1:String) : void;
      
      final public native function get userAgent() : String;
      
      final public native function set userAgent(param1:String) : void;
      
      final public native function get targetingInfo() : Metadata;
      
      final public native function set targetingInfo(param1:Metadata) : void;
      
      final public native function get customParameters() : Metadata;
      
      final public native function set customParameters(param1:Metadata) : void;
      
      final public native function get creativeRepackagingFormat() : String;
      
      final public native function set creativeRepackagingFormat(param1:String) : void;
      
      final public native function get creativeRepackagingEnabled() : Boolean;
      
      final public native function set creativeRepackagingEnabled(param1:Boolean) : void;
      
      final public native function get showStaticBanners() : Boolean;
      
      final public native function set showStaticBanners(param1:Boolean) : void;
      
      final public native function get fallbackOnInvalidCreative() : Boolean;
      
      final public native function set fallbackOnInvalidCreative(param1:Boolean) : void;
      
      final public native function get vpaidAdWithLive() : Boolean;
      
      final public native function get validMimeTypes() : Vector.<String>;
      
      final public native function set validMimeTypes(param1:Vector.<String>) : void;
      
      final public native function get creativeRepackagingDomain() : String;
      
      final public native function set creativeRepackagingDomain(param1:String) : void;
   }
}

