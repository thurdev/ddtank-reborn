package com.adobe.tvsdk.mediacore.timeline.advertising.policy
{
   import com.adobe.tvsdk.mediacore.timeline.advertising.AdBreakTimelineItem;
   
   [API("712")]
   public interface AdPolicySelector
   {
      
      function selectPolicyForAdBreak(param1:AdPolicyInfo) : int;
      
      function selectAdBreaksToPlay(param1:AdPolicyInfo) : Vector.<AdBreakTimelineItem>;
      
      function selectPolicyForSeekIntoAd(param1:AdPolicyInfo) : int;
      
      function selectWatchedPolicyForAdBreak(param1:AdPolicyInfo) : int;
   }
}

