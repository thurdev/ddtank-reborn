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
   
   [native(cls="PSDKTrackClass",instance="PSDKTrackObject",methods="auto")]
   [API("712")]
   public class Track
   {
      
      public function Track(name:String, language:String, isDefault:Boolean, autoSelect:Boolean)
      {
         super();
         this.ctor(name,language,isDefault,autoSelect);
      }
      
      private native function ctor(param1:String, param2:String, param3:Boolean, param4:Boolean) : void;
      
      final public native function get name() : String;
      
      final public native function get language() : String;
      
      final public native function get isDefault() : Boolean;
      
      final public native function get isAutoSelect() : Boolean;
   }
}

