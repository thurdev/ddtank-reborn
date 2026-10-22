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
   
   [native(cls="PSDKAdAssetClass",instance="PSDKAdAssetObject",methods="auto")]
   [API("712")]
   public class AdAsset
   {
      
      public function AdAsset(id:String, duration:Number, resource:MediaResource, adClick:AdClick, metadata:Metadata)
      {
         super();
         this.ctor(id,duration,resource,adClick,metadata);
      }
      
      private native function ctor(param1:String, param2:Number, param3:MediaResource, param4:AdClick, param5:Metadata) : void;
      
      final public native function get isValid() : Boolean;
      
      final public native function get id() : String;
      
      final public native function get duration() : Number;
      
      final public native function get resource() : MediaResource;
      
      final public native function get adClick() : AdClick;
      
      final public native function get metadata() : Metadata;
      
      final public native function get adParameters() : String;
      
      final public native function set adParameters(param1:String) : void;
   }
}

