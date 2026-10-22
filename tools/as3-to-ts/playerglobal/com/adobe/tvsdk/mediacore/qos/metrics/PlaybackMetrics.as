package com.adobe.tvsdk.mediacore.qos.metrics
{
   import com.adobe.tvsdk.mediacore.utils.TimeRange;
   
   [native(cls="PSDKPlaybackMetricsClass",instance="PSDKPlaybackMetricsObject",methods="auto",construct="native")]
   [API("712")]
   public class PlaybackMetrics
   {
      
      public function PlaybackMetrics()
      {
         super();
      }
      
      final public native function update() : void;
      
      final public native function reset() : void;
      
      final public native function get time() : Number;
      
      final public native function get playbackRange() : TimeRange;
      
      final public native function get bufferedRange() : TimeRange;
      
      final public native function get seekableRange() : TimeRange;
      
      final public native function get frontBufferedRange() : TimeRange;
      
      final public native function get backBufferedRange() : TimeRange;
      
      final public native function get frameRate() : Number;
      
      final public native function get playbackRate() : Number;
      
      final public native function get droppedFramesCount() : int;
      
      final public native function get perceivedBandwidth() : int;
      
      final public native function get bitRate() : int;
      
      final public native function get bufferTime() : Number;
      
      final public native function get bufferLength() : Number;
      
      final public native function get readHead() : Number;
   }
}

