package com.adobe.tvsdk.mediacore.timeline.advertising.policy
{
   import com.adobe.tvsdk.mediacore.timeline.advertising.AdBreakTimelineItem;
   import com.adobe.tvsdk.mediacore.timeline.advertising.AdTimelineItem;
   
   [native(cls="PSDKAdPolicyInfoClass",instance="PSDKAdPolicyInfoObject",methods="auto")]
   [API("712")]
   public class AdPolicyInfo
   {
      
      public function AdPolicyInfo()
      {
         super();
      }
      
      final public native function get adBreakTimelineItems() : Vector.<AdBreakTimelineItem>;
      
      final public native function get adTimelineItem() : AdTimelineItem;
      
      final public native function get currentTime() : Number;
      
      final public native function get seekToTime() : Number;
      
      final public native function get rate() : Number;
      
      final public native function get mode() : int;
   }
}

