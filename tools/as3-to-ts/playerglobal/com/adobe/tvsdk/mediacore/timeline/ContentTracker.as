package com.adobe.tvsdk.mediacore.timeline
{
   import com.adobe.tvsdk.mediacore.timeline.advertising.Ad;
   import com.adobe.tvsdk.mediacore.timeline.advertising.AdBreak;
   
   [API("712")]
   public interface ContentTracker
   {
      
      function onAdStart(param1:Ad) : void;
      
      function onAdComplete(param1:Ad) : void;
      
      function onAdProgress(param1:Ad, param2:Number) : void;
      
      function onAdClick(param1:Ad) : void;
      
      function onAdBreakStart(param1:AdBreak) : void;
      
      function onAdBreakComplete(param1:AdBreak) : void;
      
      function onAdError(param1:Ad) : void;
   }
}

