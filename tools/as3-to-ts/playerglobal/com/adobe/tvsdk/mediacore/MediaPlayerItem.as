package com.adobe.tvsdk.mediacore
{
   import com.adobe.tvsdk.mediacore.info.AudioTrack;
   import com.adobe.tvsdk.mediacore.info.ClosedCaptionsTrack;
   import com.adobe.tvsdk.mediacore.info.DRMMetadataInfo;
   import com.adobe.tvsdk.mediacore.info.Profile;
   import com.adobe.tvsdk.mediacore.metadata.TimedMetadata;
   
   [native(cls="PSDKMediaPlayerItemClass",instance="PSDKMediaPlayerItemObject",methods="auto",construct="native")]
   [API("712")]
   public class MediaPlayerItem
   {
      
      public function MediaPlayerItem()
      {
         super();
      }
      
      final public native function selectAudioTrack(param1:AudioTrack) : void;
      
      final public native function selectClosedCaptionsTrack(param1:ClosedCaptionsTrack) : void;
      
      final public native function get resource() : MediaResource;
      
      final public native function get resourceId() : int;
      
      final public native function get isLive() : Boolean;
      
      final public native function get hasAlternateAudio() : Boolean;
      
      final public native function get audioTracks() : Vector.<AudioTrack>;
      
      final public native function get selectedAudioTrack() : AudioTrack;
      
      final public native function get hasClosedCaptions() : Boolean;
      
      final public native function get closedCaptionsTracks() : Vector.<ClosedCaptionsTrack>;
      
      final public native function get selectedClosedCaptionsTrack() : ClosedCaptionsTrack;
      
      final public native function get hasTimedMetadata() : Boolean;
      
      final public native function get timedMetadata() : Vector.<TimedMetadata>;
      
      final public native function get isDynamic() : Boolean;
      
      final public native function get isProtected() : Boolean;
      
      final public native function get drmMetadataInfos() : Vector.<DRMMetadataInfo>;
      
      final public native function get profiles() : Vector.<Profile>;
      
      final public native function get selectedProfile() : Profile;
      
      final public native function get isTrickPlaySupported() : Boolean;
      
      final public native function get availablePlaybackRates() : Vector.<Number>;
      
      final public native function get selectedPlaybackRate() : Number;
      
      final public native function get mediaPlayer() : MediaPlayer;
      
      final public native function get config() : MediaPlayerItemConfig;
   }
}

