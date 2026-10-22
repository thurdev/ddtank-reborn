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
   
   [native(cls="PSDKMediaPlayerClass",instance="PSDKMediaPlayerObject",methods="auto")]
   [API("712")]
   public class MediaPlayer extends PSDKEventTargetInterface
   {
      
      public static const INVALID_TIME:Number = -1;
      
      public static const LIVE_POINT:Number = -2;
      
      public static const VISIBLE:int = 0;
      
      public static const INVISIBLE:int = 1;
      
      private var _context:MediaPlayerContext;
      
      public function MediaPlayer(dispatcher:PSDKEventDispatcher)
      {
         super();
         this.ctor(dispatcher);
      }
      
      private native function ctor(param1:PSDKEventDispatcher) : void;
      
      public function get context() : MediaPlayerContext
      {
         return this._context;
      }
      
      public function set context(context:MediaPlayerContext) : void
      {
         this._context = context;
         if(this._context != null)
         {
            this._context.authorizedFeatures.enableMediaPlayerHLSPlayback(this);
         }
      }
      
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
      
      final public native function prepareToPlay(param1:Number = -2) : void;
      
      final public native function prepareBuffer() : void;
      
      final public native function play() : void;
      
      final public native function pause() : void;
      
      final public native function seek(param1:Number) : void;
      
      final public native function seekToLocal(param1:Number) : void;
      
      final public native function reset() : void;
      
      final public native function release() : void;
      
      final public native function replaceCurrentResource(param1:MediaResource, param2:MediaPlayerItemConfig = null) : void;
      
      final public native function registerCurrentItemInBackground(param1:MediaPlayerItemConfig) : void;
      
      final public native function unregisterCurrentBackgroundItem() : void;
      
      final public native function replaceCurrentItem(param1:MediaPlayerItem) : void;
      
      final public native function suspend() : void;
      
      final public native function restore() : void;
      
      final public native function notifyClick() : void;
      
      final public native function get playbackRange() : TimeRange;
      
      final public native function get seekableRange() : TimeRange;
      
      final public native function get currentTime() : Number;
      
      final public native function get localTime() : Number;
      
      final public native function get bufferedRange() : TimeRange;
      
      final public native function get timeline() : Timeline;
      
      final public native function get view() : MediaPlayerView;
      
      final public native function set view(param1:MediaPlayerView) : void;
      
      final public native function get drmManager() : DRMManager;
      
      final public native function get currentItem() : MediaPlayerItem;
      
      final public native function get status() : int;
      
      final public native function get volume() : Number;
      
      final public native function set volume(param1:Number) : void;
      
      final public native function get abrControlParameters() : ABRControlParameters;
      
      final public native function set abrControlParameters(param1:ABRControlParameters) : void;
      
      final public native function get bufferControlParameters() : BufferControlParameters;
      
      final public native function set bufferControlParameters(param1:BufferControlParameters) : void;
      
      final public native function get ccVisibility() : int;
      
      final public native function set ccVisibility(param1:int) : void;
      
      final public native function get ccStyle() : TextFormat;
      
      final public native function set ccStyle(param1:TextFormat) : void;
      
      final public native function get playbackMetrics() : PlaybackMetrics;
      
      final public native function get rate() : Number;
      
      final public native function set rate(param1:Number) : void;
      
      final public native function get currentTimeUpdateInterval() : Number;
      
      final public native function set currentTimeUpdateInterval(param1:Number) : void;
   }
}

