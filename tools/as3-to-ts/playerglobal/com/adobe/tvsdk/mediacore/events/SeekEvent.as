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
   
   [native(cls="PSDKSeekEventClass",instance="PSDKSeekEventObject",methods="auto")]
   [API("712")]
   public class SeekEvent extends PSDKEvent
   {
      
      public static const SEEK_POSITION_ADJUSTED:int = 123;
      
      public static const SEEK_BEGIN:int = 124;
      
      public static const SEEK_END:int = 125;
      
      public function SeekEvent(type:int, desiredPosition:Number, actualPosition:Number, local:Boolean, target:PSDKEventTargetInterface = null)
      {
         super(type,target);
         this.ctor(type,desiredPosition,actualPosition,local,target);
      }
      
      private native function ctor(param1:int, param2:Number, param3:Number, param4:Boolean, param5:PSDKEventTargetInterface = null) : void;
      
      final public native function get desiredPosition() : Number;
      
      final public native function get actualPosition() : Number;
      
      final public native function get isLocal() : Boolean;
   }
}

