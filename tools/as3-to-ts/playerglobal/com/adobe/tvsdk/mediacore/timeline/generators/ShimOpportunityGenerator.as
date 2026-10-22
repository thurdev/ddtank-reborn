package com.adobe.tvsdk.mediacore.timeline.generators
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
   import com.adobe.tvsdk.mediacore.timeline.operations.*;
   import com.adobe.tvsdk.mediacore.timeline.resolvers.*;
   import com.adobe.tvsdk.mediacore.utils.*;
   import com.adobe.tvsdk.mediacore.view.*;
   import flash.display.*;
   import flash.events.*;
   import flash.media.*;
   
   [native(cls="PSDKShimOpportunityGeneratorClass",instance="PSDKShimOpportunityGeneratorObject",methods="auto")]
   [API("712")]
   public class ShimOpportunityGenerator implements OpportunityGenerator
   {
      
      public function ShimOpportunityGenerator(type:int)
      {
         super();
         this.ctor(type);
      }
      
      private native function ctor(param1:int) : void;
      
      final public native function configure(param1:MediaPlayerItem, param2:OpportunityGeneratorClient, param3:int, param4:Number, param5:TimeRange) : void;
      
      final public native function update(param1:Number, param2:TimeRange) : void;
      
      final public native function cleanup() : void;
   }
}

