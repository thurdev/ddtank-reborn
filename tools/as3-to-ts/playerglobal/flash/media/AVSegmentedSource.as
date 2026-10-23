package flash.media
{
   import flash.events.*;
   
   [API("688")]
   [native(cls="AVSegmentedSourceClass",instance="AVSegmentedSourceObject",methods="auto")]
   [Event(name="avstatus",type="flash.events.AVStatusEvent")]
   public class AVSegmentedSource extends AVSource
   {
      
      public static const HLS:String = "HLS";
      
      public static const DASH:String = "DASH";
      
      public static const AUDIO:String = "audio";
      
      public static const AUDIO_PID:String = "audiopid";
      
      public static const AUDIO_DESCRIPTION:String = "audiodescription";
      
      public static const AUDIO_LANGUAGE:String = "audiolanguage";
      
      public static const VIDEO:String = "video";
      
      public static const VIDEO_DESCRIPTION:String = "videodescription";
      
      public static const DATA:String = "data";
      
      public static const DATA_DESCRIPTION:String = "datadescription";
      
      public function AVSegmentedSource()
      {
         super();
         this.ctor();
      }
      
      private native function ctor() : void;
      
      public native function load(param1:String, param2:String = "HLS", param3:int = 0) : AVResult;
      
      public native function loadWithBackgroundManifest(param1:String, param2:String, param3:int, param4:String) : AVResult;
      
      public native function loadManifest(param1:String, param2:int = 0, param3:String = "HLS") : AVResult;
      
      public native function releaseManifest(param1:int) : AVResult;
      
      public native function setHoldAt(param1:Number) : AVResult;
      
      public native function insertByVirtualTime(param1:Number, param2:int, param3:int = 0, param4:Number = 0) : AVInsertionResult;
      
      public native function insertByLocalTime(param1:int, param2:Number, param3:int, param4:int = 0, param5:Number = 0) : AVInsertionResult;
      
      public native function removeByVirtualTime(param1:Number, param2:Number) : AVResult;
      
      public native function removeByLocalTime(param1:int, param2:Number, param3:Number, param4:Boolean) : AVResult;
      
      public native function removeByVirtualTimeWithReplacement(param1:Number, param2:Number, param3:Boolean) : AVResult;
      
      public native function getTimeline() : AVTimeline;
      
      public native function getBackgroundTimeline() : AVTimeline;
      
      public native function selectTrack(param1:int, param2:String, param3:int) : AVResult;
      
      public native function selectTrackString(param1:int, param2:String, param3:String) : AVResult;
      
      public native function getPeriodInfo(param1:int) : AVPeriodInfo;
      
      public native function getPeriodInfoWithTagsAcrossIndexes(param1:int, param2:int) : AVPeriodInfo;
      
      public native function getBackgroundPeriodInfo(param1:int) : AVPeriodInfo;
      
      public native function getTrackCount(param1:int, param2:String) : int;
      
      public native function getTrackInfo(param1:int, param2:String, param3:int) : AVTrackInfo;
      
      public native function setABRParameters(param1:AVABRParameters) : AVResult;
      
      public native function getABRProfileCount(param1:int) : int;
      
      public native function getABRProfileInfoAtIndex(param1:int, param2:int) : AVABRProfileInfo;
      
      public native function getCuePoint(param1:int, param2:int) : AVCuePoint;
      
      public native function setCuePointTags(param1:Array) : AVResult;
      
      public native function getSubscribedTag(param1:int, param2:int) : AVTagData;
      
      public native function getSubscribedTagForBackgroundManifest(param1:int, param2:int) : AVTagData;
      
      public native function getTimelineSubscribedTag(param1:int) : AVTagData;
      
      public native function getTimelineSubscribedTagForBackgroundManifest(param1:int) : AVTagData;
      
      public native function setSubscribedTags(param1:Array) : AVResult;
      
      public native function setSubscribedTagsForBackgroundManifest(param1:Array) : AVResult;
      
      public native function setBandwidth(param1:int) : AVResult;
      
      public native function getPerceivedBandwidth() : uint;
      
      public native function getMediaPreferredStartTime() : Number;
      
      public native function setPauseAtPeriodEnd(param1:int, param2:int = 0) : AVResult;
      
      public native function clearPauseAtPeriodEnd(param1:int) : AVResult;
      
      [API("692")]
      public native function set useRedirectedUrl(param1:Boolean) : void;
      
      public native function set networkingParams(param1:AVNetworkingParams) : void;
      
      public native function get networkingParams() : AVNetworkingParams;
      
      public native function set cookieHeader(param1:String) : void;
      
      public native function set masterUpdateInterval(param1:int) : void;
      
      public native function addCustomHeader(param1:String, param2:Vector.<String>) : void;
   }
}

