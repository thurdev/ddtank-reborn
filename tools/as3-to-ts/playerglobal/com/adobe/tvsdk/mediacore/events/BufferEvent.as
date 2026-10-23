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
   
   [native(cls="PSDKBufferEventClass",instance="PSDKBufferEventObject",methods="auto")]
   [API("712")]
   public class BufferEvent extends PSDKEvent
   {
      
      public static const BUFFERING_BEGIN:int = 108;
      
      public static const BUFFERING_END:int = 109;
      
      public function BufferEvent(type:int, target:PSDKEventTargetInterface = null)
      {
         super(type,target);
         this.ctor(type,target);
      }
      
      private native function ctor(param1:int, param2:PSDKEventTargetInterface = null) : void;
   }
}

