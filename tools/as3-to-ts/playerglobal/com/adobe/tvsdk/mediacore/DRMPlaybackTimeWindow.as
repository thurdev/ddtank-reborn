package com.adobe.tvsdk.mediacore
{
   [native(cls="PSDKDRMPlaybackTimeWindowClass",instance="PSDKDRMPlaybackTimeWindowObject",methods="auto")]
   [API("712")]
   public class DRMPlaybackTimeWindow
   {
      
      public function DRMPlaybackTimeWindow()
      {
         super();
      }
      
      final public native function get playbackPeriodInSeconds() : int;
      
      final public native function get playbackStartDate() : Date;
      
      final public native function get playbackEndDate() : Date;
   }
}

