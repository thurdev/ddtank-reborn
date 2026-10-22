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
   
   [native(cls="PSDKMediaResourceClass",instance="PSDKMediaResourceObject",methods="auto")]
   [API("712")]
   public class MediaResource
   {
      
      public function MediaResource(url:String, type:int, metadata:Metadata)
      {
         super();
         this.ctor(url,type,metadata);
      }
      
      final public native function equals(param1:MediaResource) : Boolean;
      
      private native function ctor(param1:String, param2:int, param3:Metadata) : void;
      
      final public native function get url() : String;
      
      final public native function get type() : int;
      
      final public native function get metadata() : Metadata;
      
      final public native function get isValid() : Boolean;
   }
}

