package com.adobe.tvsdk.mediacore
{
   import com.adobe.tvsdk.mediacore.metadata.Metadata;
   
   [API("712")]
   public interface ItemLoaderListener
   {
      
      function onError(param1:int, param2:Metadata) : void;
      
      function onLoadComplete(param1:MediaPlayerItem) : void;
      
      function onBufferPrepared() : void;
   }
}

