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
   
   [native(cls="PSDKBillingMetricsConfigurationClass",instance="PSDKBillingMetricsConfigurationObject",methods="auto")]
   [API("712")]
   public class BillingMetricsConfiguration
   {
      
      public function BillingMetricsConfiguration()
      {
         super();
         this.ctor();
      }
      
      private native function ctor() : void;
      
      final public native function set enabled(param1:Boolean) : void;
      
      final public native function get isEnabled() : Boolean;
      
      final public native function get publisherId() : String;
      
      final public native function set publisherId(param1:String) : void;
      
      final public native function get reportSuiteId() : String;
      
      final public native function set reportSuiteId(param1:String) : void;
      
      final public native function get visitorId() : String;
      
      final public native function set visitorId(param1:String) : void;
      
      final public native function get trackingServer() : String;
      
      final public native function set trackingServer(param1:String) : void;
      
      final public native function get stdVODBillableDurationMinutes() : Number;
      
      final public native function set stdVODBillableDurationMinutes(param1:Number) : void;
      
      final public native function get proVODBillableDurationMinutes() : Number;
      
      final public native function set proVODBillableDurationMinutes(param1:Number) : void;
      
      final public native function get liveBillableDurationMinutes() : Number;
      
      final public native function set liveBillableDurationMinutes(param1:Number) : void;
   }
}

