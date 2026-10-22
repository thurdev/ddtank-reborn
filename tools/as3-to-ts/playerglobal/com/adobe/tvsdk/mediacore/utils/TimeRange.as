package com.adobe.tvsdk.mediacore.utils
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
   import com.adobe.tvsdk.mediacore.view.*;
   import flash.display.*;
   import flash.events.*;
   import flash.media.*;
   
   [native(cls="PSDKTimeRangeClass",instance="PSDKTimeRangeObject",methods="auto")]
   [API("712")]
   public class TimeRange
   {
      
      public function TimeRange(begin:Number, duration:Number)
      {
         super();
         this.ctor(begin,duration);
      }
      
      final public native function contains(param1:Number) : Boolean;
      
      final public native function intersects(param1:TimeRange) : Boolean;
      
      final public native function expandTimeRange(param1:TimeRange) : void;
      
      final public native function compareTo(param1:TimeRange) : int;
      
      private native function ctor(param1:Number, param2:Number) : void;
      
      final public native function get begin() : Number;
      
      final public native function get end() : Number;
      
      final public native function get duration() : Number;
      
      final public native function get isValid() : Boolean;
   }
}

