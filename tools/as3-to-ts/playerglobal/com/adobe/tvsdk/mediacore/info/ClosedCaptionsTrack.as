package com.adobe.tvsdk.mediacore.info
{
   import com.adobe.tvsdk.mediacore.*;
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
   
   [native(cls="PSDKClosedCaptionsTrackClass",instance="PSDKClosedCaptionsTrackObject",methods="auto")]
   [API("712")]
   public class ClosedCaptionsTrack extends Track
   {
      
      public static const SERVICE_608_CAPTIONS:int = 0;
      
      public static const SERVICE_708_CAPTIONS:int = 1;
      
      public static const SERVICE_WEB_VTT_CAPTIONS:int = 2;
      
      public function ClosedCaptionsTrack(name:String, language:String, isDefault:Boolean, isAutoSelect:Boolean, serviceType:int, isForced:Boolean)
      {
         super(name,language,isDefault,isAutoSelect);
         this.ctor(name,language,isDefault,isAutoSelect,serviceType,isForced);
      }
      
      final public native function equals(param1:ClosedCaptionsTrack) : Boolean;
      
      private native function ctor(param1:String, param2:String, param3:Boolean, param4:Boolean, param5:int, param6:Boolean) : void;
      
      final public native function get serviceType() : int;
      
      final public native function get isForced() : Boolean;
      
      final public native function get isValid() : Boolean;
   }
}

