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
   
   [native(cls="PSDKNotificationEventClass",instance="PSDKNotificationEventObject",methods="auto")]
   [API("712")]
   public class NotificationEvent extends PSDKEvent
   {
      
      public static const OPERATION_FAILED:int = 131;
      
      public function NotificationEvent(type:int, notification:Notification, target:PSDKEventTargetInterface = null)
      {
         super(type,target);
         this.ctor(type,notification,target);
      }
      
      private native function ctor(param1:int, param2:Notification, param3:PSDKEventTargetInterface = null) : void;
      
      final public native function get notification() : Notification;
   }
}

