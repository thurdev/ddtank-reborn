package com.adobe.tvsdk.mediacore.qos
{
   [native(cls="PSDKLoadInformationClass",instance="PSDKLoadInformationObject",methods="auto")]
   [API("712")]
   public class LoadInformation
   {
      
      public function LoadInformation()
      {
         super();
      }
      
      final public native function get type() : int;
      
      final public native function get url() : String;
      
      final public native function get periodIndex() : int;
      
      final public native function get size() : int;
      
      final public native function get mediaDuration() : Number;
      
      final public native function get downloadDuration() : Number;
      
      final public native function get trackName() : String;
      
      final public native function get trackType() : String;
      
      final public native function get trackIndex() : int;
   }
}

