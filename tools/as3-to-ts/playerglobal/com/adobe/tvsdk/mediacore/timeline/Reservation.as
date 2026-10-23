package com.adobe.tvsdk.mediacore.timeline
{
   import com.adobe.tvsdk.mediacore.utils.TimeRange;
   
   [native(cls="PSDKReservationClass",instance="PSDKReservationObject",methods="auto")]
   [API("712")]
   public class Reservation
   {
      
      public function Reservation()
      {
         super();
      }
      
      final public native function get range() : TimeRange;
      
      final public native function get hold() : Number;
   }
}

