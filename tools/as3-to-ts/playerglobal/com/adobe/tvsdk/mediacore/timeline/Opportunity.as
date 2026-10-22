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
   
   [native(cls="PSDKOpportunityClass",instance="PSDKOpportunityObject",methods="auto")]
   [API("712")]
   public class Opportunity
   {
      
      public function Opportunity(id:String, placement:Placement, settings:Metadata, customParams:Metadata)
      {
         super();
         this.ctor(id,placement,settings,customParams);
      }
      
      private native function ctor(param1:String, param2:Placement, param3:Metadata, param4:Metadata) : void;
      
      final public native function get id() : String;
      
      final public native function get placement() : Placement;
      
      final public native function get settings() : Metadata;
      
      final public native function get customParameters() : Metadata;
   }
}

