package com.adobe.tvsdk.mediacore.timeline.advertising
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
   import com.adobe.tvsdk.mediacore.timeline.advertising.policy.*;
   import com.adobe.tvsdk.mediacore.timeline.generators.*;
   import com.adobe.tvsdk.mediacore.timeline.operations.*;
   import com.adobe.tvsdk.mediacore.timeline.resolvers.*;
   import com.adobe.tvsdk.mediacore.utils.*;
   import com.adobe.tvsdk.mediacore.view.*;
   import flash.display.*;
   import flash.events.*;
   import flash.media.*;
   
   [native(cls="PSDKAdBreakClass",instance="PSDKAdBreakObject",methods="auto")]
   [API("712")]
   public class AdBreak
   {
      
      public function AdBreak(adsArray:Vector.<Ad>, tracker:ContentTracker)
      {
         super();
         this.ctor(adsArray,tracker);
      }
      
      private native function ctor(param1:Vector.<Ad>, param2:ContentTracker) : void;
      
      final public native function get duration() : Number;
      
      final public native function get ads() : Vector.<Ad>;
      
      final public native function get tracker() : ContentTracker;
      
      final public native function get insertionType() : int;
   }
}

