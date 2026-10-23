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
   
   [native(cls="PSDKReplaceTimeRangeClass",instance="PSDKReplaceTimeRangeObject",methods="auto")]
   [API("712")]
   public class ReplaceTimeRange extends TimeRange
   {
      
      public function ReplaceTimeRange(begin:Number, duration:Number, replaceDuration:Number)
      {
         super(begin,duration);
         this.ctor(begin,duration,replaceDuration);
      }
      
      private native function ctor(param1:Number, param2:Number, param3:Number) : void;
      
      final public native function get replaceDuration() : Number;
   }
}

