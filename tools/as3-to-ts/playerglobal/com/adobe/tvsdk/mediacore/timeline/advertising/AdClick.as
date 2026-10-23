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
   
   [native(cls="PSDKAdClickClass",instance="PSDKAdClickObject",methods="auto")]
   [API("712")]
   public class AdClick
   {
      
      public function AdClick(id:String, title:String, url:String)
      {
         super();
         this.ctor(id,title,url);
      }
      
      private native function ctor(param1:String, param2:String, param3:String) : void;
      
      final public native function get isValid() : Boolean;
      
      final public native function get id() : String;
      
      final public native function get title() : String;
      
      final public native function get url() : String;
   }
}

