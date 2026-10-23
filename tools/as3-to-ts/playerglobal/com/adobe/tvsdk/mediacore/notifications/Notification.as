package com.adobe.tvsdk.mediacore.notifications
{
   import com.adobe.tvsdk.mediacore.*;
   import com.adobe.tvsdk.mediacore.info.*;
   import com.adobe.tvsdk.mediacore.metadata.*;
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
   
   [native(cls="PSDKNotificationClass",instance="PSDKNotificationObject",methods="auto")]
   [API("712")]
   public class Notification
   {
      
      public function Notification(type:int, code:int, metadata:Metadata, innerNotification:Notification)
      {
         super();
         this.ctor(type,code,metadata,innerNotification);
      }
      
      public function toString() : String
      {
         return "Notification Object { type=" + this.type + " code=" + this.code + " metadata: " + this.metadata + " }";
      }
      
      private native function ctor(param1:int, param2:int, param3:Metadata, param4:Notification) : void;
      
      final public native function get type() : int;
      
      final public native function get code() : int;
      
      final public native function get metadata() : Metadata;
      
      final public native function get innerNotification() : Notification;
   }
}

