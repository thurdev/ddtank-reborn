package com.adobe.tvsdk.mediacore.timeline
{
   import com.adobe.tvsdk.mediacore.*;
   import com.adobe.tvsdk.mediacore.info.*;
   import com.adobe.tvsdk.mediacore.metadata.*;
   import com.adobe.tvsdk.mediacore.notifications.*;
   import com.adobe.tvsdk.mediacore.qos.*;
   import com.adobe.tvsdk.mediacore.qos.metrics.*;
   import com.adobe.tvsdk.mediacore.system.*;
   import com.adobe.tvsdk.mediacore.systems.decoders.*;
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
   
   [native(cls="PSDKPlacementClass",instance="PSDKPlacementObject",methods="auto")]
   [API("712")]
   public class Placement
   {
      
      public static const UNKNOWN_DURATION:Number = -1;
      
      public static const UNKNOWN_POSITION:Number = -1;
      
      public function Placement(type:int = 0, time:Number = -1, duration:Number = -1, mode:int = 0)
      {
         super();
         this.ctor(type,time,duration,mode);
      }
      
      private native function ctor(param1:int = 0, param2:Number = -1, param3:Number = -1, param4:int = 0) : void;
      
      final public native function compareTo(param1:Placement) : int;
      
      final public native function get isValid() : Boolean;
      
      final public native function get type() : int;
      
      final public native function get time() : Number;
      
      final public native function get duration() : Number;
      
      final public native function get mode() : int;
      
      final public native function get range() : TimeRange;
   }
}

