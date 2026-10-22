package com.adobe.tvsdk.mediacore.timeline
{
   import com.adobe.tvsdk.mediacore.timeline.advertising.AdTimelineItem;
   
   [native(cls="PSDKTimelineClass",instance="PSDKTimelineObject",methods="auto",construct="native")]
   [API("712")]
   public class Timeline
   {
      
      public function Timeline()
      {
         super();
      }
      
      final public native function convertToLocalTime(param1:Number) : Number;
      
      final public native function convertToVirtualTime(param1:Number) : Number;
      
      final public native function checkIfPositionIsReserved(param1:Number) : Boolean;
      
      final public native function get timelineMarkers() : Vector.<TimelineMarker>;
      
      final public native function get timelineItems() : Vector.<AdTimelineItem>;
   }
}

