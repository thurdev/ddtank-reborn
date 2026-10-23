package com.adobe.tvsdk.mediacore
{
   [API("712")]
   public final class PSDKErrorCode
   {
      
      public static const SUCCESS:int = 0;
      
      public static const INVALID_ARGUMENT:int = 1;
      
      public static const NULL_POINTER:int = 2;
      
      public static const ILLEGAL_STATE:int = 3;
      
      public static const INTERFACE_NOT_FOUND:int = 4;
      
      public static const CREATION_FAILED:int = 5;
      
      public static const UNSUPPORTED_OPERATION:int = 6;
      
      public static const DATA_NOT_AVAILABLE:int = 7;
      
      public static const SEEK_ERROR:int = 8;
      
      public static const UNSUPPORTED_FEATURE:int = 9;
      
      public static const RANGE_ERROR:int = 10;
      
      public static const CODEC_NOT_SUPPORTED:int = 11;
      
      public static const MEDIA_ERROR:int = 12;
      
      public static const NETWORK_ERROR:int = 13;
      
      public static const GENERIC_ERROR:int = 14;
      
      public static const INVALID_SEEK_TIME:int = 15;
      
      public static const AUDIO_TRACK_ERROR:int = 16;
      
      public static const ACCESS_FROM_DIFFERENT_THREAD_ERROR:int = 17;
      
      public static const ELEMENT_NOT_FOUND:int = 18;
      
      public static const NOT_IMPLEMENTED:int = 19;
      
      public static const PRE_ROLL_DISABLED:int = 20;
      
      public static const PLAYBACK_NOT_AUTHORIZED:int = 57;
      
      public static const PLAYBACK_OPERATION_FAILED:int = 200;
      
      public static const NATIVE_WARNING:int = 201;
      
      public static const AD_RESOLVER_FAILED:int = 202;
      
      public static const AD_MANIFEST_LOAD_FAILED:int = 203;
      
      public static const kECLazyAdResolutionInProgress:int = 204;
      
      public function PSDKErrorCode()
      {
         super();
      }
   }
}

