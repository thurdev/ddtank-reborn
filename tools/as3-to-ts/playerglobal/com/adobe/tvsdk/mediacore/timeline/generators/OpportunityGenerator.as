package com.adobe.tvsdk.mediacore.timeline.generators
{
   import com.adobe.tvsdk.mediacore.MediaPlayerItem;
   import com.adobe.tvsdk.mediacore.utils.TimeRange;
   
   [API("712")]
   public interface OpportunityGenerator
   {
      
      function configure(param1:MediaPlayerItem, param2:OpportunityGeneratorClient, param3:int, param4:Number, param5:TimeRange) : void;
      
      function update(param1:Number, param2:TimeRange) : void;
      
      function cleanup() : void;
   }
}

