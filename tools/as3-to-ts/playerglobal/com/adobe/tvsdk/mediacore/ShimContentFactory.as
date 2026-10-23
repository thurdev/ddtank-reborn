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
   
   [native(cls="PSDKShimContentFactoryClass",instance="PSDKShimContentFactoryObject",methods="auto")]
   [API("712")]
   public class ShimContentFactory implements ContentFactory
   {
      
      public function ShimContentFactory()
      {
         super();
         this.ctor();
      }
      
      private native function ctor() : void;
      
      final public native function retrieveResolvers(param1:MediaPlayerItem) : Vector.<ContentResolver>;
      
      final public native function retrieveOpportunityGenerators(param1:MediaPlayerItem) : Vector.<OpportunityGenerator>;
      
      final public native function retrieveAdPolicySelector(param1:MediaPlayerItem) : AdPolicySelector;
      
      final public native function retrieveCustomAdPlaybackHandlers(param1:MediaPlayerItem) : Vector.<CustomAdHandler>;
   }
}

