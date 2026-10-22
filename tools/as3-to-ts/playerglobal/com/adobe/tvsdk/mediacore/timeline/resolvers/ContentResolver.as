package com.adobe.tvsdk.mediacore.timeline.resolvers
{
   import com.adobe.tvsdk.mediacore.MediaPlayerItem;
   import com.adobe.tvsdk.mediacore.timeline.Opportunity;
   
   [API("712")]
   public interface ContentResolver
   {
      
      function configure(param1:MediaPlayerItem, param2:ContentResolverClient) : void;
      
      function canResolve(param1:Opportunity) : Boolean;
      
      function resolve(param1:Opportunity) : void;
      
      function cleanup() : void;
   }
}

