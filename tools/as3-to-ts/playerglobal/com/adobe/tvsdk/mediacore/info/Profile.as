package com.adobe.tvsdk.mediacore.info
{
   [native(cls="PSDKProfileClass",instance="PSDKProfileObject",methods="auto")]
   [API("712")]
   public class Profile
   {
      
      public function Profile()
      {
         super();
      }
      
      final public native function isEqual(param1:Profile) : Boolean;
      
      final public native function notEqual(param1:Profile) : Boolean;
      
      final public native function get bitRate() : uint;
      
      final public native function get width() : uint;
      
      final public native function get height() : uint;
      
      final public native function get isAudioOnly() : Boolean;
      
      final public native function get isIFrame() : Boolean;
      
      final public native function get codecs() : String;
      
      final public native function get isValid() : Boolean;
   }
}

