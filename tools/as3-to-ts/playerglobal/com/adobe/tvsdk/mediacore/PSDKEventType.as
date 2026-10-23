package com.adobe.tvsdk.mediacore
{
   [API("712")]
   public final class PSDKEventType
   {
      
      public static const FIRST_EVENT:int = 100;
      
      public static const AD_BREAK_STARTED:int = 101;
      
      public static const AD_BREAK_COMPLETED:int = 102;
      
      public static const AD_BREAK_SKIPPED:int = 103;
      
      public static const AD_CLICK:int = 104;
      
      public static const AD_STARTED:int = 105;
      
      public static const AD_PROGRESS:int = 106;
      
      public static const AD_COMPLETED:int = 107;
      
      public static const BUFFERING_BEGIN:int = 108;
      
      public static const BUFFERING_END:int = 109;
      
      public static const DRM_METADATA_INFO_AVAILABLE:int = 110;
      
      public static const LOAD_INFORMATION_AVAILABLE:int = 111;
      
      public static const ITEM_CREATED:int = 112;
      
      public static const ITEM_UPDATED:int = 113;
      
      public static const CAPTIONS_UPDATED:int = 114;
      
      public static const AUDIO_UPDATED:int = 115;
      
      public static const PLAYBACK_RANGE_UPDATED:int = 116;
      
      public static const MASTER_UPDATED:int = 117;
      
      public static const STATUS_CHANGED:int = 118;
      
      public static const RATE_SELECTED:int = 119;
      
      public static const RATE_PLAYING:int = 120;
      
      public static const PROFILE_CHANGED:int = 121;
      
      public static const RESERVATION_REACHED:int = 122;
      
      public static const SEEK_POSITION_ADJUSTED:int = 123;
      
      public static const SEEK_BEGIN:int = 124;
      
      public static const SEEK_END:int = 125;
      
      public static const SIZE_AVAILABLE:int = 126;
      
      public static const TIME_CHANGED:int = 127;
      
      public static const TIMED_METADATA_AVAILABLE:int = 128;
      
      public static const TIMELINE_UPDATED:int = 129;
      
      public static const PLAY_START:int = 130;
      
      public static const OPERATION_FAILED:int = 131;
      
      public static const TIMED_METADATA_IN_BACKGROUND:int = 132;
      
      public static const TIMED_EVENT:int = 133;
      
      public static const BUFFER_PREPARED:int = 134;
      
      public static const AD_RESOLUTION_COMPLETE:int = 135;
      
      public static const LAST_EVENT:int = 135;
      
      public static const FIRST_USER_EVENT:int = 10000;
      
      public function PSDKEventType()
      {
         super();
      }
   }
}

