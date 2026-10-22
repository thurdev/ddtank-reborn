package com.adobe.tvsdk.mediacore
{
   import com.adobe.tvsdk.mediacore.timeline.advertising.Ad;
   
   [API("712")]
   public interface CustomAdHandler
   {
      
      function configure(param1:MediaPlayerItem, param2:CustomAdHandlerClient) : void;
      
      function initAd(param1:Ad) : void;
      
      function startAd(param1:Ad) : void;
      
      function pauseAd(param1:Ad) : void;
      
      function resumeAd(param1:Ad) : void;
      
      function stopAd(param1:Ad) : void;
      
      function dispose() : void;
   }
}

