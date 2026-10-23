package com.adobe.tvsdk.mediacore
{
   [API("712")]
   public final class MediaPlayerStatus
   {
      
      public static const IDLE:int = 0;
      
      public static const INITIALIZING:int = 1;
      
      public static const INITIALIZED:int = 2;
      
      public static const PREPARING:int = 3;
      
      public static const PREPARED:int = 4;
      
      public static const PLAYING:int = 5;
      
      public static const PAUSED:int = 6;
      
      public static const SEEKING:int = 7;
      
      public static const COMPLETED:int = 8;
      
      public static const ERROR:int = 9;
      
      public static const RELEASED:int = 10;
      
      public static const SUSPENDED:int = 11;
      
      public function MediaPlayerStatus()
      {
         super();
      }
   }
}

