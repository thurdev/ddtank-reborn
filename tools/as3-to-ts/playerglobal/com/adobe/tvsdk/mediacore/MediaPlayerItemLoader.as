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
   
   [native(cls="PSDKMediaPlayerItemLoaderClass",instance="PSDKMediaPlayerItemLoaderObject",methods="auto")]
   [API("712")]
   public class MediaPlayerItemLoader extends PSDKEventTargetInterface
   {
      
      public static const LIVE_POINT:Number = -2;
      
      public function MediaPlayerItemLoader(dispatcher:PSDKEventDispatcher)
      {
         super();
         this.ctor(dispatcher);
      }
      
      private native function ctor(param1:PSDKEventDispatcher) : void;
      
      public function addEventListener(t:int, l:Function) : Object
      {
         return eventDispatcher.addEventListener(t,l);
      }
      
      public function removeEventListener(t:int, l:Function) : void
      {
         eventDispatcher.removeEventListener(t,l);
      }
      
      public function dispatchEvent(e:PSDKEvent) : void
      {
         eventDispatcher.dispatchEvent(e);
      }
      
      final public native function load(param1:MediaResource, param2:int, param3:ItemLoaderListener = null, param4:MediaPlayerItemConfig = null) : void;
      
      final public native function cancel() : void;
      
      final public native function prepareBuffer(param1:Number = -2) : void;
      
      final public native function get currentItem() : MediaPlayerItem;
      
      final public native function get bufferControlParameters() : BufferControlParameters;
      
      final public native function set bufferControlParameters(param1:BufferControlParameters) : void;
      
      final public native function get abrControlParameters() : ABRControlParameters;
      
      final public native function set abrControlParameters(param1:ABRControlParameters) : void;
      
      final public native function get keepRebufferingForLive() : Boolean;
      
      final public native function set keepRebufferingForLive(param1:Boolean) : void;
      
      final public native function get drmManager() : DRMManager;
   }
}

