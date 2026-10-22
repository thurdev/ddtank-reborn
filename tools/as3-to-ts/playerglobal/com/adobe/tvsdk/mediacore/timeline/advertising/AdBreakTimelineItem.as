package com.adobe.tvsdk.mediacore.timeline.advertising
{
   import com.adobe.tvsdk.mediacore.TimelineItem;
   
   [native(cls="PSDKAdBreakTimelineItemClass",instance="PSDKAdBreakTimelineItemObject",methods="auto",construct="native")]
   [API("712")]
   public class AdBreakTimelineItem extends TimelineItem
   {
      
      public function AdBreakTimelineItem()
      {
         super();
      }
      
      final public native function get adBreak() : AdBreak;
      
      final public native function get items() : Vector.<AdTimelineItem>;
      
      final public native function get placementType() : int;
   }
}

