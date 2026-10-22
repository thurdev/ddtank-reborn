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
   
   [native(cls="PSDKCustomRangeMetadataClass",instance="PSDKCustomRangeMetadataObject",methods="auto")]
   [API("712")]
   public class CustomRangeMetadata
   {
      
      public function CustomRangeMetadata()
      {
         super();
         this.ctor();
      }
      
      private native function ctor() : void;
      
      final public native function get type() : int;
      
      final public native function set type(param1:int) : void;
      
      final public native function get adjustSeekPosition() : Boolean;
      
      final public native function set adjustSeekPosition(param1:Boolean) : void;
      
      final public native function get timeRangeList() : Vector.<ReplaceTimeRange>;
      
      final public native function set timeRangeList(param1:Vector.<ReplaceTimeRange>) : void;
   }
}

