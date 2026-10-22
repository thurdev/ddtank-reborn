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
   import flash.utils.ByteArray;
   
   [native(cls="PSDKAdvertisingMetadataClass",instance="PSDKAdvertisingMetadataObject",methods="auto")]
   [API("712")]
   public class AdvertisingMetadata extends Metadata
   {
      
      public function AdvertisingMetadata()
      {
         super();
         this.ctor();
      }
      
      private native function ctor() : void;
      
      override public native function containsKey(param1:String) : Boolean;
      
      override public native function clone() : Metadata;
      
      override public native function getValue(param1:String) : String;
      
      override public native function setValue(param1:String, param2:String) : void;
      
      override public native function getMetadata(param1:String) : Metadata;
      
      override public native function setMetadata(param1:String, param2:Metadata) : void;
      
      override public native function getObject(param1:String) : Object;
      
      override public native function setObject(param1:String, param2:Object) : void;
      
      override public native function getByteArray(param1:String) : ByteArray;
      
      override public native function setByteArray(param1:String, param2:ByteArray) : void;
      
      public native function get adBreakAsWatched() : int;
      
      public native function set adBreakAsWatched(param1:int) : void;
      
      public native function get hasLivePreroll() : Boolean;
      
      public native function set livePreroll(param1:Boolean) : void;
      
      public native function get hasPreroll() : Boolean;
      
      public native function set preroll(param1:Boolean) : void;
      
      public native function get hasDelayAdLoading() : Boolean;
      
      public native function set delayAdLoading(param1:Boolean) : void;
      
      override public native function get isEmpty() : Boolean;
      
      override public native function get keySet() : Vector.<String>;
   }
}

