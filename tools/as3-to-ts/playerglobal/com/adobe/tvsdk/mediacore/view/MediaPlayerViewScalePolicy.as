package com.adobe.tvsdk.mediacore.view
{
   import flash.geom.Rectangle;
   
   [API("712")]
   public interface MediaPlayerViewScalePolicy
   {
      
      function adjust(param1:Rectangle, param2:Number, param3:Number) : Rectangle;
   }
}

