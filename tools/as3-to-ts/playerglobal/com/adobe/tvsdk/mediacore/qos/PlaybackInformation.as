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
   
   [native(cls="PSDKPlaybackInformationClass",instance="PSDKPlaybackInformationObject",methods="auto")]
   [API("712")]
   public class PlaybackInformation
   {
      
      public function PlaybackInformation(timeToFirstByte:Number, timeToLoad:Number, timeToPrepare:Number, timeToStart:Number, timeToFail:Number, secondsPlayed:int, secondsSpent:int, frameRate:Number, droppedFrameCount:int, perceivedBandwidth:int, bitRate:int, bufferTime:Number, bufferLength:int, emptyBufferCount:int, bufferingTime:Number)
      {
         super();
         this.ctor(timeToFirstByte,timeToLoad,timeToPrepare,timeToStart,timeToFail,secondsPlayed,secondsSpent,frameRate,droppedFrameCount,perceivedBandwidth,bitRate,bufferTime,bufferLength,emptyBufferCount,bufferingTime);
      }
      
      private native function ctor(param1:Number, param2:Number, param3:Number, param4:Number, param5:Number, param6:int, param7:int, param8:Number, param9:int, param10:int, param11:int, param12:Number, param13:int, param14:int, param15:Number) : void;
      
      final public native function get timeToFirstByte() : Number;
      
      final public native function get timeToLoad() : Number;
      
      final public native function get timeToPrepare() : Number;
      
      final public native function get timeToStart() : Number;
      
      final public native function get timeToFail() : Number;
      
      final public native function get totalSecondsPlayed() : int;
      
      final public native function get totalSecondsSpent() : int;
      
      final public native function get frameRate() : Number;
      
      final public native function get droppedFrameCount() : int;
      
      final public native function get perceivedBandwidth() : int;
      
      final public native function get bitRate() : int;
      
      final public native function get bufferTime() : Number;
      
      final public native function get bufferLength() : int;
      
      final public native function get emptyBufferCount() : int;
      
      final public native function get bufferingTime() : Number;
   }
}

