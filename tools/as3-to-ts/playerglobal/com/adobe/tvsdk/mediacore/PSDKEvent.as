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
   
   [native(cls="PSDKPSDKEventClass",instance="PSDKPSDKEventObject",methods="auto")]
   [API("712")]
   public class PSDKEvent
   {
      
      public function PSDKEvent(type:uint, target:PSDKEventTargetInterface)
      {
         super();
         this.ctor(type,target);
      }
      
      private native function ctor(param1:uint, param2:PSDKEventTargetInterface) : void;
      
      final public native function get type() : int;
      
      final public native function get target() : PSDKEventTargetInterface;
      
      final public native function get postedTime() : Number;
   }
}

