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
   
   [native(cls="PSDKMetadataClass",instance="PSDKMetadataObject",methods="auto")]
   [API("712")]
   public class Metadata
   {
      
      public function Metadata()
      {
         super();
         this.ctor();
      }
      
      private native function ctor() : void;
      
      public native function containsKey(param1:String) : Boolean;
      
      public native function clone() : Metadata;
      
      public native function getValue(param1:String) : String;
      
      public native function setValue(param1:String, param2:String) : void;
      
      public native function getMetadata(param1:String) : Metadata;
      
      public native function setMetadata(param1:String, param2:Metadata) : void;
      
      public native function getObject(param1:String) : Object;
      
      public native function setObject(param1:String, param2:Object) : void;
      
      public native function getByteArray(param1:String) : ByteArray;
      
      public native function setByteArray(param1:String, param2:ByteArray) : void;
      
      public native function get isEmpty() : Boolean;
      
      public native function get keySet() : Vector.<String>;
   }
}

