package com.adobe.tvsdk.mediacore.utils
{
   [API("712")]
   public class PSDKError extends Error
   {
      
      private var err:int;
      
      public function PSDKError(inErr:int)
      {
         super("PSDK Error Number " + inErr);
         this.err = inErr;
      }
      
      public function get code() : int
      {
         return this.err;
      }
   }
}

