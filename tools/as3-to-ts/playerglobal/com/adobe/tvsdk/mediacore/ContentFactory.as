package com.adobe.tvsdk.mediacore
{
   import com.adobe.tvsdk.mediacore.timeline.advertising.policy.AdPolicySelector;
   import com.adobe.tvsdk.mediacore.timeline.generators.OpportunityGenerator;
   import com.adobe.tvsdk.mediacore.timeline.resolvers.ContentResolver;
   
   [API("712")]
   public interface ContentFactory
   {
      
      function retrieveResolvers(param1:MediaPlayerItem) : Vector.<ContentResolver>;
      
      function retrieveOpportunityGenerators(param1:MediaPlayerItem) : Vector.<OpportunityGenerator>;
      
      function retrieveAdPolicySelector(param1:MediaPlayerItem) : AdPolicySelector;
      
      function retrieveCustomAdPlaybackHandlers(param1:MediaPlayerItem) : Vector.<CustomAdHandler>;
   }
}

