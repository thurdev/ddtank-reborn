package com.adobe.tvsdk.mediacore.view
{
   import flash.geom.*;
   
   [API("712")]
   public class MaintainAspectRatioScalePolicy implements MediaPlayerViewScalePolicy
   {
      
      public function MaintainAspectRatioScalePolicy()
      {
         super();
      }
      
      public static function adjustToCenter(parent:Rectangle, child:Rectangle) : Rectangle
      {
         var tempWidth:Number = child.width;
         var tempHeight:Number = child.height;
         child.left = parent.left + parent.width / 2 - tempWidth / 2;
         child.top = parent.top + parent.height / 2 - tempHeight / 2;
         child.width = tempWidth;
         child.height = tempHeight;
         return child;
      }
      
      public function adjust(viewPort:Rectangle, videoWidth:Number, videoHeight:Number) : Rectangle
      {
         var videoAspectRatio:Number = NaN;
         var tempRect:Rectangle = null;
         var tempHeight:Number = NaN;
         var tempWidth:Number = NaN;
         if(videoHeight > 0)
         {
            videoAspectRatio = videoWidth / videoHeight;
            tempRect = new Rectangle(viewPort.x,viewPort.y,viewPort.width,viewPort.height);
            tempHeight = tempRect.width / videoAspectRatio;
            if(tempHeight < viewPort.height)
            {
               tempRect.width = viewPort.width;
               tempRect.height = tempHeight;
               return adjustToCenter(viewPort,tempRect);
            }
            tempWidth = tempRect.height * videoAspectRatio;
            if(tempWidth < viewPort.width)
            {
               tempRect.width = tempWidth;
               tempRect.height = viewPort.height;
               return adjustToCenter(viewPort,tempRect);
            }
         }
         return viewPort;
      }
   }
}

