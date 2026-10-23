package com.adobe.tvsdk.mediacore.qos
{
   import com.adobe.tvsdk.mediacore.*;
   import com.adobe.tvsdk.mediacore.info.*;
   import com.adobe.tvsdk.mediacore.metadata.*;
   import com.adobe.tvsdk.mediacore.notifications.*;
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
   
   [native(cls="PSDKQOSProviderClass",instance="PSDKQOSProviderObject",methods="auto")]
   [API("712")]
   public class QOSProvider
   {
      
      public function QOSProvider()
      {
         super();
         this.ctor();
      }
      
      private native function ctor() : void;
      
      final public native function attachMediaPlayer(param1:MediaPlayer) : void;
      
      final public native function detachMediaPlayer() : void;
      
      final public native function attachMediaPlayerItemLoader(param1:MediaPlayerItemLoader) : void;
      
      final public native function detachMediaPlayerItemLoader() : void;
      
      final public native function get deviceInformation() : DeviceInformation;
      
      final public native function get playbackInformation() : PlaybackInformation;
   }
}

