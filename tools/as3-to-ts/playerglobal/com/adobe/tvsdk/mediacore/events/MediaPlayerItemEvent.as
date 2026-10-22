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
   
   [native(cls="PSDKMediaPlayerItemEventClass",instance="PSDKMediaPlayerItemEventObject",methods="auto")]
   [API("712")]
   public class MediaPlayerItemEvent extends PSDKEvent
   {
      
      public static const ITEM_CREATED:int = 112;
      
      public static const ITEM_UPDATED:int = 113;
      
      public static const CAPTIONS_UPDATED:int = 114;
      
      public static const AUDIO_UPDATED:int = 115;
      
      public static const MASTER_UPDATED:int = 117;
      
      public function MediaPlayerItemEvent(type:int, item:MediaPlayerItem, target:PSDKEventTargetInterface = null)
      {
         super(type,target);
         this.ctor(type,item,target);
      }
      
      private native function ctor(param1:int, param2:MediaPlayerItem, param3:PSDKEventTargetInterface = null) : void;
      
      final public native function get item() : MediaPlayerItem;
   }
}

