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
   
   [native(cls="PSDKShimContentTrackerClass",instance="PSDKShimContentTrackerObject",methods="auto",construct="native")]
   [API("712")]
   public class ShimContentTracker implements ContentTracker
   {
      
      public function ShimContentTracker()
      {
         super();
      }
      
      final public native function onAdStart(param1:Ad) : void;
      
      final public native function onAdComplete(param1:Ad) : void;
      
      final public native function onAdProgress(param1:Ad, param2:Number) : void;
      
      final public native function onAdClick(param1:Ad) : void;
      
      final public native function onAdBreakStart(param1:AdBreak) : void;
      
      final public native function onAdBreakComplete(param1:AdBreak) : void;
      
      final public native function onAdError(param1:Ad) : void;
   }
}

