package com.adobe.tvsdk.mediacore.timeline.resolvers
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
   import com.adobe.tvsdk.mediacore.utils.*;
   import com.adobe.tvsdk.mediacore.view.*;
   import flash.display.*;
   import flash.events.*;
   import flash.media.*;
   
   [native(cls="PSDKShimContentResolverClass",instance="PSDKShimContentResolverObject",methods="auto")]
   [API("712")]
   public class ShimContentResolver implements ContentResolver
   {
      
      public function ShimContentResolver(resolverType:int)
      {
         super();
         this.ctor(resolverType);
      }
      
      private native function ctor(param1:int) : void;
      
      final public native function configure(param1:MediaPlayerItem, param2:ContentResolverClient) : void;
      
      final public native function canResolve(param1:Opportunity) : Boolean;
      
      final public native function resolve(param1:Opportunity) : void;
      
      final public native function cleanup() : void;
   }
}

