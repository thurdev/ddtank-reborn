package com.adobe.tvsdk.mediacore.events
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
   
   [native(cls="PSDKMediaPlayerStatusChangeEventClass",instance="PSDKMediaPlayerStatusChangeEventObject",methods="auto")]
   [API("712")]
   public class MediaPlayerStatusChangeEvent extends PSDKEvent
   {
      
      public static const STATUS_CHANGED:int = 118;
      
      public function MediaPlayerStatusChangeEvent(status:int, metadata:Metadata, target:PSDKEventTargetInterface = null)
      {
         super(PSDKEventType.STATUS_CHANGED,target);
         this.ctor(status,metadata,target);
      }
      
      public function get error() : Notification
      {
         return new Notification(NotificationType.ERROR,PSDKErrorCode.SUCCESS,this.metadata,null);
      }
      
      private native function ctor(param1:int, param2:Metadata, param3:PSDKEventTargetInterface = null) : void;
      
      final public native function get status() : int;
      
      final public native function get metadata() : Metadata;
   }
}

