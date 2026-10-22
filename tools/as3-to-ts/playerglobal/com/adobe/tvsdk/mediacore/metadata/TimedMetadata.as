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
   
   [native(cls="PSDKTimedMetadataClass",instance="PSDKTimedMetadataObject",methods="auto")]
   [API("712")]
   public class TimedMetadata
   {
      
      public function TimedMetadata(type:int, time:Number, id:String, name:String, content:String, metadata:Metadata)
      {
         super();
         this.ctor(type,time,id,name,content,metadata);
      }
      
      private native function ctor(param1:int, param2:Number, param3:String, param4:String, param5:String, param6:Metadata) : void;
      
      final public native function compareTo(param1:TimedMetadata) : int;
      
      final public native function equals(param1:TimedMetadata) : Boolean;
      
      final public native function get type() : int;
      
      final public native function get time() : Number;
      
      final public native function get id() : String;
      
      final public native function get name() : String;
      
      final public native function get content() : String;
      
      final public native function get metadata() : Metadata;
   }
}

