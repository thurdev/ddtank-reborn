package com.adobe.tvsdk.mediacore
{
   [native(cls="PSDKVersionClass",instance="PSDKVersionObject",methods="auto",construct="native")]
   [API("712")]
   public final class Version
   {
      
      public function Version()
      {
         super();
      }
      
      public static native function get version() : String;
      
      public static native function get description() : String;
      
      public static native function get major() : uint;
      
      public static native function get minor() : uint;
      
      public static native function get revision() : uint;
      
      public static native function get revisionMinor() : uint;
      
      public static native function get apiVersion() : uint;
   }
}

